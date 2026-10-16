import { DAILY_TTL,cachedItem } from './facts-cache.mjs';
export const PACKAGES=[['npm','@modelcontextprotocol/sdk'],['PyPI','mcp'],['PyPI','langchain'],['PyPI','langchain-core'],['npm','@langchain/core'],['PyPI','llama-index'],['npm','playwright'],['npm','puppeteer'],['PyPI','selenium'],['PyPI','browser-use'],['PyPI','openai'],['PyPI','anthropic'],['PyPI','crewai'],['PyPI','autogen-agentchat'],['PyPI','litellm']];
const LICENCES={GHSA:{licence:'CC-BY-4.0',attribution:'GitHub Advisory Database',source:'https://github.com/github/advisory-database'},PYSEC:{licence:'CC-BY-4.0',attribution:'PyPI Advisory Database',source:'https://github.com/pypa/advisory-database'},MAL:{licence:'Apache-2.0',attribution:'OpenSSF Malicious Packages',source:'https://github.com/ossf/malicious-packages'}};
const token=v=>{if(typeof v!=='string'||v.length>200||!v.length)throw Error('Invalid token');return v;};
export function advisorySummary(v,[ecosystem,name],at) {
  if(!v||typeof v.id!=='string'||! /^(?:GHSA|PYSEC|MAL)-[a-zA-Z0-9-]+$/.test(v.id)||!LICENCES[v.id.split('-')[0]]||v.withdrawn)return null;
  const published=Date.parse(v.published),now=Date.parse(at);
  if(!Number.isFinite(published)||published>now)return null;
  const affected=(v.affected||[]).filter(a=>a.package?.ecosystem===ecosystem&&a.package.name===name);
  if(!affected.length)return null;
  const rating=severityRating(v,affected);
  return {id:token(v.id),severity_level:rating,highlight:['critical','high'].includes(rating),source:`https://api.osv.dev/v1/vulns/${encodeURIComponent(v.id)}`,checked_at:at,ttl_seconds:DAILY_TTL,attribution:{provider:'OSV',provider_source:'https://osv.dev/',...LICENCES[v.id.split('-')[0]],licence_url:v.id.startsWith('MAL-')?'https://www.apache.org/licenses/LICENSE-2.0':'https://creativecommons.org/licenses/by/4.0/'},severity:(v.severity||[]).map(s=>({type:token(s.type),score:token(s.score)})),package:{ecosystem,name},affected_range:affected.flatMap(a=>(a.ranges||[]).map(r=>({type:token(r.type),events:(r.events||[]).map(e=>{
    const keys=Object.keys(e);if(keys.length!==1||!['introduced','fixed','last_affected','limit'].includes(keys[0]))throw Error('Invalid event');return {[keys[0]]:token(e[keys[0]])};
  })}))),published_date:new Date(published).toISOString(),link:`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`};
}
export const BATCH_URL='https://api.osv.dev/v1/querybatch';
export const LIMITS={batch_requests:5,detail_requests:300,records_per_package:100};
// Lazy shared lookup: a fully fresh cache performs no network requests.
export async function vulnerabilityFacts({read,root,at}) {
  let batch;
  const details=new Map();
  async function lookup() {
    const results=PACKAGES.map(()=>({vulns:[],truncated:false}));
    let pending=PACKAGES.map(([ecosystem,name],index)=>({index,package:{ecosystem,name}}));
    for(let page=0;pending.length&&page<LIMITS.batch_requests;page++) {
      const data=JSON.parse(await read(BATCH_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries:pending.map(({package:pkg,page_token})=>({package:pkg,...(page_token?{page_token}:{})}))})}));
      if(!Array.isArray(data?.results)||data.results.length!==pending.length)throw Error('Invalid batch response');
      const next=[];
      data.results.forEach((r,i)=>{
        if(!r||typeof r!=='object'||Array.isArray(r)||(r.vulns!==undefined&&!Array.isArray(r.vulns))||r.error||
          (r.next_page_token!==undefined&&(typeof r.next_page_token!=='string'||r.next_page_token.length>4096)))throw Error('Invalid package response');
        const target=results[pending[i].index];
        for(const v of r.vulns||[]) {
          if(typeof v?.id!=='string'||! /^[a-zA-Z0-9-]{1,200}$/.test(v.id))throw Error('Invalid advisory ID');
          if(!target.vulns.some(x=>x.id===v.id)) {
            if(target.vulns.length<LIMITS.records_per_package)target.vulns.push(v);
            else target.truncated=true;
          }
        }
        if(r.next_page_token) {
          if(page+1<LIMITS.batch_requests&&!target.truncated)next.push({...pending[i],page_token:r.next_page_token});
          else target.truncated=true;
        }
      });
      pending=next;
    }
    return results;
  }
  const items=[];
  for(const [index,[ecosystem,name]] of PACKAGES.entries()) {
    // Keep the existing package cache key, so outages can reuse prior projections.
    const source=`https://api.osv.dev/v1/query?ecosystem=${encodeURIComponent(ecosystem)}&name=${encodeURIComponent(name)}`;
    const item=await cachedItem({root,source,at,preserveOnFailure:true,load:async()=>{
      batch??=lookup();
      const data=(await batch)[index];
      const records=[];let excluded=0,truncated=data.truncated;
      for(const v of data.vulns) {
        if(!LICENCES[v.id.split('-')[0]]){excluded++;continue;}
        if(!details.has(v.id)) {
          if(details.size>=LIMITS.detail_requests){truncated=true;continue;}
          details.set(v.id,read(`https://api.osv.dev/v1/vulns/${encodeURIComponent(v.id)}`).then(JSON.parse));
        }
        const detail=await details.get(v.id);
        if(detail?.id!==v.id||!Array.isArray(detail.affected)||(!detail.withdrawn&&!Number.isFinite(Date.parse(detail.published))))throw Error('Invalid advisory detail');
        const record=advisorySummary(detail,[ecosystem,name],at);
        if(record)records.push(record);
      }
      records.sort((a,b)=>['critical','high','medium','low','unknown'].indexOf(a.severity_level)-['critical','high','medium','low','unknown'].indexOf(b.severity_level)||a.id.localeCompare(b.id));
      return {status:'ok',query_source:BATCH_URL,package:{ecosystem,name},records,queried_records:data.vulns.length,
        excluded_licence_records:excluded,coverage:'bounded_package_querybatch',truncated,
        record_cap:LIMITS.records_per_package,request_limits:LIMITS,version_scope:'all_versions',
        no_matches_means_no_known_vulnerability:false,attribution:{provider:'OSV',databases:LICENCES},licence_reference:'https://google.github.io/osv.dev/data/'};
    }});
    if(item.value.status!=='ok')item.value.package={ecosystem,name};
    items.push(item);
  }
  return items;
}

function severityRating(v,affected) {
  const ratings=[v.database_specific?.severity,...affected.map(a=>a.ecosystem_specific?.severity)].map(x=>typeof x==='string'?x.toLowerCase():'');
  if(ratings.includes('critical')||scoreAtLeast(v,9))return 'critical';
  if(ratings.includes('high')||scoreAtLeast(v,7))return 'high';
  if(ratings.some(x=>['medium','moderate'].includes(x))||scoreAtLeast(v,4))return 'medium';
  if(ratings.includes('low')||scoreAtLeast(v,0.1))return 'low';
  return 'unknown';
}

function scoreAtLeast(v,threshold) {
  return (v.severity||[]).some(s=>{
    const score=Number(s.score);
    if(Number.isFinite(score)&&score>=threshold&&score<=10)return true;
    if(!/^CVSS:3\.[01]\//.test(s.score))return false;
    const m=Object.fromEntries(s.score.split('/').slice(1).map(x=>x.split(':')));
    if(!['U','C'].includes(m.S))return false;
    const changed=m.S==='C';
    const av={N:.85,A:.62,L:.55,P:.2}[m.AV],ac={L:.77,H:.44}[m.AC];
    const pr=(changed?{N:.85,L:.68,H:.5}:{N:.85,L:.62,H:.27})[m.PR],ui={N:.85,R:.62}[m.UI];
    const weight={N:0,L:.22,H:.56};
    const iss=1-(1-weight[m.C])*(1-weight[m.I])*(1-weight[m.A]);
    const impact=changed?(s.score.startsWith('CVSS:3.1/')?7.52*(iss-.029)-3.25*(iss*.9731-.02)**13:7.52*(iss-.029)-3.25*(iss-.02)**15):6.42*iss;
    const base=impact<=0?0:Math.min((changed?1.08:1)*(impact+8.22*av*ac*pr*ui),10);
    return Math.ceil((base-1e-10)*10)/10>=threshold;
  });
}
