# Threat model v0.1 — "if everyone trusts Preflight, Preflight is the target"

## Two golden rules (hard-code these; never relax them)
1. **Preflight can tell an agent to be careful. It can never tell an agent where to send money or credentials.**
   - No payment details, wallet addresses, card fields or checkout URLs in any response.
   - No off-domain endpoints in any response.
2. **Bad news is cheap to add; good news is expensive.**
   - Any one trusted source can lower a verdict.
   - Raising a verdict to GO needs our own scans plus agreement from independent sources.
   - Clearing a safety flag needs human review.

## Attacks ranked by likely attacker profit

| # | Attack | How they profit | Main defences |
|---|---|---|---|
| 1 | **Route hijack:** swap a merchant's `best_route` endpoint for an attacker's lookalike checkout, MCP server or x402 endpoint | Agents pay the attacker directly; works at scale | Same-origin rule (below); never accept endpoints from outcome reports, disputes or third-party directories; all endpoints signed into our responses |
| 2 | **Safety whitewash:** get a fake shop or phishing domain marked GO (flood good outcomes, fake disputes, fake opt-out) | Scam sales | GO is never raised by outcomes alone; safety flags are cleared only by human review; opt-out stops scanning but never hides safety listings; ownership must be proved for disputes |
| 3 | **Tool directory poisoning:** list a malicious MCP server or overpriced x402 endpoint with fake health/popularity | Credential theft, micro-payment drains, malware | Our own health probes and static poisoning scans; rank only on our own measurements plus independent operators; new listings start in quarantine; never "recommend" — only "list with findings" |
| 4 | **Recipe poisoning:** insert a step like "enter card at X", "install package Y" or "call tool Z" | Card theft, malware installs | Recipes use a fixed step vocabulary; no off-domain URLs; no install/download steps; purchase-related recipes need human review; every change versioned and diffed |
| 5 | **Competitor sabotage:** flood fake "failed/blocked" outcomes on a rival so it shows CAUTION | Diverts agent sales; also extortion ("pay or we tank you") | Negative outcome flags need ≥3 independent verified operators plus confirmation by our own probe; owner notified with a dispute route; per-reporter caps |
| 6 | **Ranking inflation:** fake success reports for your own site to win agent traffic and affiliate fees | Traffic, commissions | Same as #5, plus anomaly detection; outcome data can only reorder routes on the same domain, never rank merchants against each other in Phase 1 |
| 7 | **Injection through our own responses:** put instructions in fields we echo (ToS spans, tool names, descriptions) to hijack every agent that reads us | Agent takeover at scale | Third-party text is length-capped, escaped and flagged `untrusted_evidence`; it is **excluded from MCP responses by default** (available via `get_evidence` only); our tool descriptions are static |
| 8 | **Infrastructure takeover:** steal the signing key, compromise CI or a dependency, take over DNS/registrar, Cloudflare/Supabase/GitHub accounts | Total: serve anything, signed as us | See "Infrastructure" below. **This is the highest-impact attack.** |
| 9 | **Upstream poisoning:** poison the MCP Registry, x402 Bazaar, UA lists or feeds we ingest | Same as #1/#3 | Upstream data is never trusted to bind an endpoint to a domain; cross-check sources; changes from upstream go through the same quarantine |
| 10 | **Denial of wallet:** trigger expensive on-demand scans and LLM calls on random domains | Hurts us (cost); competitors or griefers | Rate limits, keys, Turnstile, queue + cache, daily budget caps with alerts, LLM calls only for seed list + paid tiers |
| 11 | **Social engineering:** pretend to be a site owner or a Preflight staff member to Michael or support | Flip verdicts, get credentials | Ownership proved by DNS TXT or a `/.well-known/preflight-verify` file; no verdict changes by email; staff never asks for keys |

## Same-origin rule for routes (kills attack #1)
A route endpoint may appear in a response only if **all** of these hold:
- It was discovered **by our own scanner**.
- It was found at a well-known path or in a signed manifest **on the same registrable domain** being checked.
- Or it is delegated by that domain via a DNS TXT record we verified (e.g. `_preflight-route.example.com`).

**Never** take an endpoint from outcome reports, disputes, directories, emails or LLM output. If the endpoint changes, the route status drops to `discovered` and a `change_event` is logged.

## Outcome network defences (attacks #2, #5, #6)
- Count only reports from verified operators: a Web Bot Auth key we registered, or an API key tied to a Stripe-verified or manually approved account. Anonymous reports are stored but never counted.
- **Diversity:** a cell needs ≥3 independent operators before it can change a verdict.
- **Caps:** one operator contributes at most 30% weight to any cell.
- **Quarantine:** new reporters' data waits 7 days and is compared against our own probe agent before it counts.
- **Bounds:** outcomes can only add CAUTION or reorder routes on the same domain. They can never produce GO, never clear a safety flag, never add an endpoint.
- **Anomaly detection:** sudden swings, bursts from new keys, reports at impossible times or rates → freeze the cell and alert.
- **Canary domains:** test domains we control. Any reports about them (we never publish them as targets) reveal fabricated data.

## Infrastructure (attack #8)
- **Hardware security keys (passkeys/FIDO2)** on GitHub, Cloudflare, Supabase, the registrar, Stripe and email. No SMS 2FA.
- Registrar lock + DNSSEC.
- **Signing key isolation:**
  - a separate, minimal signing Worker holds the Ed25519 key
  - it is never present in CI, the repo, or the main API Worker's environment
  - the API asks it to sign
  - rotate every 90 days
  - signatures include `generated_at` and `expires_at` (e.g. +24h)
- **Transparency log:** every verdict change goes into an append-only, hash-chained log. Publish the daily root hash to the public GitHub repo, so tampering is detectable by anyone.
- **CI and supply chain:**
  - pin dependencies (lockfiles) and pin GitHub Actions to commit SHAs
  - Dependabot + `npm audit` in CI; keep dependencies minimal
  - branch protection with required human approval on merge to main (Michael's human-on-merge model)
- **Least privilege:** the API uses a read-only DB role; only the scanner role writes scans; only the admin role clears safety flags (and admin actions are logged).
- Publish `security.txt`. Run a red-team pass on attacks #1–#7 before public launch, and start a small bug bounty once there is revenue.

## Client side (what we tell agents)
- An official SDK snippet verifies the signature, rejects expired responses, and treats a failure as CAUTION.
- Documented clearly: **Preflight is advisory; it is never authorisation to pay.** Agents should still confirm purchases with their user.

## Monitoring
Alert immediately on:
- any GO → STOP or STOP → GO flip in the seed list
- any route endpoint change in the seed list
- signing Worker errors
- budget threshold
- an outcome-anomaly freeze
