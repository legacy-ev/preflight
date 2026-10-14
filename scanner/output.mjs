import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { canonical, envelope } from './signing.mjs';
import { verdict } from './verdict.mjs';
const sha = value => createHash('sha256').update(canonical(value)).digest('hex');

export function verifyChain(chain) {
  if (!Array.isArray(chain)) return false;
  return chain.every((event,i) => {
    const {hash,...payload} = event;
    return /^[a-f0-9]{64}$/.test(event.prev_hash) && hash === sha(payload) && (i === chain.length-1 || event.prev_hash === chain[i+1].hash);
  });
}
export function appendChange(chain,event) {
  if (!verifyChain(chain)) throw new Error('Existing changes.json hash chain is invalid; refusing to rewrite it');
  const payload = {...event,prev_hash:chain[0]?.hash ?? '0'.repeat(64)};
  return [{...payload,hash:sha(payload)},...chain].slice(0,500);
}
async function readJSON(path,fallback) {
  try { return JSON.parse(await readFile(path,'utf8')); } catch(error) { if(error.code === 'ENOENT') return fallback; throw error; }
}
async function atomicJSON(path,value) {
  await mkdir(join(path,'..'),{recursive:true});
  const temp = `${path}.tmp`;
  await writeFile(temp,`${JSON.stringify(value,null,2)}\n`);
  await rename(temp,path);
}
export async function writeOutputs(scans, { output='public-data', key=null, at=new Date().toISOString() }={}) {
  const api=join(output,'api/v1');
  const index = new Map((await readJSON(join(api,'index.json'),[])).map(x=>[x.domain,x]));
  let chain=await readJSON(join(api,'changes.json'),[]);
  if(!verifyChain(chain)) throw new Error('Existing changes.json hash chain is invalid');
  for(const scan of [...scans].sort((a,b)=>a.domain.localeCompare(b.domain))) {
    const path=join(api,'preflight',`${scan.domain}.json`);
    const previous=await readJSON(path,null);
    const prior=previous?.response;
    const retained=(prior?.reasons ?? []).filter(x=>x.code.startsWith('SAFETY_') && x.code !== 'SAFETY_REVIEW_REQUIRED' && ['stop','caution'].includes(x.severity));
    scan.retained_safety_reasons = retained;
    const response=verdict(scan,'read',at);
    const previousScan=await readJSON(join(output,'scans',`${scan.domain}.json`),null);
    // Keep evidence referenced by sticky reasons, even after replacing latest scan.
    scan.evidence=Object.fromEntries(retained.filter(x=>previousScan?.evidence?.[x.evidence_id]).map(x=>[x.evidence_id,previousScan.evidence[x.evidence_id]]));
    for(const reason of response.reasons) {
      if(scan.evidence[reason.evidence_id]) continue;
      const component=reason.code.startsWith('ACCESS_') || reason.code.startsWith('ROBOTS_') || reason.code==='NO_DATA' || reason.code==='UNSIGNED_SCAN' || reason.code==='PAY_PER_CRAWL' ? 'access'
        : reason.code.startsWith('TOS_') ? 'tos' : reason.code.startsWith('OUTCOME_') ? 'outcomes' : 'safety';
      scan.evidence[reason.evidence_id]=structuredClone(scan[component] ?? {status:'unavailable'});
    }
    const current=envelope(response,key,at);
    const beforeCodes=(prior?.reasons ?? []).map(x=>x.code).sort();
    const codes=response.reasons.map(x=>x.code).sort();
    if(!prior || prior.verdict !== response.verdict || canonical(beforeCodes) !== canonical(codes) || canonical(prior.best_route) !== canonical(response.best_route) || prior.ruleset_version !== response.ruleset_version) {
      chain=appendChange(chain,{at,domain:scan.domain,from:prior?.verdict ?? null,to:response.verdict,reason_codes:codes});
    }
    await atomicJSON(join(output,'scans',`${scan.domain}.json`),scan);
    await atomicJSON(path,current);
    index.set(scan.domain,{domain:scan.domain,verdict:response.verdict,checked_at:scan.checked_at,reasons_count:response.reasons.length});
  }
  await atomicJSON(join(api,'index.json'),[...index.values()].sort((a,b)=>a.domain.localeCompare(b.domain)));
  await atomicJSON(join(api,'changes.json'),chain);
  return {count:scans.length,root_hash:chain[0]?.hash ?? null};
}
