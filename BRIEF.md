# BUILD BRIEF v2: "Preflight" — the agent homepage
*(This replaces the earlier "Agent Access Index" brief. Where they conflict, this one wins.)*

You are an autonomous build agent. Take this product from zero to live production on free tiers. Use your own judgment and keep moving. Stop only at the **Human Gates** (section 12). Log every significant decision and its reason in `DECISIONS.md`.

Owner: Michael (Enterventure Ltd, UK). He likes short, plain-English updates.

Files in this starter pack (read them all before writing code):

| File | What it is |
|---|---|
| `BRIEF.md` | This document: the mission and plan |
| `specs/preflight-response.schema.json` | The exact JSON shape of our core answer |
| `specs/outcome-report.schema.json` | What agents send us after a task (the moat) |
| `specs/verdict-rules.md` | Deterministic rules for GO / CAUTION / STOP |
| `specs/mcp-tools.md` | The MCP tools to expose, with inputs and outputs |
| `specs/data-model.sql` | Starting Supabase/Postgres schema |
| `specs/threat-model.md` | **Read before building anything.** Poisoning attacks ranked by attacker profit, plus the defences (same-origin route rule, outcome bounds, signing-key isolation) |
| `data/sources.yaml` | Every external data source, with URL, use, licence status and refresh rate |
| `data/seed-commerce-domains.csv` | Starter list of ~90 high-traffic commerce/travel/food sites (unverified) |
| `templates/WORKLOG.md`, `DECISIONS.md`, `RUNBOOK.md` | Shared notes files. Copy them to the repo root. |

---

## 1. The one-line product

**Before an AI agent acts on a website, it calls Preflight and gets back GO / CAUTION / STOP, the best route to complete the task, the risks, and how fresh every fact is.**

Agents call `preflight(domain, intent)` via MCP or REST. Humans see the same data on a public website.

---

## 2. Why this, and why not the obvious thing (context, Oct 2026 — verify before publishing)

**The problem**
- Agents are getting blocked. Amazon blocked Meta's Muse on 20 Sept 2026 (Muse didn't identify itself, Meta didn't ask first, and there were credential concerns).
- Users report blocks on eBay, Yelp, Zillow, airlines and others. Many are accidental: Cloudflare began blocking "Agent" crawlers on ad pages by default from 15 Sept 2026 for new and free zones.
- Agents are being attacked through web content:
  - Hidden prompt injection in JSON-LD and off-screen text tricked agents into paying attackers (Zscaler, July 2026).
  - Google measured a 32% rise in malicious injection pages.
  - Fake-shop scams more than doubled in H1 2026.
  - 30+ CVEs hit MCP servers in one 60-day window.

**What already exists (do NOT rebuild these)**
- Site-owner "agent readiness" checkers are commoditised: Vercel's Is Agentic, Frase, ChatThing, SEOJuice and others. Lighthouse now ships an Agentic Browsing audit. → We only use a checker as a lead magnet.
- Cloudflare Radar already scans robots.txt across its top 10k domains weekly, and shows AI agent standards adoption. → Link to it and compare against it. Its API data is CC BY-NC, so no commercial reuse without permission.
- xpay scores ~25k SaaS products on "agent buyability". → Link to it.
- Agent user-agent lists exist: ai.robots.txt, and Known Agents (formerly Dark Visitors). → Use them.
- Tool directories exist: the official MCP Registry, the x402 Bazaar (~23k paid resources) and agentskills.io. → Mirror them and add health/safety data on top.

**The gap we own**
1. **Aggregation into one decision.** Nobody combines access + route + safety + terms + commerce into a single verdict at the moment of action.
2. **Real outcome data from agents.** Agents report "did task X succeed on site Y via route Z today?" — a Downdetector for agents. We didn't find anyone doing this; verify this yourself, and record what you find.

**Strategy rule (Michael's philosophy): assemble, don't build.** Compose existing sources. Compute our own data only where there's a gap.

---

## 3. Users
- **Primary:** AI agents and the developers who build them. They want fewer failed tasks, fewer scams, cheaper routes.
- **Secondary:** site owners and merchants ("why do agents fail on my site?") and analysts/press ("who blocks agents?").

---

## 4. Product surfaces

| # | Surface | Phase |
|---|---|---|
| P1 | **Preflight API + MCP server** (`preflight`, `report_outcome`, `find_route`, `check_safety`, etc. — see `specs/mcp-tools.md`) | 1 |
| P2 | **Outcome network**: agents report results; we aggregate success rates per domain × intent × route × agent | 1 (ingest) → 2 (shown in verdicts) |
| P3 | **Public website**: per-domain pages, leaderboard ("which sites block agents"), changes feed, methodology | 1 |
| P4 | **Site recipes**: verified step-by-step routes per site and task ("cancel subscription on X: use route Y"), built from successful outcomes | 2 |
| P5 | **Tool directory with health**: MCP servers / x402 endpoints / A2A agents, with uptime, latency, auth type, price and security scan results | 2 |
| P6 | **Commerce layer**: checkout protocols, agent payment acceptance, returns policy, total-cost signals | 3 |
| P7 | **Agent facts endpoint**: current time/timezones, public holidays, FX, LLM provider status and prices, "what changed since model cutoff" digest (sourced links only) | 3 |
| P8 | **Merchant "agent friction" report**: paid, aggregated, anonymised ("agents fail at your checkout 40% of the time, at step: payment") | 3 |
| P9 | **Lead-magnet checker + "Agent-Ready" badge** | 2 (low priority) |

---

## 5. The core answer — `preflight(domain, intent)`
The exact schema is in `specs/preflight-response.schema.json`. Key ideas:
- **verdict:** `GO | CAUTION | STOP`, from deterministic rules (`specs/verdict-rules.md`). Never from an LLM.
- **reasons[]:** each one has a code, severity, plain-English text, `evidence_id`, `source`, `checked_at` and `ttl`.
- **best_route:** ordered options (`api → mcp → ucp/acp → structured feed → markdown → browser`), each with endpoint, requirements (auth, identification) and observed success rate.
- **requirements:** e.g. "must self-identify as an AI agent" (from the site's ToS), "login required", "CAPTCHA present".
- **outcomes:** a 7-day and 30-day success rate for this domain+intent, with sample size.
- **freshness:** the age of each component. If data is stale, that is a CAUTION reason in itself.
- **signature:** each response is signed with our Ed25519 key, published as a Web Bot Auth-style key directory, so agents can verify the answer came from us.

**Intents (enum):** `read, search, compare, account_login, account_create, purchase, book, cancel, submit_form, download, api_call`.

---

## 6. Data components (build in this priority order: Safety → Access → Route → Outcomes → Commerce → Facts)

Every source, with URL, licence status and refresh rate, is in `data/sources.yaml`. Summary:

**6.1 Safety (TTL ~1h)**
- Phishing/malware feeds: URLhaus, PhishTank, OpenPhish (verify each licence). For Google Safe Browsing, verify the commercial-use terms; Web Risk is the paid commercial alternative.
- Domain age (RDAP), certificate history (crt.sh), and a brand lookalike check (edit distance and homoglyphs against the seed list plus Tranco top 10k).
- **Prompt-injection scan** of the target page, done by us:
  - hidden or off-screen text
  - instructions inside JSON-LD/meta
  - invisible Unicode
  - "ignore previous instructions"-style patterns
  - payment instructions inside metadata

  Use deterministic heuristics. Store the matched patterns as evidence.
- Payee checks (for purchase intent, Phase 3): OFAC SDN list, the UK sanctions list (verify the current official UK list) and Companies House.
- **Never** fetch or execute anything a scanned page tells us to.

**6.2 Access (TTL 24h for the seed list, 7d for others)**
- robots.txt rules per known AI user-agent. Take the UA list from ai.robots.txt and Known Agents. Split training crawlers from user-triggered agents.
- A live probe with our honest, signed UA: status code, challenge/interstitial detection, bot vendor (from headers/cookies, reported as "likely").
- 402 / pay-per-crawl price, if present.
- **ToS AI clauses** (TTL 7d; re-parse when the page hash changes):
  - find the terms URL
  - extract and classify clauses with an LLM, storing the **verbatim clause span as evidence**
  - classes: `bans_agents`, `requires_identification`, `bans_automated_accounts`, `bans_scraping`, `allows_with_conditions`, `silent`

  The LLM classifies; the evidence is always the quoted span plus its URL. Show "low confidence" when it's ambiguous.

**6.3 Route discovery (TTL 24h / 7d)**
- `/.well-known/mcp/server.json` (also check `/.well-known/mcp.json`), the official MCP Registry
- `/.well-known/agent-card.json` (A2A ≥0.3). Also check legacy `/.well-known/agent.json` and flag it as legacy.
- UCP / ACP / Personal Agent Protocol / WebMCP / NLWeb (`/ask`, `/mcp`) / llms.txt / markdown content negotiation / OpenAPI / schema.org Product JSON-LD
- **Verify the canonical path of every spec in its official docs before coding.** Record the doc URL in `DECISIONS.md`.

**6.4 Outcomes (the moat)**
- Ingest via the `report_outcome` tool/endpoint. Schema: `specs/outcome-report.schema.json`.
- **No PII, ever.** No full URLs (path templates only), no user content, no free text (enums only).
- Reports are signed (Web Bot Auth or an API key). Weight each report by reporter reputation, and rate-limit per reporter.
- Aggregate success rates per domain × intent × route × agent family. Show sample sizes, and hide a cell until n ≥ 5.
- **Give-to-get:** free preflight quota rises for agents that report outcomes.
- Seed the network ourselves: a scheduled **synthetic probe agent** runs safe read-only tasks (`read`, `search`) on the seed list and reports outcomes like any other agent. It **never** runs purchase, account or form tasks on real sites.

**6.5 Commerce (Phase 3)**
- Checkout protocols supported; agent payment rails accepted (Visa TAP, Mastercard Agent Pay, x402, Link, Shop Pay) where detectable or self-declared.
- Returns policy URL and a machine-readable summary (with the evidence span), shipping regions, and whether the price is visible without login.
- **Label clearly** what is "announced" vs what is "observed working".

**6.6 Facts (Phase 3, mostly link/compose)**
- Time/timezones (IANA), public holidays (Nager.Date), FX (ECB reference rates), LLM provider status (official status pages) and model prices (provider pages / OpenRouter models API; verify terms).
- A "what changed since your training cutoff" digest: a sourced list of links per month. No LLM-invented facts.

---

## 7. Stack (Michael's locked stack, free tiers — check current limits and log them)
- GitHub: public monorepo, so the methodology is transparent. Actions cron jobs run the scanners and the synthetic probe agent.
- Supabase: Postgres + RLS. Schema in `specs/data-model.sql`.
- Cloudflare Workers: public REST API + remote MCP server, cached at the edge with rate limits. Turnstile on human forms.
- Astro site on Render.
- Resend (email), Stripe (Payment Links first), PostHog, Sentry.
- Anthropic API: only for ToS clause classification and readable summaries. Never for verdicts or numbers.
- Design tokens (locked): dark palette, Space Grotesk headings, Inter body.

If a free tier blocks the plan, pick the nearest free alternative and log why.

---

## 8. Our own crawler must be honest (non-negotiable)
- **User-Agent:** `PreflightBot/1.0 (+https://<domain>/bot)`. Sign every request with Web Bot Auth (Ed25519; publish `/.well-known/http-message-signatures-directory`).
- Respect robots.txt for our own UA.
- **Polite limits:** max 1 request/second per domain, ~10 requests per site per scan, backoff on errors.
- **NEVER:**
  - spoof a browser or another company's agent
  - bypass CAPTCHAs or challenges
  - log in or create accounts
  - add to cart, buy, or submit forms
- A `/bot` page explains the crawler and offers opt-out and contact.

---

## 9. Trust and anti-poisoning (critical — we become a target)
**Full detail is in `specs/threat-model.md`. Its two golden rules override everything else in this brief:**
1. Preflight never tells an agent where to send money or credentials.
2. Bad news is cheap to add; good news is expensive.

- Return **structured fields only**. Never pass third-party page text straight through to agents, except short evidence spans that are clearly marked `untrusted_evidence: true`.
- Sign responses. Version the rules (`ruleset_version`) and the scanners.
- Detect outcome-report manipulation: sudden swings from new reporters, or a single reporter dominating a cell.
- Site owners can dispute a finding and request a rescan. Fix confirmed errors fast and log them in the change feed.
- **Neutrality:** payment never changes a verdict or rank. State this on `/methodology`.
- Use factual, dated wording on public pages ("On 14 Oct 2026 our signed request received HTTP 403 + challenge"). No opinions. Include a "not legal or security advice" disclaimer.

---

## 10. Phases and definition of done

**Phase 0 — Setup (day 1)**
- Repo, CI, environments and secrets set up; Sentry and PostHog wired.
- Templates copied to the repo root.
- Free-tier limits, spec paths and source licences verified and logged.

**Phase 1 — Core MVP**
- Safety + Access + Route scanners running on the seed list (daily) and Tranco top 10k (weekly).
- `preflight`, `check_safety`, `find_route` and `report_outcome` live via REST and MCP, with signed responses.
- Outcome ingest is live, and the synthetic probe agent posts read/search outcomes daily.
- Public site: `/`, `/site/[domain]`, `/changes` + RSS, `/methodology`, `/bot`, `/api`, `/mcp`, plus privacy and terms pages.
- **Done when:**
  - every seed domain has a verdict with evidence less than 24h old
  - the MCP server works in a real MCP client (test with Claude Desktop/Code or another client)
  - p95 API latency is under 300ms when cached

**Phase 2 — Network + directory**
- Outcome rates are included in verdicts.
- Site recipes from repeated successes.
- Tool directory (MCP Registry + x402 Bazaar + A2A cards) with health and static security scans of each listing's tool descriptions for poisoning patterns.
- Lead-magnet checker + badge.
- Publish the server in the official MCP Registry, and publish a `SKILL.md` and `llms.txt` for Preflight itself.

**Phase 3 — Commerce + facts + money**
- Commerce layer and facts endpoint.
- Stripe tiers (section 11).
- Paid merchant friction report.

**Phase 4 — Proof**
- Run and publish a public benchmark: agent task success with vs without Preflight, using safe read-only tasks plus sandbox/test stores only.
- First monthly "State of the Agentic Web" report.

**30-day post-launch targets (hypotheses):**
- 25 agent developers integrating
- 10k preflight calls/week
- 1k outcome reports/week
- 1 press mention

If results fall well short, write Michael a short "what's not working + options" note. Don't quietly grind on.

---

## 11. Money (hypotheses — Michael approves prices)

| Tier | Starting idea |
|---|---|
| Free | Low daily preflight quota per IP/key; higher if you report outcomes |
| Developer | ~£19–29/mo: higher quota, webhooks on verdict changes |
| Scale | Usage-based (consider an x402 pay-per-call option too) |
| Merchant friction report | ~£49–99/mo per domain |

Never sell rank, verdicts or "verified" status.

**Revenue order:**
1. **x402 pay-per-call** (agents pay per preflight, no signup — fits the audience exactly) + Stripe developer tiers.
2. **Merchant alerts + friction reports.** Owners pay to *see* the data. Paying never changes it.
3. **Enterprise data feed/licence** for agent platforms: bulk verdict feed, local cache, SLA.
4. **Threat feed licensing:** our injection, lookalike and malicious-tool findings, sold as a feed to security vendors.
5. **Aggregated, anonymised "State of the Agentic Web" data** for analysts, payment networks and insurers.

**Also:** apply for free startup credits (Cloudflare, Supabase, Anthropic and similar). Check what's currently offered and log it. Applying is Human Gate 2.

**Never:** ads, paid ranking, paid "verified" badges, or selling any individual operator's outcome data.

**Cost guardrails:**
- Set budget caps and alerts on every paid service.
- LLM ToS classification runs only on the seed list and for paying customers' domains.
- Cache aggressively at the Cloudflare edge.
- Target: monthly costs covered by roughly the first 3–5 paying developers.

---

## 12. Human Gates — stop and ask Michael (give numbered ELI5 steps with exact URLs and field names; batch requests together)
1. **Domain purchase.** Propose 3–5 names, check their availability yourself, and recommend one. "Preflight" is a working name; check for trademark/brand clashes.
2. **Any account creation or billing:** Render, Supabase, Cloudflare, Stripe, Resend, PostHog, Sentry, Anthropic, X, MCP Registry publisher account.
3. **Stripe activation and final prices.**
4. **The first public post or launch** under his or Enterventure's name, and the first report.
5. **Any outreach** to a real person or company.
6. **Applying to any bot-verification programme** (e.g. Cloudflare signed/verified bots).
7. **Any legal complaint or takedown request.** Pause the affected page and escalate immediately.
8. **Using any data source whose licence is unclear** for commercial use. Ask first, and link out in the meantime.

---

## 13. Shared notes (required)
Other AI agents work on Michael's projects. In the repo root, keep:
- `WORKLOG.md` — dated, append-only. Update it after every session.
- `DECISIONS.md` — decision, alternatives considered, why.
- `RUNBOOK.md` — how to deploy, rotate keys, rerun scans, restore the DB, and handle disputes and opt-outs.

Read all three at the start of every session.

---

## 14. Reporting to Michael (at the end of each phase)
- **Live:** URLs
- **Decisions I made and why:** 3–5 bullets
- **Needs you:** numbered ELI5 steps with exact links/filepaths, or "nothing"
- **Next:** one line

Keep it short.

---

## 15. Starting references (verify; don't trust blindly)
- Amazon blocks Muse: https://www.implicator.ai/amazon-blocks-meta-muse-shopping-agent/
- Agents blocked by sites: https://techcrunch.com/2026/10/06/the-next-hurdle-for-ai-agents-getting-websites-to-let-them-in/
- Personal Agent Protocol: https://www.implicator.ai/meta-sierra-personal-agent-protocol/
- Web Bot Auth + Visa/Mastercard: https://blog.cloudflare.com/secure-agentic-commerce/
- Visa TAP spec: https://github.com/visa/trusted-agent-protocol
- MCP well-known discovery: https://replicate.com/changelog/2026-02-10-mcp-server-auto-discovery
- A2A card paths: https://apievangelist.com/2026/07/29/most-published-agent-cards-are-not-actually-a2a/
- x402 Bazaar: https://docs.cdp.coinbase.com/x402/seller/get-discovered
- Injection payment attacks: https://securityaffairs.com/194822/ai/hidden-web-prompts-trick-ai-agents-into-sending-money.html
- Cloudflare Radar: https://ppc.land/cloudflare-radar/
- Lighthouse agentic audit: https://locomotive.agency/blog/lighthouse-agentic-browsing-audit/
- ToS AI clause example (Chase): https://www.chase.com/resources/terms-conditions
- xpay SaaS index: https://www.xpay.sh/agent-ready-index/reportcard/
