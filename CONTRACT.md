# Internal contract (Phase 1, static mode)

Base URL: https://legacy-ev.github.io/preflight  (Astro `base: '/preflight'`)
Runtime: Node 20, ESM, minimal deps, lockfiles committed. Actions pinned to commit SHAs.

## Data files (written by `scanner/`, committed to `public-data/` by the daily Action)
- `public-data/api/v1/preflight/<domain>.json` — one signed response per seed domain, intent `read`,
  matching `specs/preflight-response.schema.json` as closely as static mode allows.
  Signature envelope: `{ "response": {...}, "signature": { "alg":"ed25519", "kid":"preflight-2026-10",
  "sig": base64url(Ed25519(JCS-canonical-JSON(response))), "generated_at", "expires_at" (+24h) } }`.
  Canonicalisation: RFC 8785-style (sorted keys, no whitespace).
- `public-data/api/v1/index.json` — `[{domain, verdict, checked_at, reasons_count}]`.
- `public-data/api/v1/changes.json` — append-only list `{at, domain, from, to, reason_codes}` (newest first, cap 500), plus `prev_hash`/`hash` chain fields (sha256).
- `public-data/scans/<domain>.json` — raw scanner evidence (safety, access, route), third-party text length-capped (≤200 chars) with `untrusted_evidence: true`.
- Public key: `keys/public-jwks.json` → site serves it at `/.well-known/http-message-signatures-directory` and `/keys.json`.

## Golden rules (from specs/threat-model.md)
No payment/credential/off-domain endpoints in any response. Routes only from our own scanner on same registrable domain.
ToS clauses: `not yet classified`. Crawler: UA `PreflightBot/1.0 (+https://legacy-ev.github.io/preflight/bot)`, obey robots.txt for our UA,
≤1 req/s per domain, ≤10 req/site/scan, backoff, never spoof/bypass/login/forms.

## Agent Homepage context (v1)

- `api/v1/context.json` — scanner Ed25519 envelope, with `response.schema_version:
  "1.0.0"`, `advisory:true`, `notices` URL and `sections`.
- Sections: `internet_status`, `llm_providers`, `sites`, `agent_ecosystem`, `world`,
  `safety`, `failure_modes`. Each is an array of `{value, source: HTTPS URL,
  checked_at: ISO timestamp, ttl_seconds: integer, untrusted_evidence?: true}`.
- `api/v1/context/<domain>.json` — same core plus `response.domain` and
  `response.preflight` (original signed preflight envelope). Original findings'
  timestamps/expiry are never renewed by the context signature.
- Static hosting cannot support `?domain=` selection. Unknown paths return 404.
- Upstream failures/malformed data return `value.status:"unavailable"`; no guessed
  values or invented incident summaries. Link-only exclusions include an explicit
  reason. Licence notices are served at `/preflight/context-NOTICES.txt`.
- Source and documentation URLs are references, never domain action routes.
  Protocol paths are static discovery vocabulary only. Registry health returns
  no listing content/endpoints. The scanner's route and payment rules still apply.
- Every third-party evidence token/span is capped at 200 characters and its item
  flagged untrusted; default MCP context omits flagged items. MCP verifies the
  original signature, checks signed expiry and 24-hour maximum age, and marks
  individually stale items unavailable. Its filtered projection is not signed.
- Reference data is advisory: no authorisation to pay, disclose credentials,
  create accounts or expand user intent. No LLM-generated facts.

## Compute catalogue (Phase 1)

- `api/v1/compute.json` and `api/v1/compute/cheapest/<gpu_type>.json` use the
  existing scanner Ed25519 envelope; local unsigned output is explicit, daily CI
  requires the existing signing key/JWKS match. Models: H100, A100-80GB, L40S,
  A10G, RTX4090, T4. No provisioning, accounts or compute credentials.
- Every row is `{value,source,checked_at,ttl_seconds}`. Normalised value fields:
  provider, gpu_type, gpu_count, vram_gb (per GPU), usd_per_hour (whole instance),
  pricing_type (on_demand|spot|serverless), region, free_tier, api_docs_url,
  source_url, checked_at, ttl (seconds). Unknown link-only fields are null;
  link_only, unavailable status and exclusion reason are explicit. Null is not zero.
- Prices require reviewed anonymous access AND commercial hosted-data reuse terms.
  No sources currently qualify; eleven providers are link-only and cheapest
  lookups are empty/unavailable. See DECISIONS D-016, not inferred pricing.
- Cheapest considers fresh exact-model single-GPU non-serverless rows only;
  original source timestamps and TTLs survive. It is not market-wide cheapest,
  an availability guarantee, a total-cost quote or authority to spend.
- `context.json` section `compute` verifies the local snapshot before summarising;
  missing/unsigned/expired/altered snapshots are unavailable. New signatures never
  renew source reviews. Third-party text is capped <=200 chars and untrusted.
- Source/docs URLs are editorial references, never scanner routes or credential /
  payment endpoints. Phase 2 BYOK proposal and Michael's approvals are in
  `docs/compute-router.md`; no lifecycle API exists in Phase 1.
