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
  `safety`, `failure_modes`, `preflight_checklist`. Domain files also include
  `domain_identity`. Each is an array of `{value, source: HTTPS URL or the fleet attribution below,
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

### Extended reference facts

- `api/v1/timezones.json` uses the same envelope. `response.zones` contains
  timestamped items for the union of Intl supported zones and system IANA zones
  and aliases, with UTC offset, TZif `is_dst` and the next transition within
  400 days (null when absent). System and Node tzdb versions are distinct fields.
  World contains only the pointer, count and major-zone items.
- `software` and `vulnerabilities` are additional section arrays. Software uses
  endoflife.date v1; world includes Wikidata structured country claims. OSV
  evidence is a bounded GET-only recent-change sample under the no-posting rule;
  full package queries are explicitly unavailable/link-only. No match is never
  a clean bill of health. See D-016 for source-specific reuse and coverage.
- Those remote facts preserve their original checked_at and 86400-second TTL
  across hourly builds using public-data/context-cache; failures are cached too.

### Checklist and domain identity extension (2026-10-16)
- Operator-authored guidance uses `source: "Preflight operator fleet observations, 2026-10"`; optional `value.public_link` points to supporting public documentation, never an action route. Review date is day-granularity UTC midnight with a one-year lifetime for versioned first-party guidance; builds do not renew it. Re-review when the guidance changes, at the next fleet revision, or before expiry. It is advice, not live runtime telemetry.
- Domain identity is a per-domain `sections.domain_identity` array item and a local MCP `domain_identity(domain)` helper, using committed PSL (including PRIVATE rules) and Unicode 17.0.0 data. Reference `checked_at` survives context rebuilding; TTL is seven days.
- Punycode, within-label mixed scripts and changed confusable skeletons are advisory warnings, not identity/ownership/safety proof or a UTS #39 restriction-level implementation. Exact-origin route constraints remain unchanged. Canonical computed hostnames/registrable domains retain their complete bounded DNS identifiers (at most 253 characters); display-only skeleton text caps at 200 with `display_truncated`. These parsed identifiers are not raw third-party evidence spans; reference comments/prose are never exposed.
- The existing hourly workflow refreshes reference snapshots only when the weekly TTL expires, using the bounded robots-aware source transport; failure preserves previous files and allows publication with stale identity timestamps; MCP marks expired identity items unavailable. Licence notices and unmodified snapshots remain in `context/vendor/`.
