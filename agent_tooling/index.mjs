import { validateToolingFields } from '../tooling/fields.mjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicKey, verify } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { publicFetch } from '../scanner/transport.mjs';
import { readBounded } from '../scanner/network.mjs';
import { parseRobots, robotsDecision } from '../scanner/robots.mjs';
import { envelope, canonical, requestHeaders } from '../scanner/signing.mjs';
export const TOOLING_SOURCE='https://legacy-ev.github.io/preflight/api/v1/tooling.json';
export const TTL=604800;
const https=value=>{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error('Unsafe tooling reference');return u;};
export function validateCatalog(categories) {
 if(!categories||Array.isArray(categories)||typeof categories!=='object')throw new Error('Invalid catalog');
 for(const [category,items] of Object.entries(categories)) {
  if(!/^[a-z_]+$/.test(category)||!Array.isArray(items))throw new Error('Invalid category');
  let previous='';
  for(const item of items) {
   const v=item.value;
   validateToolingFields(v,https);
   if(!v||typeof v.name!=='string'||!v.name.length||v.name.length>100||previous.localeCompare(v.name,'en',{sensitivity:'base'})>0)throw new Error('Invalid name/order');
   previous=v.name;https(v.official_url);https(item.source);
   if(typeof v.what_it_does!=='string'||v.what_it_does.length>140||typeof v.pricing_model!=='string'||v.pricing_model.length>200||typeof v.auth_type!=='string'||v.auth_type.length>200)throw new Error('Invalid bounded fact');
   for(const field of ['free_tier','mcp_available','api_available'])if(!['yes','no','unknown'].includes(v[field]))throw new Error('Invalid tri-state');
   for(const field of ['mcp','api'])if(v[`${field}_available`]==='yes'&&!v[`${field}_evidence_url`])throw new Error('Missing interface evidence');
   if(!Array.isArray(v.facts_source_urls))throw new Error('Missing sources');v.facts_source_urls.forEach(https);
   for(const field of ['mcp_evidence_url','api_evidence_url','pricing_source_url'])if(v[field]!=null)https(v[field]);
   if(!Number.isFinite(Date.parse(item.checked_at))||!Number.isInteger(item.ttl_seconds)||item.ttl_seconds<=0||item.untrusted_evidence!==true)throw new Error('Missing provenance');
   if(v.verified_at!==null&&!Number.isFinite(Date.parse(v.verified_at)))throw new Error('Invalid verification');
   if(v.evidence_quote && v.evidence_quote.length>200)throw new Error('Unbounded evidence');
  }
 }
 return categories;
}
export async function checkCatalog(categories,{fetchImpl=publicFetch,wait=sleep,at=new Date().toISOString(),key=null}={}) {
 validateCatalog(categories);const liveness=[],hosts=new Map(),seen=new Set();
 const get=async(url,robots=false)=>{
  await wait(1000);
  const r=await fetchImpl(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),headers:requestHeaders(url,null)});
  if(robots){if([404,410].includes(r.status)){await r.body?.cancel();return [];}if(r.status!==200){await r.body?.cancel();throw new Error('robots_unavailable');}const data=await readBounded(r,65536);if(data.truncated)throw new Error('robots_too_large');return parseRobots(data.body);}
  const status=r.status;await r.body?.cancel();return status;
 };
 for(const items of Object.values(categories))for(const item of items) {
  const url=item.value.official_url;if(seen.has(url))continue;seen.add(url);
  const u=https(url);let value;
  try {
   if(!hosts.has(u.origin)) {try{hosts.set(u.origin,await get(`${u.origin}/robots.txt`,true));}catch{hosts.set(u.origin,null);}}
   const rules=hosts.get(u.origin);if(rules===null)throw new Error('robots_unavailable');
   const decision=robotsDecision(rules,'PreflightBot',u.pathname);
   if(!decision.allowed||decision.crawl_delay_seconds>60)throw new Error('robots_disallowed');
   if(decision.crawl_delay_seconds>1)await wait(decision.crawl_delay_seconds*1000);
   const http_status=await get(url);value={official_url:url,http_status,status:http_status>=200&&http_status<300?'reachable':'unavailable',scope:'http_status_only'};
  }catch{value={official_url:url,http_status:null,status:'unavailable',scope:'http_status_only'};}
  liveness.push({value,source:url,checked_at:at,ttl_seconds:TTL});
 }
 return envelope({schema_version:'1.0.0',advisory:true,disclaimer:'listing is not endorsement; no paid placement',categories,liveness},key,at);
}
export function verifyTooling(raw,jwks,at) {
 const r=raw.response,s=raw.signature;const jwk=jwks.keys.find(k=>k.kid===s?.kid);
 const start=Date.parse(r.generated_at),end=Date.parse(r.expires_at),now=Date.parse(at);
 if(!s||s.alg!=='ed25519'||!jwk||![start,end,now].every(Number.isFinite)||now<start||now-start>86400000||end<=now||end<=start||end-start>86400000||!verify(null,Buffer.from(canonical(r)),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(s.sig,'base64url')))throw new Error('Untrusted snapshot');
 validateCatalog(r.categories);
 const urls=new Set(Object.values(r.categories).flat().map(x=>x.value.official_url));
 if(!Array.isArray(r.liveness)||r.liveness.length!==urls.size||new Set(r.liveness.map(x=>x.source)).size!==urls.size||r.liveness.some(x=>!urls.has(x.source)||x.value?.official_url!==x.source||!['reachable','unavailable'].includes(x.value?.status)||!(x.value.http_status===null||Number.isInteger(x.value.http_status)&&x.value.http_status>=100&&x.value.http_status<=599)||!Number.isFinite(Date.parse(x.checked_at))||Date.parse(x.checked_at)>now||!Number.isInteger(x.ttl_seconds)||x.ttl_seconds<=0||x.ttl_seconds>TTL||now-Date.parse(x.checked_at)>x.ttl_seconds*1000))throw new Error('Invalid liveness');
 return r;
}
export async function toolingSummary({root='public-data',at=new Date().toISOString()}={}) {
 const item=value=>({value,source:TOOLING_SOURCE,checked_at:at,ttl_seconds:TTL});
 try {
  const raw=JSON.parse(await readFile(join(root,'api/v1/tooling.json'),'utf8'));
  const jwks=JSON.parse(await readFile(new URL('../keys/public-jwks.json',import.meta.url),'utf8'));
  const r=verifyTooling(raw,jwks,at);
  return [{...item({status:'ok',categories:Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,v.length])),checked_urls:r.liveness.length,reachable:r.liveness.filter(x=>x.value.status==='reachable').length,scope:'listing_and_http_status_only'}),checked_at:r.generated_at}];
 }catch{return [item({status:'unavailable',reason:'missing_untrusted_or_expired_tooling_snapshot',link_only:true})];}
}
