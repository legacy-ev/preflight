# What agent homepages still lack: 20 priorities

Research cutoff: **2026-10-16**. Web research across GitHub issues, Hacker News, blogs, arXiv, and publicly indexed X material. Ranking is a product judgment, not a survey or measured market size.

**Recommendation:** build a small library of machine-readable action contracts, reference data, and locally executable checks. The strongest unmet needs concern evidence of effects, safe recovery, permissions, authentication, and complete observations. Public facts alone cannot supply a user's current identity, authority, or transaction state.

## Scope and meaning of “missing”

Excluded throughout: site verdicts/readiness scores, LLM prices, ECB FX, UK holidays, timezones, AI user-agent lists, MCP registry health, endoflife, OSV, Wikidata, and a general tooling directory. Existing `codex.md` was read for context; this report adds recent demand evidence and a more explicit distinction between public resources and local integration.

The baseline is the user's supplied inventory plus a small public comparison sample. [forAgents.dev](https://github.com/reflectt/foragents.dev) already advertises news, skills, collections, Markdown/JSON and agent discovery. [My Weird Prompts' agent homepage](https://www.myweirdprompts.com/agents/) exposes its own content through skills, MCP and JSON. [WebMCP Hub](https://www.webmcp-hub.com/) already offers domain-to-tool configuration lookup. Consequently, “another discovery directory” is not a gap. The opportunities below are missing **as dependable, reusable homepage resources or contracts in this sample**, not claims that nobody has implemented them anywhere.

Priorities favour frequency, cost of failure, direct developer evidence, and usefulness to many web tasks. Strong evidence establishes a problem, not automatically demand for a homepage. Where the homepage delivery mechanism is my inference, it is described as a proposed resource.

**Effort:** S = roughly 1–3 engineer-days for a bounded initial resource; M = 1–3 engineer-weeks; L = 4+ weeks or substantial runtime/provider integration. Estimates assume an existing host/API and exclude ongoing curation, security review and universal site coverage.

**Source labels:** **Data** = reusable public reference data; **Code** = anonymous-download, commercially usable self-hosted building block; **Local** = facts only the user's runtime/origin can provide. An open library is not an existing hosted data service. No-account refers to obtaining the source, not obtaining authenticated target data. Licence quotations are collected once in the ledger and referenced from each item; retain the full applicable notices. No commercial reuse grant is inferred from mere public readability.

## Prioritised top 20

### 1. Outcome verification contracts and action receipts — M

**Item:** a schema and executable examples for `attempted / committed / rejected / unknown`, receipt ID, independent read-back, and the evidence needed before reporting success. Include checks for forms, orders, messages and downloads.

**Why:** [Browser Use #5957, 30 September 2026](https://github.com/browser-use/browser-use/issues/5957) explicitly asks for real-world outcome-verification guidance. [#6031, 10–15 October](https://github.com/browser-use/browser-use/issues/6031) supplies false-success fixtures and discussion showing that an action's outcome, method and disclosure need separate assessment. A tool returning successfully is insufficient evidence of the intended external effect.

**Free source / licence:** **Code:** [Playwright](https://github.com/microsoft/playwright), Apache-2.0, [L1](#licence-ledger), can implement response and state assertions locally. **Local:** no qualifying public source for a user's actual order/message receipt. The public opportunity is the contract and test pack; runtime adapters supply private receipts. Do not assume issue attachments have the repository's code licence.

### 2. Retry and reconciliation contracts for writes — M

**Item:** per-operation idempotency support, key scope/expiry, reconciliation endpoint, pending-state window, and retry policy. An ambiguous timeout must remain `unknown` until reconciled.

**Why:** [LIMBO, arXiv, 24 September 2026](https://arxiv.org/abs/2609.29095) studies duplicate effects under lost acknowledgements, delayed commits and redelivery. It reports that verification alone cannot ensure exactly-once effects without suitable contract assumptions. [Tian Pan, 23 April 2026](https://tianpan.co/blog/2026/04/23/agent-idempotency-orchestration-contract) independently frames idempotency as an orchestration contract. This is more actionable than a generic “retry on error” tip.

**Free source / licence:** **Local:** no universal public dataset of endpoint idempotency guarantees was established. Origin API contracts and a local intent ledger are required; their content licences vary. [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html) supplies method semantics, not a commercial licence to vendor documentation or a guarantee that a POST is safe to repeat. No qualifying dataset licence to quote.

### 3. Normalised pre-action intent and policy-check schema — M

**Item:** `action_id`, action kind, effective origin/URL, account/tenant, proposed disclosure, amount, and user-authority reference; deterministic allow/deny before dispatch.

**Why:** [Browser Use #5971, 2 October 2026](https://github.com/browser-use/browser-use/issues/5971) directly requests a stable pending-action payload for external policy adapters, covering navigation and form submission. This is evidence of a specific integration need, not just general security anxiety. A homepage could publish a common schema, examples and conformance fixtures.

**Free source / licence:** **Code:** [Open Policy Agent](https://github.com/open-policy-agent/opa), Apache-2.0, [L2](#licence-ledger), supplies a self-hosted policy engine. **Local:** permissions, budgets and identity must come from the user/runtime. OPA does not supply a universal agent-action policy or enforce a browser hook by itself.

### 4. Human handoff and resume contract for login, MFA and challenges — L

**Item:** typed reasons for intervention, same-session takeover, expiry, resume token, and a post-handoff check of identity and page state.

**Why:** the [BrowserBook HN discussion](https://news.ycombinator.com/item?id=46232434) contains direct questions about 2FA/CAPTCHA support. [Browser Use #4709, 20 April 2026](https://github.com/browser-use/browser-use/issues/4709) asks to operate inside users' own Chrome instances/profiles. Together these show why a remote agent session cannot simply assume it has the user's logged-in context.

**Free source / licence:** **Code:** [Browser Use](https://github.com/browser-use/browser-use), MIT, [L3](#licence-ledger), provides an inspectable browser-session starting point; the interoperable handoff contract would still need building. **Local:** no public source for live MFA/session state. No qualifying free public human-intervention service established. The resource should support legitimate takeover, not publish challenge-bypass recipes.

### 5. Exact-value bindings and disclosure checks — M

**Item:** byte-preserving aliases for long text/IDs so the model does not retype them; separate public task variables, private fields and secrets; scoped autofill and a disclosure preview before upload/submission.

**Why:** [Browser Use #5936, 28 September 2026](https://github.com/browser-use/browser-use/issues/5936) requests non-secret run variables because models introduce typos/truncation into long IDs and text, while secret bindings impose unsuitable limits. [Playwright's authentication guidance](https://playwright.dev/docs/auth) warns that saved auth state can contain impersonation-capable cookies and headers. The proposed addition combines exact input binding with explicit data handling.

**Free source / licence:** **Code:** [Playwright](https://github.com/microsoft/playwright), Apache-2.0, [L1](#licence-ledger), for deterministic form filling; [Microsoft Presidio](https://github.com/microsoft/presidio), MIT, [L4](#licence-ledger), for local PII detection/redaction. Neither supplies the proposed cross-runtime binding contract. Presidio is not a credential broker or complete secret detector; optional model assets have separate terms. **Local:** values, classification and autofill permissions are private.

### 6. Prompt-injection test corpus with trust-boundary examples — M

**Item:** downloadable attack/benign fixtures, expected policy outcomes, and examples distinguishing page evidence from user instructions. Include malicious tool results, pages and persistent memory.

**Why:** [WASP, arXiv, revised 16 May 2025](https://arxiv.org/abs/2504.18575) demonstrates realistic end-to-end browser-agent injection risks; it is older foundational evidence. [Anthropic's 2026 NIST submission](https://www-cdn.anthropic.com/43ec7e770925deabc3f0bc1dbf0133769fd03812.pdf) discusses injection, memory poisoning and tool supply-chain risk. A reproducible regression resource is more defensible than another “safe website” verdict.

**Free source / licence:** **Code/test environment:** [AgentDojo](https://github.com/ethz-spylab/agentdojo), MIT, [L5](#licence-ledger). Download without an account; running model-based evaluations may incur inference costs. Curate only covered files and respect separately licensed dependencies. A clean test result cannot certify arbitrary pages as injection-free.

### 7. Origin-bound operation contracts and interface selection — M

**Item:** for a requested operation, return publisher-controlled API/WebMCP/browser options, schema revision, auth requirements, side effects and fallback conditions. Bind claims to the origin and distinguish publisher tools from community adapters.

**Why:** [Chrome's WebMCP preview](https://developer.chrome.com/blog/webmcp-epp) presents structured site interactions. The [PA-bench HN discussion](https://news.ycombinator.com/item?id=47157160) questions expensive browser use where direct tools suffice. Existing [WebMCP Hub](https://www.webmcp-hub.com/) already handles configuration discovery; the remaining opportunity is validated operation semantics and provenance, not listing more tools.

**Free source / licence:** **Code/examples:** [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools), Apache-2.0, [L6](#licence-ledger). **Local/origin:** live tool registrations and publisher API descriptions. Their content/data licences remain separate; no universally licensed origin-contract database established.

### 8. Rate-limit and backoff interpreter — S

**Item:** parse retry instructions, distinguish 429/503/auth failures, track per-origin budget, and return `next_attempt_at`, maximum attempts and escalation reason. Keep retry safety from #2 attached.

**Why:** [ReliabilityBench, arXiv, 3 January 2026](https://arxiv.org/abs/2601.06112) evaluates tool failures and finds rate limiting especially damaging in its tested configurations. [Browser Use #4132, 20 February](https://github.com/browser-use/browser-use/issues/4132) reports repeated provider-500 retries despite apparent task completion. A bounded interpreter can prevent futile loops without adding another price feed.

**Free source / licence:** **Local:** origin response headers/status and local counters; no public source for an account's remaining quota. [HTTP `Retry-After` semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) are the reference. No general commercial redistribution licence for origin responses established; publish your parser and synthetic examples, not copied vendor payloads.

### 9. Extraction completeness and evidence envelope — S

**Item:** every result carries matched/returned counts, pagination state, truncation, omitted sections, source URL, exact evidence spans and an explicit `complete` flag.

**Why:** [Browser Use #5947, 30 September 2026](https://github.com/browser-use/browser-use/issues/5947) reports that element/search results are lost while a count-only summary reaches the model. The agent then repeats work. This supports a general observation-contract gap: “found four” must not masquerade as the four actual records.

**Free source / licence:** **Code:** [Browser Use](https://github.com/browser-use/browser-use), MIT, [L3](#licence-ledger), provides extraction/result machinery to adapt. **Local:** completeness depends on the real browser and collector, including pagination and virtualisation. No public dataset can certify that the user's current extraction is exhaustive; site content keeps its own rights.

### 10. Representation negotiation and measured context budget — S

**Item:** try publisher Markdown/JSON where supported, retain canonical URL and response type, estimate input size, and expose omissions and the route to full content.

**Why:** [Cloudflare's Markdown for Agents announcement, February 2026](https://blog.cloudflare.com/markdown-for-agents/) addresses HTML overhead. [Playwright #41395, June–July 2026](https://github.com/microsoft/playwright/issues/41395) discusses snapshot bloat and was closed as completed on 3 July. Thus compression itself is already available; the remaining homepage resource is a portable negotiation/budget contract with explicit loss accounting.

**Free source / licence:** **Code:** [Mozilla Readability](https://github.com/mozilla/readability), Apache-2.0, [L7](#licence-ledger), supports local article extraction; it is unsuitable as the only view for interactive forms. Publisher-negotiated Markdown can be anonymously readable but is not automatically licensed for commercial republication. Cloudflare's hosted conversion service is not counted as an unconditional free/no-account source.

### 11. Snapshot validity and browser-state binding — M

**Item:** observation IDs bound to tab, frame, origin, navigation epoch, viewport and coordinate scale; stale-reference rejection and resnapshot rules.

**Why:** [Browser Use #4136, 20 February 2026](https://github.com/browser-use/browser-use/issues/4136) reports failure to notice an automatically opened tab. [#5988, 3 October](https://github.com/browser-use/browser-use/issues/5988) reports CDP indexing and device-pixel-ratio scaling problems. These are concrete reasons an agent's apparent target can differ from the browser's actual target.

**Free source / licence:** **Code:** [Playwright](https://github.com/microsoft/playwright), Apache-2.0, [L1](#licence-ledger), supplies browser observations; its [MCP snapshot documentation](https://github.com/microsoft/playwright.dev/blob/main/mcp/snapshots.mdx) already documents reference lifetime. **Local:** live snapshot binding has no public feed. The gap is a cross-runtime envelope, not inventing stable page references that already exist.

### 12. Tool/schema dialect compatibility fixtures — S

**Item:** a downloadable compatibility matrix and tests for nullable unions, recursive models, required fields, enums, structured errors and provider transformations. Report explicit downgrade instead of silently returning prose.

**Why:** [Browser Use #5904, 25 September 2026](https://github.com/browser-use/browser-use/issues/5904) reports JSON Schema type-array failures causing free-text fallback. The [October issue listing](https://github.com/browser-use/browser-use/issues) also includes recursion and required-field problems. These failures concern the execution contract, independently of model price or tool discovery.

**Free source / licence:** **Test data/code:** [JSON Schema Test Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite), MIT, [L8](#licence-ledger), is anonymously downloadable and commercially reusable. It tests JSON Schema behaviour, not every model provider's supported subset; add locally authored provider-specific fixtures and version pins.

### 13. Checkpoint, interruption and resume manifest — M

**Item:** completed/pending steps, unresolved effects, artifact locations, session requirements and a safe resume point. Separate an agent timeout from cancellation by the user.

**Why:** [Browser Use #5977, 2 October 2026](https://github.com/browser-use/browser-use/issues/5977) reports unexpected cancellation arising from a parent timeout. [KNOWS, arXiv, 24 September](https://arxiv.org/abs/2609.30604) finds substantial difficulty completing long browser workflows that produce artifacts. Together these motivate preserving usable progress across interruption; the particular manifest is a proposed design.

**Free source / licence:** **Code:** [Browser Use](https://github.com/browser-use/browser-use), MIT, [L3](#licence-ledger), is an inspectable host for an adapter. **Local:** no public progress source. Saved page state alone is not proof that a write completed; reuse #1–2 before resuming. Auth state and checkpoint contents must remain private.

### 14. Portable execution trace and reproducible failure bundle — M

**Item:** redacted action/observation events, network outcomes, runtime versions, policy decisions and synthetic fixtures, downloadable as a consistent bundle.

**Why:** the [BrowserBook HN launch discussion](https://news.ycombinator.com/item?id=46232434) describes drift, difficult debugging, expensive whole-run retries and requests for portable execution. That supports demand for records developers can inspect and reproduce. A homepage can publish a bundle specification and sample cases instead of collecting private production traces.

**Free source / licence:** **Code:** [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer), backed by [Apache-2.0 Playwright](https://raw.githubusercontent.com/microsoft/playwright/main/LICENSE), [L1](#licence-ledger). Existing traces already solve part of the problem; the gap is consistent inclusion of agent intent, policy and verified effects. Page/network content inside a trace does not acquire the code licence.

### 15. URL identity and redirect-boundary utility — S

**Item:** normalised scheme/host/port, registrable domain, Unicode/Punycode display, redirect chain and explicit cross-origin changes before sensitive submission.

**Why:** [Cloudflare's 15 October 2026 discovery-pilot explanation](https://blog.cloudflare.com/cloudflare-openai-discovery-agentic-web/) distinguishes discovery signals from permission to access a page. [WASP](https://arxiv.org/abs/2504.18575) supplies the adversarial-browser context. The proposed utility helps bind decisions to an exact destination; this is an engineering inference, not evidence of a directly requested PSL homepage endpoint. It is a deterministic URL fact service, not a site verdict.

**Free source / licence:** **Data:** [Public Suffix List text download](https://publicsuffix.org/list/public_suffix_list.dat), MPL-2.0, [L9](#licence-ledger). Use a proper URL parser too. PSL boundaries do not establish ownership or safety, and registrable-domain equality must not substitute for exact-origin checks. Modified covered files carry MPL source-sharing obligations when distributed.

### 16. Purpose-specific access and content-use declarations — M

**Item:** return the raw publisher rules, retrieval timestamp and parsed distinctions between crawl access, inference input, search, training and declared reuse licence. Return `unknown` rather than manufacture legal clearance.

**Why:** [Cloudflare's April 2026 Agent Readiness post](https://blog.cloudflare.com/agent-readiness/) describes distinct content-use signals and access controls. Its [15 October discovery-pilot post](https://blog.cloudflare.com/cloudflare-openai-discovery-agentic-web/) stresses that discovery signals do not grant access permission. A score or AI-UA list cannot express those task-specific distinctions.

**Free source / licence:** **Code:** [Google's robots.txt parser](https://github.com/google/robotstxt), Apache-2.0, [L10](#licence-ledger), covers robots parsing, not the whole proposed policy layer. **Origin data:** public robots files, headers and licence links often need no account, but their reuse terms vary. No global commercially licensed permissions database established. Robots allowance is not copyright permission or user authorization.

### 17. Freshness, revision and conflicting-evidence utility — S

**Item:** source/event/retrieval dates separately, ETag/revision, expiry, conditional revalidation and an explicit conflict set when sources disagree.

**Why:** [AgentWebBench, arXiv, 13 April 2026](https://arxiv.org/abs/2604.10938) identifies retrieval and evidence-quality limitations in site-agent interactions. [HTTP caching](https://www.rfc-editor.org/rfc/rfc9111.html) supplies concrete freshness mechanisms. The need for a claim-level envelope is an inference: transport freshness is useful but cannot certify that a factual claim is current or correct.

**Free source / licence:** **Local/origin:** response headers, publisher timestamps and collector observations. No universal public claim-freshness source or blanket commercial content licence established. Publish an original normaliser/schema and synthetic fixtures. Preserve source references and avoid redistributing entire unlicensed documents merely to show provenance.

### 18. Component-level service incidents and maintenance — S

**Item:** official target/browser-provider/auth-provider incident windows, affected components, update age and source links, available before repeated troubleshooting.

**Why:** [Browser Use #4132](https://github.com/browser-use/browser-use/issues/4132) illustrates operational 500/retry confusion. [ReliabilityBench](https://arxiv.org/abs/2601.06112) also tests tool/API faults. These support incident-aware troubleshooting; they do not prove that a particular reported error was caused by a public outage. This extends beyond the excluded MCP registry health resource.

**Free source / licence:** **Public operational feed, rights unresolved:** [GitHub Status summary JSON](https://www.githubstatus.com/api/v2/summary.json) was retrieved anonymously during this research. No explicit commercial redistribution grant established, so it does **not** pass the full qualifying-source test. Link to official status pages or obtain permission; do not rebrand anonymous availability as an open-data licence. No licence quotation available.

### 19. Browser/runtime feature compatibility preflight — S

**Item:** compare the actual browser/channel/version and enabled capabilities against required APIs, frames, downloads, accessibility and WebMCP features. Return unsupported/experimental explicitly.

**Why:** [Chrome's WebMCP preview](https://developer.chrome.com/blog/webmcp-epp) establishes a capability with version/access conditions. [UseMyResearch's September 2026 developer account](https://devpost.com/software/usemyresearch-com-your-research-connected-to-your-agent) reports resolving a WebMCP cancellation problem by moving to Chrome Beta 153. A protocol name alone is insufficient to know that a run can use it.

**Free source / licence:** **Data:** [MDN browser-compat-data](https://github.com/mdn/browser-compat-data), CC0-1.0, [L11](#licence-ledger); **tests:** [Web Platform Tests](https://github.com/web-platform-tests/wpt), BSD-3-Clause, [L12](#licence-ledger). New APIs may have coverage gaps: feature-detect locally and test the particular runtime. This is capability compatibility, not an end-of-life feed.

### 20. Payment-required response interpreter and spend preview — M

**Item:** parse payment challenges into payee, asset/network, amount, expiry, resource scope and settlement evidence; produce a preview bound to the user's authorized budget before any signature/payment.

**Why:** [Cloudflare, 6 August 2026](https://blog.cloudflare.com/the-agentic-internet/) includes payments in its agentic-web architecture. [x402's reference implementation](https://github.com/x402-foundation/x402) supplies an actual HTTP payment protocol. The opportunity is consistent transaction understanding and evidence, rather than another LLM-price table. Rank is lower because payment is task-specific and implementation does not establish user demand at the scale of the earlier issues.

**Free source / licence:** **Code/spec implementation:** [x402](https://github.com/x402-foundation/x402), Apache-2.0, [L13](#licence-ledger). Anonymous download and commercial self-hosting are available. Live paid resources, settlement, wallets and facilitators are **not** thereby free or accountless. Refunds and merchant reliability need separate evidence; the proposed initial resource only interprets/previews a supported challenge.

## Licence ledger

The quotations below establish the source grants for the named **code/data**, not for third-party content processed by them. Apache projects require licence/notice retention and marking modifications; MIT projects require retention of copyright/permission notices. Dependencies and bundled third-party assets need their own checks.

| ID | Source and exact licence quotation | Commercial-use finding |
|---|---|---|
| L1 | [Playwright licence](https://raw.githubusercontent.com/microsoft/playwright/main/LICENSE): “use, offer to sell, sell, import, and otherwise transfer the Work” | Apache-2.0; commercially usable, subject to its conditions. |
| L2 | [OPA licence](https://raw.githubusercontent.com/open-policy-agent/opa/main/LICENSE): “worldwide, non-exclusive, no-charge, royalty-free, irrevocable” | Apache-2.0; commercially usable code. |
| L3 | [Browser Use licence](https://raw.githubusercontent.com/browser-use/browser-use/main/LICENSE): “to use, copy, modify, merge, publish, distribute, sublicense, and/or sell” | MIT; applies to covered software/documentation, not automatically issue attachments or target content. |
| L4 | [Presidio licence](https://raw.githubusercontent.com/microsoft/presidio/main/LICENSE): “to use, copy, modify, merge, publish, distribute, sublicense, and/or sell” | MIT; optional models and target data separate. |
| L5 | [AgentDojo licence](https://github.com/ethz-spylab/agentdojo/blob/main/LICENSE): “to use, copy, modify, merge, publish, distribute, sublicense, and/or sell” | MIT; evaluations still require compute/model access. |
| L6 | [WebMCP tools licence](https://raw.githubusercontent.com/GoogleChromeLabs/webmcp-tools/main/LICENSE): “use, offer to sell, sell, import, and otherwise transfer the Work” | Apache-2.0; no licence inferred for discovered websites. |
| L7 | [Readability licence](https://raw.githubusercontent.com/mozilla/readability/main/LICENSE.md): “worldwide, non-exclusive, no-charge, royalty-free, irrevocable” | Apache-2.0; extracted articles keep their own rights. |
| L8 | [JSON Schema Test Suite licence](https://raw.githubusercontent.com/json-schema-org/JSON-Schema-Test-Suite/main/LICENSE): “to use, copy, modify, merge, publish, distribute, sublicense, and/or sell” | MIT; reusable covered tests. |
| L9 | [PSL licence](https://raw.githubusercontent.com/publicsuffix/list/main/LICENSE): “use, reproduce, make available, modify, display, perform, distribute, and otherwise exploit its Contributions” | MPL-2.0; commercial use allowed with applicable source/notice obligations. |
| L10 | [Google robots parser licence](https://raw.githubusercontent.com/google/robotstxt/master/LICENSE): “use, offer to sell, sell, import, and otherwise transfer the Work” | Apache-2.0; parser licence does not license robots content. |
| L11 | [MDN compatibility-data licence](https://raw.githubusercontent.com/mdn/browser-compat-data/main/LICENSE): “for any purpose whatsoever, including without limitation commercial, advertising or promotional purposes” | CC0-1.0; compatible with commercial reuse, subject to stated limitations on other rights. |
| L12 | [WPT licence](https://raw.githubusercontent.com/web-platform-tests/wpt/master/LICENSE.md): “Redistribution and use in source and binary forms, with or without modification, are permitted” | BSD-3-Clause; retain notices, no endorsement. Check file-specific exceptions/assets. |
| L13 | [x402 Foundation licence](https://raw.githubusercontent.com/x402-foundation/x402/main/LICENSE): “use, offer to sell, sell, import, and otherwise transfer the Work” | Apache-2.0; payment-network/service terms remain separate. |

## Evidence coverage, uncertainty and next build choice

**Recent GitHub evidence is strongest:** specific issues dated 25 September–15 October 2026 anchor outcomes, policy hooks, schema loss, missing observations and runtime failures. Individual reports can be version-specific or subsequently fixed; they establish a recurring class of need, not that the current release retains each bug. Some requests also promote the author's product or integration (#5957 and #5971); the concrete reproductions and other evidence matter more than those endorsements. The completed Playwright compression work is explicitly treated as existing functionality.

**HN:** the BrowserBook discussion supplies direct builder/user accounts, including portability, debugging and authentication needs; the PA-bench discussion supplies API-versus-browser objections. Some HN pages expose relative dates; no exact publication date has been invented from a crawl timestamp. Vendor launch claims are qualitative evidence, not independently validated performance measurements.

**Blogs/arXiv:** 2026 primary project/vendor publications and recent abstracts supplement the issue evidence. Preprints are author-reported research with benchmark-specific results, not production prevalence estimates. WASP is deliberately labelled older foundational evidence.

**X coverage is limited and lower confidence:** searches found [@ChromiumDev's mirrored timeline](https://ww.twstalker.com/ChromiumDev), including a recent @andreban post about vague versus verbose WebMCP definitions. The mirror's relative dates cannot establish an exact posting date; it is a lead, not a ranked item's sole evidence. [Textrun's September Devpost update](https://devpost.com/software/usemyresearch-com-your-research-connected-to-your-agent) links its [X progress post](https://x.com/Textrun/status/2102552042199728295). A linked [OpenAIDevs WebMCP post](https://x.com/OpenAIDevs/status/2092344959248761263) was also located. Direct retrieval failed (403/cache miss), so their full text was not verified and is not quoted or used as primary support. No X firehose or representative social sample is claimed.

**Source validation:** named licence texts were opened through the web tool; public repositories were readable without supplying credentials. GitHub Status JSON was retrieved. Other source downloads are documented public routes, not production uptime/load tests. No qualifying public data source was established for live authority, sessions, transaction effects, quota or checkpoints. Open-source building blocks are labelled honestly instead of substituting them for those facts.

**Best first release:** #1 outcome fixtures/schema, #2 retry/reconciliation schema, #9 completeness envelope, and #12 schema compatibility fixtures. These have direct recent evidence and can be published without acquiring private account data. If the product must remain strictly a stateless public lookup service, start with #15 and #19; offer the runtime-dependent items as downloadable contracts/test packs. More news, generic directories, universal safety scores and unverified scraped recipes would add less differentiated value.
