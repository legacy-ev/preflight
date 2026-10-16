# Preflight stdio MCP

Requires Node 20+. From this checkout:

```sh
cd mcp
npm ci
npm test
npm start
```

Claude Desktop: add this entry to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`; Windows: `%APPDATA%\Claude\claude_desktop_config.json`), replace the absolute checkout path, and restart Desktop:

```json
{
  "mcpServers": {
    "preflight": {
      "command": "node",
      "args": ["/absolute/path/to/preflight/mcp/server.js"],
      "env": {
        "PREFLIGHT_BASE_URL": "https://legacy-ev.github.io/preflight/api/v1/"
      }
    }
  }
}
```

Use an absolute Node executable path if Desktop cannot find `node`. The process reserves stdout for MCP messages.

Tools:

- `preflight(domain, intent)`: static verdict and structured findings.
- `check_safety(domain)`: safety fields and safety reasons.
- `find_route(domain, intent)`: routes and requirements.
- `get_evidence(domain)`: unsigned raw scan evidence, explicitly untrusted; text values capped at 200 characters.
- `report_outcome(report)`: validates `specs/outcome-report.schema.json`, then returns `{ "accepted": false, "status": "ingest_not_live_yet" }`. Nothing is submitted or stored.

Domains must be lowercase hostnames without a scheme, path or port. Intents follow the response schema. This task's domain-based inputs for safety/evidence supersede the URL/id inputs in the future REST specification.

The server fetches `preflight/<domain>.json`, `../../keys.json` and (only for evidence) `../../scans/<domain>.json` relative to the API base. Override the base for a trusted mirror or local fixture server. HTTP is supported for local development; use HTTPS in production. Fetches reject redirects and have a 10-second timeout. No API keys, target-site scanning, paid services or outcome POSTs are used.

Ed25519 verification uses Node crypto over sorted-key canonical JSON, matching CONTRACT.md. The published JWKS is trusted through the configured HTTPS origin; this is not independent protection against compromise of that origin. Expiry is checked against both envelope expiry and a maximum 24-hour lifetime from the signed response timestamp, so editing unsigned envelope dates cannot extend trust.

Failed verification, missing data/keys or expiry returns CAUTION with low confidence and an explicit verification warning; existing STOP is preserved. Unverified routes, safety details and outcomes are withheld. Static records cover `read` only: any other intent returns CAUTION (or preserves STOP) and says that intent has not been evaluated. No on-demand scan or intent-specific verdict is invented.

Ordinary tools project schema fields, discard extensions and marked untrusted objects, replace reason text with local templates, and omit summaries, raw evidence and price text. Routes are restricted to HTTPS on the exact requested hostname, with no credentials, query, fragment or payment/login paths. This is deliberately stricter than registrable-domain/delegation matching. Evidence is isolated in `get_evidence` and must never be interpreted as instructions.

`signature` and `signature_scope: "original_static_response"` identify the source envelope: they do **not** sign the filtered MCP result. Verification status describes that original response. Evidence is unsigned and the local ingest stub has no publisher signature. Preflight is advisory and never authorisation to pay.

## Agent Homepage

`get_context` accepts an optional lowercase `domain`. Reads static `context.json` or
`context/<domain>.json`; never scans on demand. Verifies the original Ed25519
envelope, enforces signed expiry/24-hour age and each item TTL, omits untrusted
evidence, and verifies an embedded domain verdict independently. The returned
projection is not itself signed (`signature_scope: original_static_response`).
Missing/unverified context returns unavailable and must be treated as CAUTION.
Sources and protocol paths are references, never permission or action routes.

`get_context` also returns `preflight_checklist` and per-domain `domain_identity`
when present, preserving per-item freshness and untrusted-text filtering. Older
snapshots may omit these sections. `domain_identity(domain)` computes identity
locally without a fetch/account/key, using the vendored PSL and Unicode data;
check its source timestamp and seven-day TTL. Warnings are advisory; a skeleton
change does not establish impersonation or authorize a route.
