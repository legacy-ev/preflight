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

## 2026-10-14 — Codex (stdio MCP)
- **Did:** Built mcp/ with five static-description tools, Ed25519 verification, expiry/intent cautions, filtered results and isolated evidence; validated non-storing outcome stub; fixed shared outcome domain regex. Added Claude Desktop README and a prioritised 15-item phased BACKLOG.md. Committed dependency lockfile.
- **Validation:** Node 20 `npm test --prefix mcp`: nine tests passed with mocked fetch, including real SDK client/server calls and subprocess stdio negotiation. npm install audit found zero vulnerabilities. No paid APIs or environment API keys used.
- **Live now:** Local stdio server; upstream static API availability remains an external dependency, not asserted by mocked tests.
- **Next:** Live static scan publication and outcome ingestion infrastructure; validate Desktop configuration on a machine running Claude Desktop.
- **Blocked / needs Michael:** nothing for this task.
