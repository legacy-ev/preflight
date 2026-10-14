# Preflight scanner

Node 20 ESM, no package dependencies and no paid APIs. A fetch-compatible built-in HTTPS transport pins connections to validated DNS answers while preserving TLS hostname verification. It reads the seed CSV and makes only identified GET requests. The scanner reads only `PREFLIGHT_SIGNING_KEY` from the environment; it never reads an API key.

From the repository root:

```sh
npm ci --ignore-scripts --prefix scanner
npm test --prefix scanner
node scanner/index.mjs --concurrency 3
node scanner/index.mjs --domains amazon.com,apple.com,shopify.com --concurrency 3
node scanner/index.mjs --limit 3 --output /tmp/preflight-scan
```

`--domains` is restricted to the seed CSV; `--seed` can select another CSV with a `domain` column. All comparisons still use the complete selected seed list. Concurrency is across domains (1–8 workers). Every site's requests remain sequential, at least one second apart, with ten requests maximum including robots and redirects. RDAP uses a separate globally serialized queue, at least one second apart. Requests have 12-second timeouts and streaming byte caps. Network errors back off; blocks, challenges, HTTP 402/429 and server errors end that site's crawl. No browser execution, credential use, form submission or CAPTCHA bypass occurs.

Robots is fetched first with PreflightBot. Specific user-agent groups override `*`, equally specific groups merge, longest path match wins and Allow wins ties. Wildcards, end anchors, percent escapes and UTF-8 paths are supported. Robots 404/410 means no published rules; other failures, HTML impostors, challenges, truncation and external redirects fail closed. A crawl delay over 60 seconds stops the scan. Each requested path and same-origin redirect target is checked independently. Training and user-triggered AI agents are reported separately; unknown policy is not represented as permission.

Routes and site redirects must stay on the **exact HTTPS origin**, including port. Consequently, redirects from `example.com` to `www.example.com` are skipped. Manifest service URL fields are allowlisted; arbitrary links, authentication/payment URLs, userinfo, queries and fragments are rejected. Well-known manifests and Product JSON-LD are evidence of discovery, not proof a task works. Legacy `agent.json` routes have `legacy:true`. No external manifest URLs are followed, and no manifest text is returned to agents.

HTML inspection detects hidden/off-screen/zero-font/same-colour inline and simple embedded CSS, metadata and JSON-LD instructions, ignore-previous phrases, invisible Unicode, comments and long accessibility instructions. It is a static heuristic, not a full DOM/CSS renderer, and can have false positives and false negatives. External styles, scripts and pages are never loaded. HTML nesting is capped at 128; depth/serialization limits mark inspection incomplete instead of crashing or yielding a clean scan. Findings are marked `untrusted_evidence:true` and capped at 200 characters in raw scans only.

RDAP registration dates come from `https://rdap.org/domain/<domain>` and HTTPS registry redirects; the final domain identity must match. No registrant/contact data is retained. Missing registration dates stay `null`. Lookalikes use edit distance ≤2 and a small homoglyph skeleton against the seed domains; exact known seeds are excluded. No Tranco list, phishing feed, ToS classifier or outcomes service is queried in this task.

`verdict(scan, intent, at)` in `verdict.mjs` accepts scanner evidence (see crawler output), evaluates every applicable rule, records all fired reasons and orders scanner-derived routes. Outcome rules require three verified independent operators, a ≤30% operator cap and confirmation by our probe. Positive outcomes cannot override STOP or clear safety flags. Phase 3 rules are gated on explicit supplied evidence. Missing coverage, independent safety agreement and unsigned scans add CAUTION; no data and incomplete coverage lower confidence. Safety flags from previous responses survive rescans until human review.

The contract's outer `{response, signature}` envelope takes precedence over the live schema's signature object. `response.signature` is `null`; the envelope signature uses `{alg,kid,sig,generated_at,expires_at}`. The signed, canonical response includes both timestamps so they cannot be extended without breaking the signature. Verification must check envelope/payload timestamps agree, reject expiry, and verify Ed25519 over `canonical(envelope.response)`. A missing key warns and produces `signature:null`; a malformed key or a key that differs from `keys/public-jwks.json` fails without publishing. The key is a base64url raw 32-byte Ed25519 seed, not PEM. Signing headers follow RFC 9421 / Web Bot Auth conventions; emitting them does not claim bot registration. GitHub Pages project hosting cannot supply the required origin-root directory or dynamic directory response signatures; verified-bot onboarding remains deferred.

Output paths match CONTRACT.md. Partial scans merge into the existing index. Evidence IDs resolve as keys in `public-data/scans/<domain>.json`'s `evidence` map, including evidence retained from flagged scans; a static HTTP evidence endpoint is not part of this task. `changes.json` is newest-first and capped at 500. Each hash is SHA-256 of canonical event JSON excluding `hash` (including `prev_hash`); the first event uses 64 zeros. At the cap, the oldest retained event's predecessor remains an anchor to the preceding Git history. Existing chains are checked before writing. Verdict, reason, route and ruleset changes append events, including same-verdict events for route changes. Files are replaced atomically one at a time; the CLI completes all scans before publication and the Action commits only a successful run.

For this managed workspace only, `--managed-dns` permits its synthetic DNS result `198.18.0.1` for domain-name URLs. Literal IP URLs and other private addresses remain rejected. This exception is opt-in, recorded in raw scans, and absent from the scheduled workflow. Do not enable it on ordinary hosts.

Daily scans run at 05:17 UTC and can be dispatched manually. The workflow commits `public-data/` to its current ref, then explicitly dispatches `pages.yml` with `GITHUB_TOKEN` because token-authored commits do not trigger push workflows. `pages.yml` must exist and expose `workflow_dispatch`; this scanner branch does not create or modify the separately owned Pages workflow.
