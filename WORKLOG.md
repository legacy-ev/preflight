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
