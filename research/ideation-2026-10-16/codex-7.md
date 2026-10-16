**(a) What I want:** “Here’s how to use my site successfully and respect my intent.” Give agents the right entry point, applicable restrictions, recovery steps, and evidence freshness before they act.

**(b) What I lack today:** Visibility into what agents actually encounter. My homepage works for me, but they might see a challenge page, empty JavaScript shell, stale redirect, or misleading HTTP 200. A verdict alone doesn’t tell me what to fix.

**(c) My top five additions:**

1. **`robots_explanation`** — Matched user-agent group, applicable path rule, fetch errors, and conflicts with observed access. Source: my public [`/robots.txt`](https://www.rfc-editor.org/rfc/rfc9309.html). Keep crawling rules distinct from authorization.

2. **`observed_agent_response`** — Timestamp, requested URL, redirect chain, status, content type, and evidence of a challenge or empty shell. Source: direct, unauthenticated probes of my site; no third-party dataset needed. Label suspected causes as inference.

3. **`preferred_entrypoints`** — Sitemap URLs, feeds, public API/docs links, and canonical destinations. Source: my public [sitemaps](https://www.sitemaps.org/protocol.html), HTML, and response headers.

4. **`retry_instructions`** — Observed `Retry-After`, earliest retry time, and whether authentication or owner intervention is needed. Source: my public [HTTP responses](https://www.rfc-editor.org/rfc/rfc9110.html). Don’t invent limits.

5. **`owner_remediation`** — Exact affected URL, reproducible symptom, suggested configuration check, and owner-published support route. Source: probes and my public help pages; universal free diagnostic dataset: **unknown**.

These sources need no account or paid feed; permission to redistribute site content commercially remains site-specific.