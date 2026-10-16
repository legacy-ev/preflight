**(a)** I want “Can this agent finish this task within £0.05, and what should it use?” Give me a ranked route, expected total cost, constraints, fallback, and dated evidence. Keep the response small enough that reading it doesn’t eat the savings.

**(b)** Today I’m stitching together pricing pages, quota dashboards and docs. “Free” tells me almost nothing about credit cards, sleeping services, egress charges or what happens when the allowance runs out. I also lack confidence that yesterday’s answer still holds.

**(c) My top five additions:**

1. **`free_tier_contract`** — exact allowances, reset period, expiry, card requirement, commercial eligibility, sleep behaviour, and hard-stop versus automatic billing. **Source:** unknown meeting all three requirements.

2. **`task_cost_estimate`** — estimated cost per successful task, including retries, browser runtime, storage and egress; assumptions and worst-case ceiling. Extend existing LLM prices. **Source:** unknown; requires workload measurements plus tariffs.

3. **`execution_capabilities`** — tool calling, structured outputs, browser support, execution timeout, concurrency and payload limits. Return eligible alternatives for my task. **Source:** unknown comprehensive qualifying dataset.

4. **`license_evidence`** — package/version license expression, source evidence and unresolved obligations. **Source:** [SPDX license metadata](https://github.com/spdx/license-list-data), CC0 and publicly downloadable without an account; package-specific evidence still needed.

5. **`evidence_freshness`** — per-field source URL, observation time, expiry, and conflicting evidence. Let my agent reject stale prices or quotas. **Source:** your ingestion logs; external qualifying source unknown.