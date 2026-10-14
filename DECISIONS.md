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
