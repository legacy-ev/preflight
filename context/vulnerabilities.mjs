import { cachedItem } from './facts-cache.mjs';
export const PACKAGES=[['npm','@modelcontextprotocol/sdk'],['PyPI','mcp'],['PyPI','langchain'],['PyPI','langchain-core'],['npm','@langchain/core'],['PyPI','llama-index'],['npm','playwright'],['npm','puppeteer'],['PyPI','selenium'],['PyPI','browser-use'],['PyPI','openai'],['PyPI','anthropic'],['PyPI','crewai'],['PyPI','autogen-agentchat'],['PyPI','litellm']];
const LICENCES={GHSA:{licence:'CC-BY-4.0',attribution:'GitHub Advisory Database',source:'https://github.com/github/advisory-database'},PYSEC:{licence:'CC-BY-4.0',attribution:'PyPI Advisory Database',source:'https://github.com/pypa/advisory-database'},MAL:{licence:'Apache-2.0',attribution:'OpenSSF Malicious Packages',source:'https://github.com/ossf/malicious-packages'}};
const token=v=>{if(typeof v!=='string'||v.length>200||!v.length)throw Error('Invalid token');return v;};
export function advisorySummary(v,[ecosystem,name],at) {
  if(!v||typeof v.id!=='string'||! /^(?:GHSA|PYSEC|MAL)-[a-zA-Z0-9-]+$/.test(v.id)||!LICENCES[v.id.split('-')[0]]||v.withdrawn)return null;
  const published=Date.parse(v.published),now=Date.parse(at);
  if(!Number.isFinite(published)||published>now||published<now-30*86400000)return null;
  const affected=(v.affected||[]).filter(a=>a.package?.ecosystem===ecosystem&&a.package.name===name);
  if(!affected.length||!highSeverity(v,affected))return null;
  return {id:token(v.id),severity:(v.severity||[]).map(s=>({type:token(s.type),score:token(s.score)})),package:{ecosystem,name},affected_range:affected.flatMap(a=>(a.ranges||[]).map(r=>({type:token(r.type),events:(r.events||[]).map(e=>{
    const keys=Object.keys(e);if(keys.length!==1||!['introduced','fixed','last_affected','limit'].includes(keys[0]))throw Error('Invalid event');return {[keys[0]]:token(e[keys[0]])};
  })}))),published_date:new Date(published).toISOString(),link:`https://osv.dev/vulnerability/${encodeURIComponent(v.id)}`};
}
// One bounded response per requested package; pagination is reported, never hidden.
export async function vulnerabilityFacts({read,root,at}) {
  const items=[];
  for(const [ecosystem,name] of PACKAGES) {
    const source=`https://api.osv.dev/v1/query?ecosystem=${encodeURIComponent(ecosystem)}&name=${encodeURIComponent(name)}`;
    items.push(await cachedItem({root,source,at,load:async()=>{
      const data=JSON.parse(await read('https://api.osv.dev/v1/query',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({package:{ecosystem,name}})
      }));
      if(!data||typeof data!=='object'||Array.isArray(data)||
        (data.vulns!==undefined&&!Array.isArray(data.vulns)))throw Error('Invalid query response');
      const records=[];let excluded=0,failed=0,matches=0;
      for(const v of data.vulns||[]) {
        if(!LICENCES[v?.id?.split('-')[0]]){excluded++;continue;}
        try {const record=advisorySummary(v,[ecosystem,name],at);if(record){matches++;if(records.length<20)records.push(record);}}
        catch{failed++;}
      }
      return {status:'ok',package:{ecosystem,name},records,queried_records:(data.vulns||[]).length,
        failed_records:failed,excluded_licence_records:excluded,coverage:'bounded_package_query',
        truncated:Boolean(data.next_page_token)||matches>20,recent_days:30,record_cap:20,
        no_matches_means_no_known_vulnerability:false,attribution:LICENCES,licence_reference:'https://google.github.io/osv.dev/data/'};
    }}));
    if(items.at(-1).value.status!=='ok')items.at(-1).value.package={ecosystem,name};
  }
  return items;
}

function highSeverity(v,affected) {
  const ratings=[v.database_specific?.severity,...affected.map(a=>a.ecosystem_specific?.severity)];
  if(ratings.some(r=>typeof r==='string'&&['HIGH','CRITICAL'].includes(r.toUpperCase())))return true;
  return (v.severity||[]).some(s=>{
    const score=Number(s.score);
    if(Number.isFinite(score)&&score>=7&&score<=10)return true;
    if(!/^CVSS:3\.[01]\//.test(s.score))return false;
    const m=Object.fromEntries(s.score.split('/').slice(1).map(x=>x.split(':')));
    if(!['U','C'].includes(m.S))return false;
    const changed=m.S==='C';
    const av={N:.85,A:.62,L:.55,P:.2}[m.AV],ac={L:.77,H:.44}[m.AC];
    const pr=(changed?{N:.85,L:.68,H:.5}:{N:.85,L:.62,H:.27})[m.PR],ui={N:.85,R:.62}[m.UI];
    const weight={N:0,L:.22,H:.56};
    const iss=1-(1-weight[m.C])*(1-weight[m.I])*(1-weight[m.A]);
    const impact=changed?7.52*(iss-.029)-3.25*(iss-.02)**15:6.42*iss;
    const base=impact<=0?0:Math.min((changed?1.08:1)*(impact+8.22*av*ac*pr*ui),10);
    return Math.ceil((base-1e-10)*10)/10>=7;
  });
}
