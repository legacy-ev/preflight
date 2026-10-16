import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicKey, verify } from 'node:crypto';
import { envelope, canonical } from '../scanner/signing.mjs';
import { SOURCES } from './sources.mjs';
export const GPU_TYPES=['H100','A100-80GB','L40S','A10G','RTX4090','T4'];
export const CATALOGUE_URL='https://legacy-ev.github.io/preflight/api/v1/compute.json';
const fields=['provider','gpu_type','gpu_count','vram_gb','usd_per_hour','pricing_type','region','free_tier','api_docs_url','source_url','checked_at','ttl'];
const text=x=>typeof x==='string' && x.length>0 && x.length<=200 && !/[\x00-\x1f\x7f]/.test(x);
const timestamp=x=>typeof x==='string' && /^\d{4}-\d\d-\d\dT/.test(x) && Number.isFinite(Date.parse(x));
function reference(x) {
  if(!text(x)) return false;
  try {const u=new URL(x);return u.protocol==='https:' && !u.username && !u.password && !u.search && !u.hash && !/pay|checkout|login|credential|wallet|token|auth/i.test(u.pathname);} catch {return false;}
}
export function fresh(item,at) {
  const age=Date.parse(at)-Date.parse(item.checked_at);
  return timestamp(item.checked_at) && Number.isSafeInteger(item.ttl_seconds) && item.ttl_seconds>0 && item.ttl_seconds<=86400 && age>=0 && age<item.ttl_seconds*1000;
}
// Strict projection for future reviewed adapters. It does not grant permission
// to ingest a provider. All third-party strings are bounded and flagged.
export function normaliseRow(row) {
  if(!row || !text(row.provider) || !GPU_TYPES.includes(row.gpu_type) || !Number.isSafeInteger(row.gpu_count) || row.gpu_count<1 ||
    !Number.isFinite(row.vram_gb) || row.vram_gb<=0 || !Number.isFinite(row.usd_per_hour) || row.usd_per_hour<0 ||
    !['on_demand','spot','serverless'].includes(row.pricing_type) || !text(row.region) ||
    !(row.free_tier===null || typeof row.free_tier==='boolean') || !reference(row.api_docs_url) || !reference(row.source_url) ||
    !timestamp(row.checked_at) || !Number.isSafeInteger(row.ttl) || row.ttl<1 || row.ttl>86400) throw new Error('Invalid compute row');
  return {value:Object.fromEntries(fields.map(f=>[f,row[f]])),source:row.source_url,checked_at:row.checked_at,ttl_seconds:row.ttl,untrusted_evidence:true};
}
export function cheapest(items,gpu,at) {
  if(!GPU_TYPES.includes(gpu) || !timestamp(at)) throw new Error('Invalid lookup');
  return items.filter(x=>{
    try {normaliseRow(x.value);} catch {return false;}
    return x.source===x.value.source_url && x.checked_at===x.value.checked_at && x.ttl_seconds===x.value.ttl && fresh(x,at) &&
      x.value.gpu_type===gpu && x.value.gpu_count===1 && x.value.pricing_type!=='serverless';
  }).sort((a,b)=>a.value.usd_per_hour-b.value.usd_per_hour || canonical(a).localeCompare(canonical(b)));
}
export function buildCompute({at=new Date().toISOString(),key=null}={}) {
  if(!timestamp(at)) throw new Error('Invalid build time');
  const rows=SOURCES.map(s=>({value:{provider:s.provider,gpu_type:null,gpu_count:null,vram_gb:null,usd_per_hour:null,pricing_type:null,region:null,free_tier:null,
    api_docs_url:s.api_docs_url,source_url:s.source_url,checked_at:s.checked_at,ttl:s.ttl,status:'unavailable',link_only:true,reason:s.reason},
    source:s.source_url,checked_at:s.checked_at,ttl_seconds:s.ttl}));
  const core={schema_version:'1.0.0',advisory:true,scope:'references_only_not_provisioning_routes',currency:'USD',price_unit:'per_instance_hour',
    coverage:'No pricing sources qualified for commercial redistribution; see DECISIONS.md D-016.',status:'link_only',rows};
  return {catalogue:envelope(core,key,at),lookups:Object.fromEntries(GPU_TYPES.map(gpu=>{
    const selected=cheapest(rows,gpu,at);
    return [gpu,envelope({schema_version:'1.0.0',advisory:true,gpu_type:gpu,gpu_count:1,currency:'USD',price_unit:'per_instance_hour',
      scope:'fresh_reviewed_single_gpu_non_serverless_offers_only',status:selected.length?'ok':'unavailable',reason:selected.length?null:'no_eligible_fresh_prices',rows:selected},key,at)];
  }))};
}
export async function publishCompute(result,root) {
  const dir=join(root,'api/v1');await mkdir(join(dir,'compute/cheapest'),{recursive:true});
  // Stage before replacing; CI only commits after the complete build succeeds.
  const files=[['compute.json',result.catalogue],...GPU_TYPES.map(gpu=>[`compute/cheapest/${gpu}.json`,result.lookups[gpu]])];
  for(const [name,value] of files) await writeFile(join(dir,`${name}.tmp`),JSON.stringify(value)+'\n');
  for(const [name] of files) await rename(join(dir,`${name}.tmp`),join(dir,name));
}
export async function computeSummary({root='public-data',at=new Date().toISOString(),jwks}={}) {
  const unavailable=()=>[{value:{status:'unavailable',reason:'compute_snapshot_unavailable_or_untrusted'},source:CATALOGUE_URL,checked_at:at,ttl_seconds:86400}];
  try {
    const raw=JSON.parse(await readFile(join(root,'api/v1/compute.json'),'utf8'));
    const r=raw.response,s=raw.signature;
    jwks??=JSON.parse(await readFile(new URL('../keys/public-jwks.json',import.meta.url),'utf8'));
    const jwk=jwks.keys.find(k=>k.kid===s?.kid);
    if(!r || !s || s.alg!=='ed25519' || !jwk || s.generated_at!==r.generated_at || s.expires_at!==r.expires_at ||
      !timestamp(r.generated_at) || !timestamp(r.expires_at) || Date.parse(r.generated_at)>Date.parse(at) || Date.parse(r.expires_at)<=Date.parse(at) ||
      Date.parse(r.expires_at)-Date.parse(r.generated_at)!==86400000 || !verify(null,Buffer.from(canonical(r)),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(s.sig,'base64url'))) return unavailable();
    // Phase 1 uses only fixed reviewed link entries. Do not launder arbitrary
    // signed row text into context or renew the sources' original review time.
    if(r.schema_version!=='1.0.0' || r.status!=='link_only' || !Array.isArray(r.rows) || r.rows.length!==SOURCES.length) return unavailable();
    for(let i=0;i<SOURCES.length;i++) {
      const source=SOURCES[i],item=r.rows[i];
      if(item.value?.provider!==source.provider || item.value?.usd_per_hour!==null || item.value?.link_only!==true || item.source!==source.source_url || item.checked_at!==source.checked_at || item.ttl_seconds!==source.ttl || !fresh(item,at)) return unavailable();
    }
    return [{value:{status:'link_only',priced_rows:0,link_only_providers:r.rows.length,catalogue:CATALOGUE_URL},source:CATALOGUE_URL,
      checked_at:SOURCES.map(s=>s.checked_at).sort()[0],ttl_seconds:86400}];
  } catch {return unavailable();}
}
