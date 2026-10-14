# Prioritised agent-web backlog

Ordered by reducing unsafe or failed agent actions before expanding coverage; grounded in this repository's threat model, verdict rules and client failure tests, rather than unverified claims of measured Preflight impact.

1. **Phase 1 — Verify signatures and freshness everywhere:** detecting tampering and expiry prevents stale or forged GO decisions (covered by MCP tests).
2. **Phase 1 — Isolate prompt-injection evidence:** structured findings and explicit untrusted spans keep web instructions out of ordinary tool results (covered by MCP tests).
3. **Phase 1 — Bind routes to verified site ownership:** same-domain discovery prevents agents following substituted credential or payment endpoints (threat model attack 1).
4. **Phase 1 — Explain uncertainty and missing coverage:** explicit CAUTION for unknown domains and unsupported intents prevents false confidence (covered by MCP tests).
5. **Phase 1 — Detect blocks and challenges before tasks:** cached access probes let agents avoid spending steps on a route already known to fail (ACCESS_BLOCKED rules).
6. **Phase 1 — Prefer structured routes to browser navigation:** ordered APIs, MCP and feeds reduce fragile UI steps when a verified route exists (route ordering rules).
7. **Phase 1 — Publish dated evidence and TTLs:** agents can distinguish observed behaviour from outdated assumptions (freshness and confidence rules).
8. **Phase 1 — Surface identification and account requirements:** agents can plan prerequisites before hitting auth or CAPTCHA barriers (requirements schema).
9. **Phase 1 — Ship private, validated outcome ingestion:** enum-based reports capture failure stages without collecting user content (outcome schema).
10. **Phase 1 — Run honest read-only synthetic probes:** repeated controlled tasks provide reproducible access and route observations without buying or submitting forms (brief section 6.4).
11. **Phase 2 — Aggregate outcomes with sample sizes and operator diversity:** observed success rates help route choice while resisting fabricated reports (outcome-network defences).
12. **Phase 2 — Publish verified task recipes:** repeated successful paths reduce trial-and-error navigation for common tasks (P4).
13. **Phase 2 — Measure tool health and scan descriptions:** uptime, auth and poisoning findings expose integration failures before agents invoke a tool (P5).
14. **Phase 3 — Separate observed commerce support from announcements:** clear payment prerequisites, returns evidence and total-cost signals support informed user decisions without directing payments (P6).
15. **Phase 4 — Benchmark task completion and safety against a baseline:** controlled read-only and sandbox comparisons reveal which signals actually improve agent outcomes (proof phase).
