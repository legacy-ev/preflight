# Compute catalogue (Phase 1)

Zero dependencies, Node 20 ESM. From the root:

```
node --test tests
node compute/index.mjs --output /tmp/preflight-compute
node context/index.mjs --output /tmp/preflight-context
```

Omit `--output` to write `public-data/`. Build compute before context. Context
reads the compute snapshot from `public-data/` and verifies its signature against
the existing public JWKS; an absent, unsigned, expired or altered snapshot yields
an unavailable summary. Local generation without the existing signing seed emits
`signature:null`, never an invented signature. No compute API keys are read.
Daily CI requires the existing signing secret and matching public key.

Every row is an item `{value,source,checked_at,ttl_seconds}`. `value` has the
requested provider/GPU/count/VRAM/USD/hour/type/region/free-tier/docs/source/time/ttl
fields. For link-only rows, unknown fields are null, `status:unavailable`,
`link_only:true`, and a reason is explicit. Null free_tier means unknown, never
free. Reference links are documentation, never authority to send credentials or
money. Source timestamps record the actual review, not a fresh price observation.
Daily builds do not renew review timestamps; after 24 hours these references need
review to be considered fresh. They remain visible as stale links, with no prices.

No reviewed source currently qualifies for pricing ingestion. Consequently no
provider is fetched during production generation and all six cheapest files have
empty rows and `status:unavailable`. This is the requested link-out fallback,
not a claim that there are no GPUs for sale. Research and terms are recorded in
`research/compute-aggregators.md` and DECISIONS D-016.

Before enabling a price adapter: record an explicit commercial data grant and
terms quote/URL in DECISIONS, define the exact fixed unauthenticated pricing URL
(prefer JSON), and use `context/fetch.mjs`'s robots-first, DNS-pinned transport,
honest UA, 1 request/second/host, timeout, byte cap, no redirects, stop-on-error.
Keep requests under the contract's 10/site/run cap. Never infer a hosted-data
licence from a software licence, fetch HTML behind an access restriction, or use
an API key. Keep third-party spans <=200 characters and flag the containing item.
Use `normaliseRow` to project known fields, preserving observation timestamps.

`usd_per_hour` is a total instance-hour USD price; VRAM is per GPU. Do not infer
region, memory or GPU count. Spot prices retain their interruption caveat.
Serverless prices need an explicit billing basis, idle/minimum billing and worker
shape before comparison; they are excluded from cheapest. Current cheapest
scope is exact GPU type, one GPU, fresh on-demand/spot observations, ascending
instance-hour price with deterministic ties; multi-GPU offers are not divided
into pretend single-GPU rentals. It is a partial catalogue, not a market-wide
lowest-price guarantee. Storage, egress, tax and availability require a new quote.

Generated files are committed only by the publication workflow, consistent with
context's development policy. No provider data, demo prices or keys are bundled.
