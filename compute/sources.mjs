// Fixed editorial references, not provisioning routes. No source has a reviewed
// commercial pricing-data grant; do not fetch or copy prices from these links.
export const REVIEWED_AT = '2026-10-16T16:09:42.000Z';
export const SOURCES = [
  ['SkyPilot','https://github.com/skypilot-org/skypilot-catalog','https://docs.skypilot.co/en/stable/docs/','catalogue_licence_unverified'],
  ['dstack','https://dstack.ai/docs/concepts/backends/','https://dstack.ai/docs/reference/http/backends/','commercial_reuse_unverified'],
  ['Shadeform','https://shadeform.com/','https://github.com/shadeform/docs/blob/main/openapi.yaml','commercial_reuse_restricted'],
  ['Prime Intellect','https://www.primeintellect.ai/blog/compute','https://docs.primeintellect.ai/api-reference/introduction','automated_collection_restricted'],
  ['Akash','https://akash.network/pricing/gpus/','https://akash.network/docs/api-documentation/getting-started/','commercial_reuse_unverified'],
  ['io.net','https://io.net/','https://io.net/docs/guides/getting-started','commercial_reuse_unverified'],
  ['Vast.ai','https://vast.ai/','https://docs.vast.ai/api-reference/hello-world','commercial_reuse_unverified'],
  ['RunPod','https://www.runpod.io/pricing','https://docs.runpod.io/api-reference/overview','commercial_reuse_unverified'],
  ['Lambda','https://lambda.ai/service/gpu-cloud/pricing','https://docs.lambda.ai/api/cloud','commercial_reuse_unverified'],
  ['TensorDock','https://tensordock.com/','https://docs.tensordock.com/','automated_collection_restricted'],
  ['Node AI','https://www.nodes.ai/','https://www.nodes.ai/','api_and_licence_unverified'],
].map(([provider,source_url,api_docs_url,reason])=>Object.freeze({provider,source_url,api_docs_url,reason,checked_at:REVIEWED_AT,ttl:86400}));
