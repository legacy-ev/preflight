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
