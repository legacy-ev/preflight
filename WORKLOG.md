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

## 2026-10-14 — Codex (static site)
- **Did:** Built `site/` Astro static site with all requested pages, three clearly fictional contract-envelope fixtures, domain filter, RSS, dated findings, freshness, untrusted evidence and signature-verification documentation. Added public API/key copying and SHA-pinned GitHub Pages workflow. Committed minimal dependency manifest and lockfile.
- **Validation:** Node 20 `npm run build` passed (11 HTML pages plus RSS); cryptographic acceptance/rejection test passed; internal links, RSS XML and both exact key copies passed. Tested published-data preference and verbatim API copy without fixture mixing, then restored and rebuilt fixture mode. Reviewed Chrome screenshots at 1440 and 390 pixels; skill lint had no failures. Full skill inspector unavailable under Node 20. npm audit has three advisories recorded in D-006.
- **Live now:** No production deployment claimed; feature branch push only. Intended URL after main deployment: https://legacy-ev.github.io/preflight/.
- **Next:** Merge reviewed branch, enable GitHub Actions as Pages source if needed, and integrate scanner/MCP data when those directories land.
- **Blocked / needs Michael:** Nothing for this site build. MCP runtime is absent in this worktree, so its setup documentation explicitly marks build/entry-point assumptions.
- **Push result:** `git push -u origin HEAD` was attempted on `feat/site`; GitHub rejected the branch because the current OAuth App credential lacks `workflow` scope to create `.github/workflows/pages.yml`. All changes remain committed locally. Retry the same push with a credential permitted to update workflows; no push to main was attempted.
