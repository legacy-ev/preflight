import { cachedItem } from './facts-cache.mjs';
export const PACKAGES=[['npm','@modelcontextprotocol/sdk'],['PyPI','mcp'],['PyPI','langchain'],['PyPI','langchain-core'],['npm','@langchain/core'],['PyPI','llama-index'],['npm','playwright'],['npm','puppeteer'],['PyPI','selenium'],['PyPI','browser-use'],['PyPI','openai'],['PyPI','anthropic'],['PyPI','crewai'],['PyPI','autogen-agentchat'],['PyPI','litellm']];
const LICENCES={GHSA:{licence:'CC-BY-4.0',attribution:'GitHub Advisory Database',source:'https://github.com/github/advisory-database'},PYSEC:{licence:'CC-BY-4.0',attribution:'PyPI Advisory Database',source:'https://github.com/pypa/advisory-database'},MAL:{licence:'Apache-2.0',attribution:'OpenSSF Malicious Packages',source:'https://github.com/ossf/malicious-packages'}};
const token=v=>{if(typeof v!=='string'||v.length>200||!v.length)throw Error('Invalid token');return v;};
export function advisorySummary(v,[ecosystem,name],at) {
  if(!v||typeof v.id!=='string'||! /^(?:GHSA|PYSEC|MAL)-[a-zA-Z0-9-]+$/.test(v.id)||!LICENCES[v.id.split('-')[0]]||v.withdrawn)return null;
  const published=Date.parse(v.published),now=Date.parse(at);
  if(!Number.isFinite(published)||published>now||published<now-30*86400000)return null;
  const affected=(v.affected||[]).filter(a=>a.package?.ecosystem===ecosystem&&a.package.name===name);
  if(!affected.length)return null;
  return {id:token(v.id),severity:(v.severity||[]).map(s=>({type:token(s.type),score:token(s.score)})),package:{ecosystem,name},affected_range:affected.flatMap(a=>(a.ranges||[]).map(r=>({type:token(r.type),events:(r.events||[]).map(e=>{
    const keys=Object.keys(e);if(keys.length!==1||!['introduced','fixed','last_affected','limit'].includes(keys[0]))throw Error('Invalid event');return {[keys[0]]:token(e[keys[0]])};
  })}))),published_date:new Date(published).toISOString(),link:`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`};
}
// GET-only bounded discovery respects "no posting". OSV package search is a
// POST-only method, so never silently claim this sample is a full package query.
export async function vulnerabilityFacts({read,root,at}) {
  const byEcosystem={};
  for(const ecosystem of ['npm','PyPI']) {
    const source=`https://storage.googleapis.com/osv-vulnerabilities/${ecosystem}/modified_id.csv`;
    byEcosystem[ecosystem]=await cachedItem({root,source,at,load:async()=>{
      const text=await read(source);const complete=Buffer.byteLength(text)>=65536&&!text.endsWith('\n')?text.slice(0,text.lastIndexOf('\n')+1):text;const lines=complete.trim().split('\n');
      if(!lines.length||!lines.every(l=>/^\d{4}-\d\d-\d\dT[^,]+,(?:[A-Za-z0-9-]+)$/.test(l)))throw Error('Invalid change index');
      const recent=lines.filter(l=>{const d=Date.parse(l.split(',')[0]);return d<=Date.parse(at)&&d>=Date.parse(at)-30*86400000;});
      const ids=[...new Set(recent.map(l=>l.split(',')[1]))].slice(0,20);
      const records=[];let failed=0,excluded=0;
      for(const id of ids){
        if(!LICENCES[id.split('-')[0]]){excluded++;continue;}
        try{
          const v=JSON.parse(await read(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`));
          if(v.id!==id)throw Error('ID mismatch');
          for(const pkg of PACKAGES.filter(p=>p[0]===ecosystem)){const record=advisorySummary(v,pkg,at);if(record)records.push(record);}
        }catch{failed++;}
      }
      return {status:'ok',records,queried_records:ids.length,failed_records:failed,excluded_licence_records:excluded,coverage:'bounded_recent_changes_sample_not_complete_package_search',recent_days:30,record_cap:20,attribution:LICENCES,licence_reference:'https://google.github.io/osv.dev/data/'};
    }});
  }
  return PACKAGES.map(([ecosystem,name])=>{
    const item=byEcosystem[ecosystem];
    return {...item,value:item.value.status==='ok'?{...item.value,package:{ecosystem,name},records:item.value.records.filter(r=>r.package.name===name),no_matches_means_no_known_vulnerability:false,package_search:'unavailable_post_disallowed',link_only:true,link:`https://osv.dev/list?q=${encodeURIComponent(name)}`}:{...item.value,package:{ecosystem,name}}};
  });
}
