**(a) What I’d want:** A map of what agents treat as authoritative: which fields influence navigation, tool selection, spending, or credential use; who can edit those fields; and how long poisoned answers remain cached. One trusted call is an attractive place to turn supplied “facts” into actions.

**(b) What I lack today:** The trust boundaries. Your inventory tells me what you aggregate, but not provenance, update controls, replay resistance, or whether agents interpret free text as instructions.

**(c) My top five additions, viewed as a red-teamer:**

1. **`provenance` per field:** Original URL, publisher, retrieval time, content hash, transformation history, and verification status. This exposes where untrusted contributions acquire authority. **Source:** Your ingestion logs; external source **unknown**.

2. **`integrity_and_freshness`:** Signed response, key ID, sequence number, expiry, revocations, and last-known-good version. I’d test whether old but valid answers remain trusted. **Source:** Your signing and release system; external source **unknown**.

3. **`instruction_boundary`:** Mark externally supplied text, its origin, and whether it may influence actions; expose observed instruction-like content without declaring it safe. **Source:** Your ingestion pipeline; comprehensive public dataset **unknown**.

4. **`domain_identity`:** ASCII hostname, registrable domain, mixed scripts, and confusable skeleton. **Sources:** [Public Suffix List](https://publicsuffix.org/list/) (MPL-2.0) and [Unicode confusables](https://unicode.org/Public/17.0.0/security/) ([permissive license](https://unicode.org/copyright.html)); free, no account, commercial use allowed subject to license terms.

5. **`action_scope`:** Explicit permitted origins, credential recipients, spending limits, and confirmation requirements. **Source:** Calling agent’s policy—not a public authority; external source **unknown**.