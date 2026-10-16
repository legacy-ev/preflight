# WORKLOG — Preflight

Append-only. Newest at the bottom. Every agent session adds one entry. Read this, DECISIONS.md and RUNBOOK.md before starting.

Entry format:

## YYYY-MM-DD — <agent name>
- **Did:** 
- **Live now:** (URLs)
- **Next:** 
- **Blocked / needs Michael:** (numbered ELI5 steps, or "nothing")

---

## 2026-10-14 — Claude (planning)
- **Did:**
  - Researched the agent-blocking landscape and competitors.
  - Wrote BRIEF.md v2 (Preflight), the specs (response and outcome schemas, verdict rules, MCP tools, data model), data/sources.yaml and the seed domain list.
  - Earlier brief "Agent Access Index" is superseded.
- **Live now:** nothing.
- **Next:** Grokbot runs Phase 0.
- **Blocked / needs Michael:** nothing yet; Grokbot will batch Human Gates.
- **Added later the same day:**
  - `specs/threat-model.md`: poisoning attacks ranked by attacker profit, plus the defences.
  - Expanded the monetisation and cost-guardrail notes in BRIEF.md section 11.

## 2026-10-14 — Codex (scanner)
- **Did:** Built scanner/ for Node 20 ESM with zero package dependencies and committed lockfile. Added honest PreflightBot robots-first crawling, per-domain spacing/request caps/backoff, per-AI-UA training/user-triggered robots results, challenge/vendor detection, prompt-injection fixtures/heuristics, RDAP registration age, seed lookalikes, exact-origin well-known routes and Product JSON-LD detection. Added deterministic versioned verdicts, sticky safety evidence, Ed25519 response/request signing with unsigned fallback, schema/contract output tests and capped hash-chained changes.
- **Verified:** `npm ci --ignore-scripts --prefix scanner` (zero vulnerabilities); `npm test --prefix scanner` (32/32 passing); SHA-pinned scan workflow passed actionlint v1.7.7; staged diff whitespace check clean. Three-domain live scan: amazon.com (1 site request, RDAP age 11670d), apple.com (1 request, 14482d), shopify.com (2 requests, 7887d). Exact-origin www redirects were refused; all remain CAUTION with explicit NO_DATA/incomplete/unsigned/independent-safety gaps. The local synthetic DNS mode was explicitly enabled and recorded. Output/evidence references and the three-event SHA-256 chain were verified; root `77c750db96842e0b2ee2a14a3eb709419ceee9e94227c3fe678ec23c20affe56`.
- **Live now:** No deployment triggered. Three diagnostic outputs are in public-data/. Local key was absent, so signature:null with a warning; test-only deterministic seeds verified Ed25519 without changing production keys. No spend, paid API calls or environment API-key use.
- **Automation / decisions:** Daily 05:17 UTC + manual dispatch, three scan workers, per-ref run concurrency, contents/actions write, public-data commit and explicit Pages workflow dispatch. D-004–D-007 and scanner/README.md document conservative static rules, contract signature precedence, exact-origin skips, source/spec checks, safety retention and network/signing limitations.
- **Next:** Human-reviewed integration of feat/scanner with the separately owned Pages/site branch. pages.yml must be present with workflow_dispatch for the final workflow step; independent safety feeds/ToS/outcomes remain deferred as specified.
- **Blocked / needs Michael:** Nothing for this scanner implementation. Existing PREFLIGHT_SIGNING_KEY Actions secret/public JWKS are reused; no new account or billing requested. Commit and authorized push target the current feat/scanner branch, never main.
- **Independent review follow-up:** Closed DNS rebinding and robots-evidence marking findings with regression tests. Both site and RDAP HTTPS now pin validated DNS records while retaining hostname/certificate verification. Added D-008. Reviewer confirmed the documented Pages workflow prerequisite; no deployment was claimed or triggered.
- **Final verification:** 36/36 tests pass with the pinned transport, including compressed-body caps. Final three-domain live scan repeated successfully after review fixes; output/evidence/chain checks and actionlint passed again. Staged whitespace check is clean. Publishing this implementation on feat/scanner with the requested `git push -u origin HEAD`.
- **Push blocked:** `git push -u origin HEAD` was rejected by GitHub because the configured OAuth app lacks `workflow` scope for .github/workflows/scan.yml. No SSH identity/client is configured as a fallback. Implementation and notes are committed locally on feat/scanner; remote publication needs the existing GitHub connection reauthorized with workflow permission. No environment API key was read or substituted, and main was not pushed.
## 2026-10-14 — Codex (static site)
- **Did:** Built `site/` Astro static site with all requested pages, three clearly fictional contract-envelope fixtures, domain filter, RSS, dated findings, freshness, untrusted evidence and signature-verification documentation. Added public API/key copying and SHA-pinned GitHub Pages workflow. Committed minimal dependency manifest and lockfile.
- **Validation:** Node 20 `npm run build` passed (11 HTML pages plus RSS); cryptographic acceptance/rejection test passed; internal links, RSS XML and both exact key copies passed. Tested published-data preference and verbatim API copy without fixture mixing, then restored and rebuilt fixture mode. Reviewed Chrome screenshots at 1440 and 390 pixels; skill lint had no failures. Full skill inspector unavailable under Node 20. npm audit has three advisories recorded in D-006.
- **Live now:** No production deployment claimed; feature branch push only. Intended URL after main deployment: https://legacy-ev.github.io/preflight/.
- **Next:** Merge reviewed branch, enable GitHub Actions as Pages source if needed, and integrate scanner/MCP data when those directories land.
- **Blocked / needs Michael:** Nothing for this site build. MCP runtime is absent in this worktree, so its setup documentation explicitly marks build/entry-point assumptions.
- **Push result:** `git push -u origin HEAD` was attempted on `feat/site`; GitHub rejected the branch because the current OAuth App credential lacks `workflow` scope to create `.github/workflows/pages.yml`. All changes remain committed locally. Retry the same push with a credential permitted to update workflows; no push to main was attempted.
## 2026-10-14 — Codex (stdio MCP)
- **Did:** Built mcp/ with five static-description tools, Ed25519 verification, expiry/intent cautions, filtered results and isolated evidence; validated non-storing outcome stub; fixed shared outcome domain regex. Added Claude Desktop README and a prioritised 15-item phased BACKLOG.md. Committed dependency lockfile.
- **Validation:** Node 20 `npm test --prefix mcp`: nine tests passed with mocked fetch, including real SDK client/server calls and subprocess stdio negotiation. npm install audit found zero vulnerabilities. No paid APIs or environment API keys used.
- **Live now:** Local stdio server; upstream static API availability remains an external dependency, not asserted by mocked tests.
- **Next:** Live static scan publication and outcome ingestion infrastructure; validate Desktop configuration on a machine running Claude Desktop.
- **Blocked / needs Michael:** nothing for this task.

## 2026-10-14 — Codex (fix/review)
- **Did:** Read CONTRACT.md, specs/threat-model.md, DECISIONS.md and RUNBOOK.md. Replaced robots wildcard regexes with linear literal-segment KMP matching, fixed current-URL relative redirects while preserving endpoint guards, published capped/untrusted raw scan JSON in the static build, and aligned MCP setup with mcp/README.md and mcp/server.js. Added scanner regressions, site publication/setup tests and a real HTTP MCP get_evidence publication integration test.
- **Diagnosis / decision:** This machine resolves external names to synthetic 198.18.0.1. The guard rejected that address before HTTPS; curl and a hostname-verified pinned transport request returned 200. D-010 documents automatic synthetic-gateway handling only after independent TLS-authenticated public A/AAAA confirmation; private/mixed/missing DNS and resolver failures fail closed, including with the legacy flag. Public DNS on Actions retains the direct pinned transport. Updated scanner/site README and runbook to match.
- **Validation:** Reproduced the failing wildcard timeout, relative redirect, missing publication, stale setup and missing DNS confirmation before fixes. Final Node 20 scanner suite 43/43, MCP suite 10/10, site suite 3/3; Astro build passed (11 pages), copied scan files match byte for byte, git diff --check passed. Installed missing MCP/site dependencies from existing lockfiles; initial missing-SDK/astro failures resolved. Existing site dependency audit still reports low/high/critical advisories recorded in earlier decisions; dependency versions were not changed.
- **Live scan:** Ran the ordinary npm scan command with --domains amazon.com,apple.com,shopify.com and --output /tmp/preflight-review-final-scan, without --managed-dns. All three returned HTTP 301 and RDAP ok (registration ages 11670/14482/7887 days); existing exact-origin www redirect restrictions honestly stop further crawling. Outputs are diagnostic only, outside the checkout and excluded from this commit. Local signing key absent, so the scans correctly warn and remain unsigned.
- **Live now:** Local fixes only; no deployment or push. Committed on fix/review as requested, with no public-data changes.
- **Next:** Review and integrate the local commit; publish through the existing workflows when authorized.
- **Blocked / needs Michael:** nothing.

## 2026-10-14 orchestrator
- Merged feat/scanner (Codex), feat/site (Codex), feat/mcp (Codex), fix/review (Codex) after adversarial review. Grok Build hit free limit; opencode free tier refuses headless. First full signed scan: 89 domains.

## 2026-10-16 orchestrator
- Activated scan.yml (daily 05:17 UTC) and pages.yml; Pages build_type=workflow; manual scan run triggered.
