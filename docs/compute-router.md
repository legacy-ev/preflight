# Compute router: Phase 1 contract and proposed Phase 2 API

Phase 1 implements read-only static discovery. The interfaces below for routing
and provisioning are a **proposal**, not implemented endpoints or provider
capability claims. No real provisioning has occurred.

## Published Phase 1 discovery

`GET /preflight/api/v1/compute.json` returns the existing scanner envelope
`{response,signature}`; Ed25519 signs canonical response JSON, with the existing
kid and 24-hour generated_at/expires_at. A missing local signing seed produces
`signature:null`; daily CI refuses missing/mismatched signing material. Verify
against the project's published JWKS and reject altered, expired or future-dated
snapshots. Signing is provenance, not provider approval or price validity.

`response.rows` contains items `{value,source,checked_at,ttl_seconds}`.
`value` is `{provider,gpu_type,gpu_count,vram_gb,usd_per_hour,pricing_type,region,
free_tier,api_docs_url,source_url,checked_at,ttl}`. `ttl` is seconds and equals the
item's `ttl_seconds`; duplicated timestamps must agree. GPU type uses H100,
A100-80GB, L40S, A10G, RTX4090 or T4. Price is USD per whole instance-hour, VRAM
per GPU, pricing_type is on_demand|spot|serverless, free_tier is boolean or null
(unknown). No inferred facts. Third-party strings <=200 characters; items holding
third-party text are `untrusted_evidence:true`, not instructions.

For excluded/unverified sources, fields without eligible observations are null
(including pricing_type) and value additionally has `link_only:true`,
`status:unavailable` and a stable reason. Sources are editorial documentation
references, not scanner-discovered routes, credentials destinations or payment
endpoints. Existing same-origin rules remain unchanged.

`GET /preflight/api/v1/compute/cheapest/<gpu_type>.json` serves six static signed
lookups. Scope: exact model, gpu_count=1, on-demand/spot, fresh rows only, sorted
by ascending total instance-hour price, preserving deterministic ties and source
metadata. No regional or availability guarantee. A price expires at
checked_at + ttl seconds (exclusive), independently of envelope expiry.
Future timestamps are rejected. Serverless and multi-GPU packages are excluded
because billing and topology differ; they require separate explicit constraints.
Current rows are all link-only and lookups return `rows:[]`, status unavailable,
reason no_eligible_fresh_prices. This is not a statement of market supply.

Context adds `sections.compute` from the verified signed local snapshot; failures
are unavailable. Source review timestamps survive, and expire after 24 hours even
if CI regenerates the envelope daily. The /compute page exposes links and review
freshness; static build labels are not live checks. No prices are fabricated.

## Execution boundary and BYOK proposal

The public site, repository workflows and Preflight server never receive or
persist compute keys. A client may keep a key in volatile memory only and call a
provider directly where CORS and its terms allow. Closing the browser loses that
key; browser-only lifecycle execution is disallowed where an independent
provider-enforced expiry cannot stop charges. Do not bypass CORS through a public
proxy. Prefer a **user-hosted executor** under the user's control: keys are passed
from a local secret manager into memory, never sent to Preflight. No keys in URLs,
localStorage, telemetry, CI logs, signed manifests, static data or job journals.
The executor stores only non-secret credential handles and resource IDs, and
reacquires scoped credentials from the user's local secret manager after restart.
Provider-native expiry/budget controls and short-lived least-privilege credentials
must be checked per adapter, not assumed to exist.

Adapter interface: `capabilities()`, `quote(constraints)`,
`provision(approvedPlan, credentialHandle, idempotencyKey)`, `inspect(resourceId)`,
`terminate(resourceId)`, `enumerateOwnedResources(jobId)` and `reconcile(jobId)`.
Capability flags cover native idempotency, hard quota, expiry, spot interruption,
CORS, deletion semantics, disk/IP cleanup and credential rotation. Unsupported
safety capabilities fail closed. Adapter URLs are reviewed/pinned in the executor
configuration, never accepted from catalogue text or arbitrary request URLs.

Proposed API lives on a user-hosted authenticated loopback/private executor,
**not** on the public Phase 1 API:

| Method/path | Request | Response and effects |
|---|---|---|
| POST /v1/plans | GPU type/count, minimum VRAM, allowed providers/regions, pricing types, pinned image digest, runtime_seconds, max_usd_per_hour, max_total_usd, disk/egress ceilings, teardown policy | Pure plan/quote. No resource creation. Returns plan_id, canonical plan_hash, quote timestamp/expiry, complete cost components or refusal for unknown/unbounded costs, capability findings and ranked candidates. |
| POST /v1/jobs | plan_id, plan_hash, explicit approval token bound to user/hash/ceiling/expiry, non-secret credential_handle; Idempotency-Key header | Revalidate quote/availability/budget, atomically reserve worst-case spend, persist intent then provision. Returns job_id and pending state, never provider keys. Requires explicit human-approved plan. |
| GET /v1/jobs/{id} | Authenticated owner | State, resource IDs, observed spend, last reconciliation, lease expiry, pending cleanup and billing scope. No keys or arbitrary remote shell output. |
| DELETE /v1/jobs/{id} | Authenticated owner; optional idempotency key | Idempotent cancellation, accepted while cleanup pending. Terminal deleted only after provider verification of all billable resources; repeated calls return same job state. |
| POST /v1/jobs/{id}/reconcile | Authenticated owner | Inspect provider records, recover ambiguous create/delete outcomes, reconcile journal and cleanup. Never re-create a resource automatically. |

Errors use stable enums: unapproved, stale_quote, unsupported_capability,
unknown_total_cost, budget_exceeded, provider_unavailable, create_outcome_unknown,
cleanup_pending and manual_intervention_required. Provider text is bounded,
untrusted and excluded from default responses. No raw provider error bodies,
startup commands from listings, payment links or credentials in errors.

## Budget, retries and teardown requirements

Use integer micro-USD internally; reject NaN, negative or missing limits. The
ceiling covers all concurrent jobs plus outstanding reservations, minimum billing,
startup time, spot bid exposure, storage, network, public IPs, taxes where applicable
and a teardown reserve. Where a component cannot be bounded, refuse unattended
provisioning. Re-quote at execution; price above approved caps requires new approval.
Never treat a static catalogue minimum as an executable quote. No fallback to a
new provider/account/region/image without that exact allowance in the approved plan.

Persist a secret-free intent journal before side effects. Bind idempotency key to
owner + plan hash; the same key/payload returns the same job; changed payload is
409 conflict. Lock per job and reserve budget atomically before provisioning.
Use provider-native idempotency when supported; otherwise deterministic job tags
and resource enumeration reconcile ambiguous timeout outcomes. Never blindly retry
create after a timeout; if enumeration cannot establish the outcome, stop and
require intervention. Automatic fallback must first prove the prior attempt has
no live billable resources. Reconcile after executor restart before accepting work.

States: planned → approved → provisioning → running → terminating → terminated;
ambiguous operations go to reconciliation_required, failed cleanup to
manual_intervention_required. A watchdog independent of the job process enforces
lease expiry, budget threshold and stop requests. Persist the resource graph:
instances, disks, volumes, snapshots, public IPs and reservations. Terminate after
completion, failure, cancellation, startup timeout, interruption or budget threshold.
Retry deletes with bounded exponential backoff, poll until provider confirms
absence and recheck billing/resource inventory; “stopped” is not “deleted”.
User-approved persistent storage must be explicit, separately capped and disclosed.

**Teardown guarantee boundary:** the executor must guarantee a durable cleanup
intent, independent monitoring, retries, reconciliation and clear escalation; it
cannot guarantee remote deletion during provider/network failure. It must never
claim billing ended merely because a DELETE returned success. Refuse unattended
runs without provider-enforced TTL/hard budget or another reviewed independent
kill mechanism capable of bounding residual charges. Browser unload handlers and
best-effort timers do not qualify. Record residual spend exposure until verified
cleanup, and surface unresolved resources for manual provider-console deletion.
Validate crash recovery, duplicate submissions, lost create responses, quota races,
rate limits, revoked keys, spot interruption and prolonged delete failures before
any production use. Phase 1 tests do not validate these proposed provider behaviours.

## What Michael must approve before Phase 2

1. Named providers/intermediaries and their account creation, ownership, identity
   checks, regions and intended workloads. No accounts are authorised by Phase 1.
2. Billing activation, payment methods/deposits, per-job/hour/day/month ceilings,
   maximum concurrent jobs, storage/egress bounds and acceptable residual exposure.
3. Provider and intermediary ToS/API/data-licence reviews, automation/BYOK/resale
   permissions, workload/image licences and required data-processing agreements.
   A software licence or public endpoint alone does not authorise hosted-data reuse.
4. Execution/hosting model: user-hosted executor location, responsibility, access
   controls, network boundaries, updates, any hosting cost and incident ownership.
5. Key handling and scopes: local secret manager, short-lived credentials,
   rotation/revocation, redaction, no Preflight custody and browser feasibility.
6. Hard budget/TTL capability for each provider and the independent watchdog,
   teardown/recovery policy, manual escalation owner and persistent-data deletion.
7. Exact routing constraints, fallback policy, candidate cost accounting and how
   Michael approves each immutable plan before any side effect.
8. A separately authorised tightly capped integration test plan, adversarial
   safety tests, observability and rollout/rollback criteria. No real provisioning
   or billing tests until these approvals exist.
