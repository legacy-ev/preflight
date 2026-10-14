# DECISIONS — Preflight

One entry per significant decision. Never delete; if a decision is reversed, add a new entry that references the old one.

Entry format:

## D-<number> — <title> (YYYY-MM-DD, <agent>)
- **Decision:** 
- **Alternatives considered:** 
- **Why:** 
- **Evidence / links:** 

---

## D-001 — Pivot from "Agent Access Index" to "Preflight" (2026-10-14, Claude)
- **Decision:** The core product is a pre-action verdict API/MCP (`preflight`) plus an outcome-reporting network. The site-owner checker is demoted to a lead magnet.
- **Alternatives considered:**
  - Public leaderboard + checker as the core (the original brief)
  - Agent reputation scoring
- **Why:**
  - Agent-readiness checkers are commoditised (Vercel Is Agentic, Frase, ChatThing, SEOJuice; Lighthouse has a built-in audit).
  - Cloudflare Radar already scans top-10k robots.txt weekly.
  - Agent reputation is well funded (Vouched, Skyfire, AgentScore, Sumsub).
  - No one found aggregating everything into one decision or collecting agent outcomes.
- **Evidence / links:** see BRIEF.md section 15.

## D-002 — Verdicts are deterministic (2026-10-14, Claude)
- **Decision:** Verdicts come only from rules in `specs/verdict-rules.md`. LLMs may only classify ToS clauses (evidence always attached) and write summaries from templates.
- **Why:** Trust, reproducibility, legal safety, and resistance to prompt injection.

## D-003 — Outcome reports are enum-only, with no PII (2026-10-14, Claude)
- **Decision:** No free text, no full URLs, no user content in outcome reports.
- **Why:**
  - Privacy (UK GDPR).
  - Removes a poisoning/injection channel.
  - Makes aggregation simple.

## 2026-10-14 — Phase 0 substitutions (orchestrator)
- **Hosting:** GitHub Pages (Astro static build) instead of Render. Why: no new account/billing allowed (Human Gate 2).
- **Database:** JSON files committed by GitHub Actions (`public-data/`) instead of Supabase. Why: no account yet. Schema in specs/data-model.sql kept as target.
- **API:** static JSON "API" served from Pages (`/api/v1/preflight/<domain>.json`) instead of Cloudflare Workers. Why: no account. Live per-intent queries deferred.
- **Signing:** Ed25519 key generated locally, stored only as GitHub Actions secret `PREFLIGHT_SIGNING_KEY`; public key published at `/.well-known/http-message-signatures-directory`. Deviation from threat model (key must not be in CI) — accepted temporarily until a separate signing Worker exists; rotate on move.
- **ToS classification:** deferred; all clauses `not yet classified` (no Anthropic spend).
- **Sentry/PostHog/Resend/Stripe:** not wired (need accounts).
- **Outcome ingest:** not live (needs a server); schema + MCP tool stub only.
- **Crawler UA:** `PreflightBot/1.0 (+https://legacy-ev.github.io/preflight/bot)` until a domain is bought.

## D-004 — Static stdio MCP and conservative trust boundary (2026-10-14, Codex)
- **Decision:** Implement the five requested tools using Node 20 and the official `@modelcontextprotocol/sdk`, stdio instead of the future remote Worker. Use domain inputs for safety/evidence as requested. Keep outcome ingestion a validated, non-storing stub.
- **Alternatives considered:** Remote HTTP, live intent computation, on-demand scanning, and pretending static read data applies to purchases.
- **Why:** Explicit task scope and free static hosting contract; unsupported intents return CAUTION. Verification failures/expiry return CAUTION but preserve STOP. Routes are withheld on trust failures and otherwise use exact-host HTTPS rather than a new public-suffix dependency. Third-party evidence is available only through get_evidence; other tools use schema projection and locally generated reason text.
- **Signing:** Node crypto verifies CONTRACT.md's Ed25519/JCS-style envelope against keys.json. A maximum 24-hour age from the signed response timestamp prevents unsigned envelope expiry extension. Returned signatures describe the original response, not the sanitised projection; evidence and the stub are unsigned. Origin HTTPS remains the JWKS trust anchor.
- **Dependencies:** SDK plus Ajv 2020 and ajv-formats for full schema/date validation; lockfile committed. No keys or paid APIs used.
- **Evidence / links:** Current spec resolves to https://modelcontextprotocol.io/specification/2026-07-28 (checked 2026-10-14); official SDK https://github.com/modelcontextprotocol/typescript-sdk. Installed SDK negotiates its supported protocol with the client; this does not claim implementation of every newer extension.

## D-005 — Repair outcome domain regex (2026-10-14, Codex)
- **Decision:** Correct the outcome schema's over-escaped literal dot to `\.` in the decoded regex; retain all other validation constraints.
- **Alternatives considered:** Work around the broken pattern only in MCP, or reject normal domains.
- **Why:** `example.com` must validate against the shared schema, rather than a divergent client copy. Mocked-fetch tests cover valid reports, enum errors, bounds, nested additional properties and timestamps.
