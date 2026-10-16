import { extendedFacts,extendSections,publishExtended } from './extended-facts.mjs';
import { toolingSummary } from '../agent_tooling/index.mjs';
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { domainIdentity } from './domain-identity.mjs';
import { fleetSections } from './fleet.mjs';
import { statusItem } from './status.mjs';
import { computeSummary } from '../compute/build.mjs';
import { envelope } from '../scanner/signing.mjs';
import { PHISHING_FEED_TTL_SECONDS,HOLIDAYS,BASE,PRICES,AGENTS,FX,REGISTRY,STATUS,CLOUD_LINKS,COUNTRIES,ZONES,MODELS,OWASP,PROTOCOLS,PATTERNS,FAILURES } from './sources.mjs';
const DOMAIN=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export { statusSummary } from './status.mjs';
export function priceSummary(data) {
  return MODELS.map(model=>{
    const r=data[model];
    if(!r || ![r.input_cost_per_token,r.output_cost_per_token].every(n=>typeof n==='number' && Number.isFinite(n) && n>=0)) return {model,status:'unavailable'};
    return {model,status:'ok',currency:'USD',unit:'per_token',input:r.input_cost_per_token,output:r.output_cost_per_token};
  });
}
export function agentSummary(data) {
  if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Invalid UA data');
  const names=Object.keys(data);
  if(!names.length || names.length>2000 || names.some(x=>!/^[-a-zA-Z0-9_. /+]{1,200}$/.test(x))) throw new Error('Invalid UA tokens');
  return names.sort();
}
export function fxSummary(xml) {
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsafe XML');
  const date=xml.match(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/i)?.[1];
  const rates=Object.fromEntries([...xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"](\d+(?:\.\d+)?)['"]\s*\/?\s*>/g)].map(m=>[m[1],Number(m[2])]));
  if(!date || !Object.keys(rates).length || Object.values(rates).some(x=>!Number.isFinite(x)||x<=0)) throw new Error('Invalid FX');
  return {base:'EUR',rate_date:date,rates,attribution:'European Central Bank',free_source:'Rates are available free of charge from the ECB.',use:'Reference only; not transaction rates.'};
}
export function registrySummary(data) {
  if(!Array.isArray(data?.servers) || !data.metadata || !Number.isSafeInteger(data.metadata.count) || data.metadata.count!==data.servers.length) throw new Error('Invalid Registry data');
  const complete=!data.metadata.nextCursor;
  return {reachable:true,returned_records:data.servers.length,server_count:complete?data.servers.length:null,count_scope:complete?'complete_latest_page':'page_only',total_count_status:complete?'ok':'unavailable'};
}
export function timezoneOffsets(at) {
  const date=new Date(at);
  return ZONES.map(zone=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,calendar:'gregory',numberingSystem:'latn',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
    const fields=Object.fromEntries(parts.map(({type,value})=>[type,Number(value)]));
    // Interpret the zone's wall clock as UTC to calculate its numeric offset.
    const local=Date.UTC(fields.year,fields.month-1,fields.day,fields.hour,fields.minute,fields.second);
    const minutes=Math.round((local-Math.floor(date.getTime()/1000)*1000)/60000);
    const absolute=Math.abs(minutes);
    return {zone,offset:`UTC${minutes<0?'-':'+'}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`};
  });
}
export function holidaySummary(data) {
  const divisions=['england-and-wales','scotland','northern-ireland'];
  return {attribution:'Contains public sector information licensed under the Open Government Licence v3.0.',
    licence:'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    divisions:divisions.map(division=>{
      const events=data?.[division]?.events;
      if(data?.[division]?.division!==division || !Array.isArray(events) || !events.length || events.length>1000) throw new Error('Invalid holidays');
      return {division,events:events.map(e=>{
        if(typeof e.title!=='string' || e.title.length>200 || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || typeof e.bunting!=='boolean' || typeof e.notes!=='string' || e.notes.length>200) throw new Error('Invalid holiday');
        return {title:e.title,date:e.date,notes:e.notes,bunting:e.bunting};
      })};
    })};
}
export async function buildContext({read,root='public-data',at=new Date().toISOString(),key=null,changes}={}) {
  const item=(value,source,ttl_seconds=3600,extra={})=>({value,source,checked_at:at,ttl_seconds,...extra});
  const unavailable=(source,reason)=>item({status:'unavailable',reason},source);
  const load=async(url,parse,untrusted=false)=>{
    try {return item({status:'ok',data:parse(await read(url))},url,3600,untrusted?{untrusted_evidence:true}:{});}
    catch {return unavailable(url,'fetch_or_validation_failed');}
  };
  const internet_status=await Promise.all(STATUS.map(s=>statusItem(s,{read,at}))); 
  internet_status.push(...Object.entries(CLOUD_LINKS).map(([provider,url])=>item({provider,status:'unavailable',link_only:true,reason:'commercial_reuse_unverified'},url)));
  const [prices,agents,fx,registry,holidays]=await Promise.all([
    load(PRICES,s=>priceSummary(JSON.parse(s))),load(AGENTS,s=>agentSummary(JSON.parse(s)),true),load(FX,fxSummary),load(REGISTRY,s=>registrySummary(JSON.parse(s))),load(HOLIDAYS,s=>holidaySummary(JSON.parse(s)),true)
  ]);
  let index;
  try {index=JSON.parse(await readFile(join(root,'api/v1/index.json'),'utf8'));if(!Array.isArray(index)) throw new Error();}
  catch {index=null;}
  const counts={GO:0,CAUTION:0,STOP:0};const sites=[];const findings={};const envelopes=[];const feedCounts={checked:0,listed:0,expired:0,unavailable:0};
  for(const row of index || []) {
    if(!row || !DOMAIN.test(row.domain) || row.domain.length>253 || !Object.hasOwn(counts,row.verdict)) continue;
    try {
      const raw=JSON.parse(await readFile(join(root,'api/v1/preflight',`${row.domain}.json`),'utf8'));
      if(raw.response?.domain!==row.domain || !Object.hasOwn(counts,raw.response.verdict) || !Number.isFinite(Date.parse(raw.response.generated_at))) throw new Error();
      const r=raw.response;
      const checked_at=row.checked_at ?? r.generated_at;
      if(!Number.isFinite(Date.parse(checked_at))) throw new Error('Invalid scan timestamp');
      counts[r.verdict]++;
      if(r.safety?.feed_status==='ok') {
        const age=Date.parse(at)-Date.parse(r.safety.feed_checked_at);
        if(age>=0 && age<=PHISHING_FEED_TTL_SECONDS*1000) feedCounts.checked++;else feedCounts.expired++;
      } else feedCounts.unavailable++;
      if(r.safety?.listed_on?.includes('https://hole.cert.pl/domains/v2/domains.txt')) feedCounts.listed++;
      sites.push(item({domain:row.domain,verdict:r.verdict,preflight:`${BASE}/api/v1/preflight/${row.domain}.json`,context:`${BASE}/api/v1/context/${row.domain}.json`},`${BASE}/api/v1/preflight/${row.domain}.json`,86400,{checked_at}));
      for(const code of (Array.isArray(r.safety?.injection_findings)?r.safety.injection_findings:[])) if(PATTERNS.some(p=>p[0]===code)) findings[code]=(findings[code] || 0)+1;
      envelopes.push([row.domain,raw]);
    } catch {sites.push(unavailable(`${BASE}/api/v1/preflight/${row.domain}.json`,'local_response_unavailable'));}
  }
  const oldest=sites.filter(x=>x.value.domain).map(x=>x.checked_at).sort((a,b)=>Date.parse(a)-Date.parse(b))[0] || at;
  const expired=sites.some(x=>x.value.domain && (Date.parse(at)-Date.parse(x.checked_at)>3600*1000 || Date.parse(x.checked_at)>Date.parse(at)));
  const summaryStatus=!index || envelopes.length!==index.length?'unavailable':expired?'expired':'ok';
  const sections={
    agent_tooling:await toolingSummary({root,at}),
    internet_status,
    compute:await computeSummary({root,at}),
    llm_providers:[...internet_status.filter(x=>['OpenAI','Anthropic'].includes(x.value.provider)),prices],
    sites:[item(index?{status:summaryStatus,counts,index_domains:index.length,available_domains:envelopes.length}:{status:'unavailable'},`${BASE}/api/v1/index.json`,3600,{checked_at:oldest}),...sites],
    agent_ecosystem:[agents,...PROTOCOLS.map(p=>item({name:p.name,path:p.path,scope:'discovery_only_not_a_route'},p.source,604800)),registry],
    world:[item({utc:at},'https://www.rfc-editor.org/rfc/rfc3339',3600),item(timezoneOffsets(at),'https://www.iana.org/time-zones',3600),
      ...COUNTRIES.filter(x=>x!=='GB').map(country=>item({country,date:at.slice(0,10),status:'unavailable',reason:'commercial_api_requires_sponsorship',link_only:true},`https://date.nager.at/api/v3/PublicHolidays/${at.slice(0,4)}/${country}`,86400)),holidays,fx,
      ...(changes || JSON.parse(await readFile(new URL('../data/what-changed.json',import.meta.url),'utf8'))).map(c=>{
        const url=new URL(c.url);if(url.protocol!=='https:' || url.username || url.password || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) throw new Error('Invalid curated link');
        return item({url:c.url,date:c.date},c.url,604800);
      })],
    safety:[...PATTERNS.map(([code,pattern])=>item({code,pattern},OWASP,604800)),item(index?{status:summaryStatus,counts_by_pattern:findings,phishing_feed_counts:feedCounts,available_domains:envelopes.length,index_domains:index.length,scope:'published_preflight_responses',not_a_clean_bill_of_health:true}:{status:'unavailable'},`${BASE}/api/v1/index.json`,3600,{checked_at:oldest})],
    failure_modes:[...FAILURES.map(([code,failure,avoid,source])=>item({code,failure,avoid},source,604800)),...fleetSections().failure_modes],
    preflight_checklist:fleetSections().preflight_checklist,
  };
  const facts=await extendedFacts({read,root,at,key});extendSections(sections,facts);
  const response={schema_version:'1.0.0',advisory:true,notices:`${BASE}/context-NOTICES.txt`,sections};
  return {timezones:facts.timezones.file,core:envelope(response,key,at),domains:envelopes.map(([domain,preflight])=>[domain,envelope({...response,domain,preflight,sections:{...sections,domain_identity:[domainIdentity(domain)]}},key,at)])};
}
export async function publishContext(result,root) {
  const directory=join(root,'api/v1');await mkdir(directory,{recursive:true});await publishExtended(result,root);
  const stage=join(directory,'context.tmp');await rm(stage,{recursive:true,force:true});await mkdir(stage);
  for(const [domain,value] of result.domains) {
    if(!DOMAIN.test(domain)) throw new Error('Invalid output domain');
    await writeFile(join(stage,`${domain}.json`),JSON.stringify(value)+'\n');
  }
  await writeFile(join(directory,'context.json.tmp'),JSON.stringify(result.core)+'\n');
  await rm(join(directory,'context'),{recursive:true,force:true});await rename(stage,join(directory,'context'));
  await rename(join(directory,'context.json.tmp'),join(directory,'context.json'));
}
