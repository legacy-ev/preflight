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

## D-004 — Static scanner and conservative ruleset 0.1.0-static.1 (2026-10-14, Codex)
- **Decision:** Node 20 ESM using built-in HTTPS/Response streams, crypto, DNS and node:test; zero runtime or test package dependencies, with scanner/package-lock.json committed. No LLM, paid API or environment API key is used. ToS is `not yet classified`; feeds, Tranco and outcomes are explicitly unavailable.
- **Alternatives considered:** browser automation, an HTML parser dependency, purchased threat/LLM APIs, treating missing checks as clean.
- **Why:** The task is bounded read-only static scanning, with no spend authorized. Static heuristics inspect inline/simple embedded CSS, JSON-LD, metadata, comments and Unicode; they do not claim comprehensive detection. HTML depth is capped at 128; excessive HTML/JSON nesting produces incomplete coverage rather than an unbounded parse.
- **Rules:** Preserve spec STOP/CAUTION precedence and intent rules. Add `DATA_INCOMPLETE`, `INDEPENDENT_SAFETY_UNVERIFIED`, `UNSIGNED_SCAN`, and `SAFETY_REVIEW_REQUIRED` for static coverage/signing and the threat model's expensive-good-news/human-clearance rules. Incomplete coverage lowers confidence; prior safety reasons and evidence remain until human review. GO requires explicit independent agreement, not outcomes alone. Outcome-triggered degradation also requires the threat-model diversity/cap/probe bounds. Version changes and route/reason changes enter the hash chain.
- **Evidence:** specs/threat-model.md, specs/verdict-rules.md, CONTRACT.md; scanner/test/ and fixtures/injection/.

## D-005 — Exact-origin routes and robots fail closed (2026-10-14, Codex)
- **Decision:** Enforce exact HTTPS origin for site probes, redirects and manifest routes. Reject payment/authentication/credential paths, userinfo, queries, fragments and non-public DNS. A2A's literal `agent-card.json` path is allowed despite the broad payment-card heuristic. Only explicit service URL fields are extracted; never follow links or emit third-party names/descriptions. Routes stay `discovered` because GET success is not task success.
- **Alternatives considered:** registrable-domain redirects (including www), taking endpoints from directories, executing page scripts or following arbitrary manifest links.
- **Why:** The user explicitly requires same-origin only. This deliberately skips common www redirects rather than silently widening trust. Robots is checked first and again per target path, with longest-match Allow ties, separate training/user-triggered results, ≤10 site requests and ≥1-second spacing. 404/410 permits crawling; other policy failures/challenges/truncation fail closed. Blocks, server errors and challenges end the site's crawl.
- **Evidence / paths checked:** [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html); [A2A current discovery](https://a2a-protocol.org/dev/specification/) uses `/.well-known/agent-card.json`; [legacy A2A](https://a2aproject.github.io/A2A/latest/specification/) described `/.well-known/agent.json`, labelled legacy here; [llms.txt proposal](https://llmstxt.org/) uses `/llms.txt`; [schema.org Product](https://schema.org/Product). The requested `/.well-known/mcp/server.json` and `/.well-known/mcp.json` are compatibility probes: current [official MCP discovery documentation](https://blog.modelcontextprotocol.io/posts/2026-07-28/) describes `server/discover`, and no universal manifest path was verified in official docs. Do not label those paths official standards.
- **UA provenance/licence:** Small frozen subset from [ai.robots.txt robots.json](https://github.com/ai-robots-txt/ai.robots.txt/blob/main/robots.json), [MIT licence](https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/LICENSE), notice retained in scanner/NOTICE. No Known Agents feed is consumed.
- **RDAP:** User-authorized public registration lookup through [rdap.org bootstrap](https://about.rdap.org/) and HTTPS registry redirects with fixed domain query and matching `ldhName`. Registry path prefixes are supported. Only registration age/status is retained, no contact records; no bulk RDAP dataset or unclear-license threat feeds are redistributed.

## D-006 — Contract signature envelope and transparency log (2026-10-14, Codex)
- **Decision:** CONTRACT.md's static envelope overrides the response schema's live embedded signature shape. Keep `response.signature:null`, sign sorted-key/no-whitespace canonical response with Ed25519, place `generated_at` and `expires_at` (+24h) inside the signed response and copy them into the envelope. Warn and write unsigned when no key exists; reject malformed seeds or mismatch with the committed public JWKS.
- **Alternatives considered:** embedded signatures only, signing the response while leaving expiry unsigned, generating/replacing production keys locally.
- **Why:** Static consumers need the agreed envelope and a cryptographically bound expiry. No key is generated or changed here. The Phase 0 decision already permits the signing key temporarily in the scanner Action; no new secret or account is created.
- **Evidence / links:** CONTRACT.md; [Cloudflare Web Bot Auth integration](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/); [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html). Request headers cover authority, method, path and Signature-Agent using public-JWK thumbprints. This is not verified-bot registration: the origin-root key directory / signed directory response requirements cannot be fulfilled by the current Pages project base alone.
- **Log:** changes.json uses canonical SHA-256 events including prev_hash, newest-first/cap 500. The truncated tail keeps its preceding hash as an anchor into Git history. Index updates preserve domains outside a partial scan; retained safety reasons retain their raw evidence IDs. Atomic file replacement is per file; successful Action commit publishes the batch.

## D-007 — Daily workflow and local managed-network validation (2026-10-14, Codex)
- **Decision:** Scan at 05:17 UTC and workflow_dispatch, serialize runs per ref, use three domain workers, commit public-data without skip-ci directives and explicitly dispatch pages.yml on the same ref with GITHUB_TOKEN (contents/actions write). Pin checkout v4.2.2 and setup-node v4.4.0 to verified tag SHAs. Pages workflow is owned separately and must support workflow_dispatch.
- **Why:** GITHUB_TOKEN-authored pushes do not automatically trigger another push workflow. No main push is performed by this implementation session; work is committed and pushed on feat/scanner.
- **Managed environment:** This workspace resolves all external hosts to synthetic 198.18.0.1; curl confirmed working external HTTPS through that gateway. Strict DNS protection correctly refused it. An explicit `--managed-dns` diagnostic option permits only that synthetic address for domain-name destinations, never literal IPs or other private networks. Production defaults and the Action do not enable it. Local scan records the option.
- **Validation:** Live three-domain attempt on amazon.com, apple.com and shopify.com: RDAP succeeds; exact-origin robots/home redirects stop the site crawl honestly. Unsigned because no local signing key is supplied. Injected HTTP fixtures separately exercise allowed homepage/route crawling, robots denial, challenges, budgets, endpoint poisoning and cryptographic verification without external APIs.

## D-008 — Pin validated DNS addresses and mark robots evidence (2026-10-14, Codex review)
- **Decision:** Replace ordinary fetch transport with a Node HTTPS GET adapter whose DNS lookup callback uses only validated address records; preserve the original hostname for SNI, HTTP Host and certificate verification. Apply the same transport to site and RDAP requests. Streaming compression decoding remains bounded by the existing byte caps. Mark matched robots-rule evidence untrusted as well as length-capped.
- **Why:** Independent code review identified a DNS rebinding race between validation and fetch's second resolution, plus an omitted evidence marker. Regression tests demonstrate a DNS answer changing from public to private cannot change the pinned connection, mixed private/public results never connect, and robots text is marked. Zero dependencies retained.
- **Remaining integration prerequisite:** The reviewed scanner branch does not contain pages.yml. The explicit dispatch step is implemented as requested, but will fail until the separately owned Pages workflow is integrated on the target ref. Do not claim deployment is verified from local tests.

## D-009 — Preserve the workflow when GitHub rejects publication (2026-10-14, Codex)
- **Decision:** Keep the required scan workflow in the local feature commit and report the OAuth `workflow`-scope rejection. Do not omit the workflow or substitute an environment API key to force the push.
- **Why:** GitHub rejected `git push -u origin HEAD` for the workflow file; no SSH fallback is configured. D-007 describes the intended publication target, but remote publication is currently blocked. Reauthorization of the existing GitHub connection with workflow permission is required before retrying.
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
