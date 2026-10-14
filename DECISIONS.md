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

## D-004 — Static public site and explicit demo fallback (2026-10-14, Codex)
- **Decision:** Astro static output at `https://legacy-ev.github.io/preflight`; consume the CONTRACT.md response envelope, with per-file metadata fallback and whole-directory response fallback when scans are missing. Copy published API files verbatim; do not mix fixture response domains into an existing scan directory.
- **Alternatives considered:** runtime API, invented live findings, fixture signatures generated with a new key.
- **Why:** GitHub Pages has no runtime API. Three reserved example domains demonstrate GO/CAUTION/STOP without allegations about real merchants; empty signatures are explicitly unverifiable. ToS remains not yet classified. Missing MCP implementation is documented honestly, with conditional setup instructions.
- **Evidence / links:** CONTRACT.md; https://modelcontextprotocol.io/docs/develop/connect-local-servers (desktop config format and paths verified against official documentation).

## D-005 — Provenance, expiry and route presentation (2026-10-14, Codex)
- **Decision:** Show dated reasons, snapshot ages, untrusted-evidence labels and signature expiry. Publish a Web Crypto Ed25519 verification snippet with tests for tampering, expiry, unknown keys and unsigned fixtures. Anchor maximum validity to signed response.generated_at because outer envelope dates are not signed. Only display HTTPS same-domain routes without payment/credential paths, credentials, queries or fragments.
- **Why:** Signatures prove provenance, not safety. Static evidence retrieval and outcome ingest are not implemented, so pages do not claim those services exist. Endpoint provenance remains the scanner's responsibility; UI filtering is additional defence.

## D-006 — Node 20 dependency and Pages deployment (2026-10-14, Codex)
- **Decision:** Pin Astro 5.18.2 (latest Astro 5) with committed npm lockfile and override transitive undici to 7.30.0 for Node 20 compatibility. Actions pinned to upstream SHAs; Pages deploy on main push or workflow_dispatch with pages:write and id-token:write.
- **Alternatives considered:** Astro 7.3.8 requires Node >=22.12, conflicting with the explicit Node 20 contract. No added framework, RSS or signing dependencies.
- **Why:** Preserve the required runtime. npm audit still reports three advisories (low, high, critical) in the Node-20-compatible dependency tree. This static site does not use image optimisation, SSR, islands, spread attributes or view transitions implicated by advisories; upgrade Astro when Node 22 is authorised. This is a recorded limitation, not a clean audit claim.

## D-007 — Quiet table-led visual direction (2026-10-14, Codex)
- **Decision:** Use the design skill's Quiet instrument direction (seed 772140720), adapted to a readable leaderboard width, dark green-black surfaces, Space Grotesk headings and Inter body. The dated verdict table is the subject's visual proof; domain/verdict filtering is the live interaction. No unrelated pictures or invented proof.
- **Why:** This information site needs fast inspection of dates and evidence. Fonts use the permitted Google Fonts link; privacy text discloses those requests. Motion is limited and honours reduced-motion preferences. Skill lint: zero failures; default-font warning is required Inter, punctuation warning reflects endpoint documentation. Inspector cannot run on installed Node 20 (requires Node 22); reviewed Chrome desktop/mobile screenshots instead. Manual critique: readable hierarchy and two-line mobile headline; table scroll and long documentation are practical limits. No numerical design score claimed.
