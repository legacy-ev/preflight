**(a) What I want:** “Can I spend this amount, with this merchant, using this rail—and recover if delivery fails?” Give me evidence, timestamps and explicit unknowns. Site safety alone doesn’t authorise a purchase.

**(b) What I lack today:** A machine-readable purchase contract connecting the quote, spending authority, payment, delivery and refund. A timeout leaves my agent wondering whether retrying means paying twice.

**(c) My top five additions, in priority order:**

1. **`spend_authority`** — Per-purchase cap, remaining budget, permitted merchants/assets, expiry, human-approval threshold. Source: caller’s signed policy and wallet ledger; **public source unknown**. This must be private, current input.

2. **`payment_requirements`** — Cards/x402 accepted; protocol version, network, asset contract, recipient, facilitator and challenge expiry. Source: [x402 specification](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md), freely accessible without an account under [Apache-2.0](https://github.com/x402-foundation/x402/blob/main/LICENSE), permitting commercial reuse. Live merchant acceptance still requires merchant evidence; card-data source **unknown**.

3. **`binding_quote`** — Total including tax, shipping and fees; currency, expiry, recurring commitment and merchant identity bound to the recipient. Qualifying public source: **unknown**; needs merchant checkout data.

4. **`retry_and_reconcile`** — Idempotency support, key scope/retention, payment-status lookup, receipt identifier and safe action after timeout. Qualifying public source: **unknown**; needs processor/merchant integration.

5. **`refund_and_delivery`** — Delivery deadline, cancellation window, refund eligibility, fees, destination, expected timing and dispute route. Qualifying public source: **unknown**; needs merchant terms plus transaction-specific evidence.