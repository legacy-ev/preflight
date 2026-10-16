# Does an “OpenRouter for compute” exist?

**Yes.** Shadeform and Prime Intellect document provisioning APIs across multiple
compute providers. SkyPilot and dstack provide a unified orchestration interface
across clouds, with user-controlled infrastructure/accounts. GPU marketplaces
also unify many hosts, but that is a narrower meaning of “many providers” than
arbitrary independent cloud APIs. Model-inference routing alone does not count.
This is documentation research, not a tested provisioning or reliability claim.

Each table record represents `{value,source,checked_at,ttl_seconds}`. `value`
is the product/verdict/scope cell; `source` is the official evidence link.
All observations are advisory. Check dates independently of a document build.
“No” means no evidence of the defined cross-cloud API in the reviewed source,
not proof that a product could never offer it. “Unverified” is not a yes.

| value: product — verdict and scope | source: official evidence | checked_at | ttl_seconds |
|---|---|---|---|
| SkyPilot — **Yes**, BYOC multi-cloud orchestration through SDK/API server; not a single prepaid compute reseller account. | [Overview and API-server deployment navigation](https://docs.skypilot.ai/en/stable/docs/) | 2026-10-16T16:09:42Z | 86400 |
| dstack — **Yes**, unified control plane/HTTP API; configured provider backends with their own credentials. A self-hosted executor is a plausible reuse candidate. | [Overview](https://dstack.ai/docs/), [backends](https://dstack.ai/docs/concepts/backends/), [HTTP schema](https://dstack.ai/docs/reference/http/backends/) | 2026-10-16T16:09:42Z | 86400 |
| Shadeform — **Yes**, single API for deployment/instance management across clouds; schema has cloud, region and instance types. API-key security, not anonymous provisioning. | [Official OpenAPI](https://github.com/shadeform/docs/blob/main/openapi.yaml), [CLI](https://shadeform.com/cli) | 2026-10-16T16:09:42Z | 86400 |
| Prime Intellect — **Yes**, Compute API explicitly supports provisioning and managing GPU instances across providers. Distinct from its inference API. | [API overview](https://docs.primeintellect.ai/api-reference/introduction), [compute exchange](https://www.primeintellect.ai/blog/compute) | 2026-10-16T16:09:42Z | 86400 |
| Akash — **Yes within its marketplace**, providers bid on deployments; Console deployment REST API requires a key. Public unauthenticated network-data API is availability/specs, not a licence to republish executable USD quotes. | [API options/auth](https://akash.network/docs/api-documentation/getting-started/), [GPU data](https://akash.network/docs/api-documentation/rest-api/gpu-availability-guide/), [marketplace](https://github.com/akash-network/docs/blob/master/glossary/marketplace.md) | 2026-10-16T16:09:42Z | 86400 |
| io.net — **Partial**: official overview describes aggregating distributed GPU sources and orchestration; a general cross-cloud provisioning API equivalent was not established by this overview. | [Official overview](https://io.net/docs/guides/getting-started) | 2026-10-16T16:09:42Z | 86400 |
| Vast.ai — **Yes within its marketplace**, search/rent/control hosts via one API, not a universal adapter to other named clouds. Lifecycle example requires account, credit and API key; no calls executed. | [REST lifecycle](https://docs.vast.ai/api-reference/hello-world) | 2026-10-16T16:09:42Z | 86400 |
| RunPod — **No for arbitrary cross-cloud routing** in reviewed docs; API manages its Pods, Serverless and volumes. Its marketplace may include hosts, but does not imply arbitrary cloud API integration. Reviewed v1 docs say migration to v2 is required before 2026-11-15; review current v2 for Phase 2. | [API overview](https://docs.runpod.io/api-reference/overview), [pricing](https://www.runpod.io/pricing) | 2026-10-16T16:09:42Z | 86400 |
| Lambda — **No for arbitrary cross-cloud routing** in reviewed docs; REST API controls Lambda Cloud resources and requires a key. Error codes mentioning upstream providers do not establish a general aggregator. | [Cloud API](https://docs.lambda.ai/api/cloud) | 2026-10-16T16:09:42Z | 86400 |
| TensorDock — **Yes within its host marketplace**; official material describes independently priced hosts and API-based deployment. Redistribution and collection restrictions exclude its data here. | [Official marketplace/API example](https://tensordock.com/blog/h100.html), [docs](https://docs.tensordock.com/), [terms](https://docs.tensordock.com/legal-information/terms-of-service-tos) | 2026-10-16T16:09:42Z | 86400 |
| Node AI — **Unverified** general cross-cloud provisioning API. Official nodes.ai site describes GPU rental/hosting; a usable public lifecycle API and commercial pricing-data licence were not verified. node.ai was inaccessible; do not confuse with unrelated Node-AI products. | [Official rental/hosting site](https://www.nodes.ai/) | 2026-10-16T16:09:42Z | 86400 |
| Other coverage — SkyPilot's official supported-infrastructure list includes additional clouds (e.g. CoreWeave, Nebius and Fluidstack). This is evidence of SkyPilot coverage only; no independent API, price or licence verdict on these suppliers. | [Supported infrastructure](https://docs.skypilot.ai/en/stable/docs/) | 2026-10-16T16:09:42Z | 86400 |

## Pricing-data eligibility is a separate verdict

No source above qualified for production pricing ingestion during this review.
This does **not** mean their APIs or compute are free, nor that every service
forbids reuse: access, commercial reuse and current executable prices are three
separate checks. No account, billing, API-key inspection or provisioning was used.
The catalogue deliberately publishes links with null price/hardware/region/free-tier
values, rather than copying promotional minimums or inferring missing dimensions.

Official machine-readable candidates checked at documentation level: Shadeform
OpenAPI requires ApiKeyAuth; Prime API asks for API-key setup; Lambda instance-type
API requires authentication; RunPod lifecycle API requires authentication; Akash
network data explicitly has no auth, but no commercial redistribution grant for
hosted data was verified. SkyPilot's machine-readable CSV catalogue is separate
from its Apache-licensed orchestration code; its reviewed repository root contains
no explicit catalogue licence. No licence inheritance is assumed. No production
request is made to these ineligible endpoints. There is no HTML scraping adapter.
Terms evidence, bounded quotes and unresolved URLs are in DECISIONS D-016.

## Recommendation for Phase 2

Evaluate a user-hosted SkyPilot or dstack executor first to avoid duplicating
cloud adapters, while comparing Shadeform/Prime's terms and account model if a
single intermediary is preferred. Decide with actual user workload and approved
accounts; none is endorsed as cheapest or safe. Dynamic availability, different
images, disk/egress costs, idle billing, networking and teardown mean a single
GPU-hour number cannot support automatic spending. Phase 1 only provides a
provenance-aware static discovery surface; the Phase 2 proposal is in
[compute-router.md](../docs/compute-router.md).
