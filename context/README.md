# Agent Homepage context

Node 20 ESM, zero dependencies. From the repo root:

    npm ci --ignore-scripts --prefix context
    npm test --prefix context
    node context/index.mjs --output /tmp/preflight-context

Omit --output to publish public-data/api/v1/context.json and context/<domain>.json.
Uses scanner/signing.mjs's existing PREFLIGHT_SIGNING_KEY seed only. Missing seed
produces signature:null; invalid seeds stop publication. No API credentials.
All sections are arrays of {value,source,checked_at,ttl_seconds,untrusted_evidence?}.
Check each TTL independently; original site timestamps survive aggregation.
Domain files embed the original preflight envelope, without renewing it.

Only fixed, reviewed sources are fetched. Reuses scanner public-DNS/pinned HTTPS
transport, honest optionally signed PreflightBot requests, robots-first checks,
per-host serialization/one-second spacing, timeout, byte caps, no redirects and
stop-on-error. Upstream errors become unavailable. Registry reports page size,
not an invented total when paginated; listings/endpoints are never returned.

Licence decisions are in DECISIONS.md. Nager.Date API commercial use requires
sponsorship despite its MIT code. Statuspage public endpoints have no verified
commercial redistribution grant; they and hyperscalers remain link-only. The
Statuspage parser is implemented/tested but disabled pending a reviewed licence
decision. No permission is assumed from anonymous availability. Fastly's example
endpoint could not be verified and is omitted.

Selected LiteLLM prices are USD per input/output token, not all billing options
or a claim about current popularity. Missing models are unavailable. UA tokens
are untrusted; protocols are static discovery paths, never action routes. Source
licence notices ship as /context-NOTICES.txt. ECB rates remain free, attributed,
unmodified numeric reference values (XML projected to JSON), not transaction rates.

Hourly Action runs at minute 23 and dispatches Pages after committing. Scan and
context share public-data-${github.ref} concurrency and rebase/retry publication.
Generated files are not checked in during development. Generate context before
the site build to preview data; without it the homepage explicitly says unavailable.
GitHub Pages project hosting serves /preflight/llms.txt and /preflight/SKILL.md;
an origin-root /llms.txt or /SKILL.md needs an origin-root deployment/custom domain.

UK bank holidays use GOV.UK's public JSON with OGL v3 attribution in the item.
Verdict/safety summaries preserve the oldest scan checked_at and expire after one
hour. Safety counts distinguish current/expired CERT Polska feed checks and
historically listed responses; absence is never a clean bill of health. The
scanner downloads the official active-only list once per run with a five-minute
TTL; context reuses published observations without another feed download.

Fleet guidance and checklist are original operator advice, attributed to
"Preflight operator fleet observations, 2026-10", with optional public_link.
The review date is fixed (UTC midnight, day precision); versioned first-party
guidance expires after one year and is reviewed on change, next fleet revision
or before expiry. It is not a live tool/quota
observation. No quota balance or last successful runtime probe is invented.

Per-domain sections.domain_identity and the local MCP domain_identity(domain)
helper use pinned tldts (including private PSL rules), plus vendored Unicode
confusables and Scripts 17.0.0. Skeleton mapping changes (including ASCII mappings like m → rn)
are warnings, never proof of impersonation. mixed_script checks within a label,
ignores Common/Inherited characters, and does not implement UTS #39 restriction
levels or resolve Script_Extensions. Some legitimate labels mix scripts. No
brand comparison or ownership conclusion is made; exact-origin routes are unchanged.
Canonical computed DNS identifiers remain complete (at most 253 characters);
only the display skeleton caps at 200 with display_truncated. Raw third-party
evidence prose remains capped/untrusted, and reference comments are not exposed.
Unicode snapshot timestamps/hashes are in vendor/metadata.json; TTL is seven days. PSL data is updated through reviewed tldts dependency updates.
The hourly context workflow runs node context/refresh-identity.mjs, skips fresh
snapshots and commits due refreshes alongside public data. URLs are fixed,
Unicode version is pinned, robots/size/timeout limits apply, and failed refresh
keeps prior snapshots while the workflow continues publishing other context;
expired identity items become unavailable through MCP. Review licence changes before changing Unicode versions.
Manual refresh uses the same command, without accounts or API credentials.
