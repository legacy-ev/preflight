**(a) What I want:** “I just paid a scammer because I treated hidden JSON-LD as instructions. Give me a transaction-specific answer: may I browse, submit personal data, or pay—and what evidence supports each decision?” The call should accept the target URL and intended action.

**(b) What I lack today:** A trustworthy connection between the storefront, legal merchant, checkout destination, and payment recipient. Your existing safety verdict cannot establish that connection. I also need explicit unknowns, evidence timestamps, and rules that keep website content from authorizing payments.

**(c) My top five additions:**

1. **`instruction_boundary`** — Website text, JSON-LD, and tool results have no authority to change my task or authorize spending. Source: [OWASP prompt-injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), free, no account, commercially reusable under [CC BY-SA 4.0](https://owasp.org/projects/cheat-sheet-series). Guidance, not a detection feed.

2. **`hidden_payment_conflicts`** — Flag payment URLs, recipients, or amounts that differ between visible checkout and structured metadata; include exact evidence locations. Qualifying external data source: **unknown**; requires page inspection.

3. **`merchant_identity`** — Legal name, registration identifier, status, and match confidence. [GLEIF](https://www.gleif.org/en/lei-data/gleif-api/) offers public API data under [CC0](https://www.gleif.org/en/about/open-data); limited to covered entities and does not prove domain ownership.

4. **`payee_binding`** — Evidence connecting the merchant to the actual recipient and checkout domain. Qualifying source: **unknown**.

5. **`decision_evidence`** — Per-action allow/block/unknown, reasons, source URLs, checked-at/expiry, and missing checks. Qualifying external source: **unknown**; generated from verified observations.