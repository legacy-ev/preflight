import { mkdir, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
const REPORTER={operator:'preflight',agent_family:'preflight-synthetic',agent_version:'1.0'};
const RESULTS=['success','partial','blocked','challenged','failed','aborted_safety'];
const fields=['domain','intent','route_used','result','attempted_at','reporter','self_identified','signed_requests'];
// A deliberately narrower subset of outcome-report.schema.json for our local producer.
export function validSyntheticReport(r) {
 return Boolean(r && Object.keys(r).length===fields.length && fields.every(k=>Object.hasOwn(r,k)) &&
 /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(r.domain) &&
 r.intent==='read' && r.route_used==='browser' && RESULTS.includes(r.result) &&
 typeof r.attempted_at==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(r.attempted_at) && Number.isFinite(Date.parse(r.attempted_at)) &&
 r.self_identified===true && typeof r.signed_requests==='boolean' && r.reporter &&
 Object.keys(r.reporter).length===3 && Object.entries(REPORTER).every(([k,v])=>r.reporter[k]===v));
}
function result(page) {
 if(!page) return 'aborted_safety';
 if(page.challenge) return 'challenged';
 if(page.block_page || [401,403,429].includes(page.status)) return 'blocked';
 return page.status===200 && !page.error && !page.truncated ? 'success' : 'failed';
}
export async function probeOutcomes(domain,client,home,{at=new Date().toISOString()}={}) {
 const make=(intent,value)=>({domain,intent,route_used:'browser',result:value,attempted_at:at,reporter:{...REPORTER},self_identified:true,signed_requests:Boolean(client.key)});
 const reports=[make('read',result(home))];
 if(!reports.every(validSyntheticReport)) throw new Error('Invalid synthetic report');
 return reports;
}
export function aggregateOutcomes(reports,domain,intent,at=new Date().toISOString()) {
 const now=Date.parse(at); const unique=new Map();
 for(const r of reports) {
  if(!validSyntheticReport(r) || r.domain!==domain || r.intent!==intent) continue;
  const age=now-Date.parse(r.attempted_at);
  if(age<0 || age>=30*86400000) continue;
  const id=r.attempted_at.slice(0,10);
  if(!unique.has(id) || r.attempted_at>unique.get(id).attempted_at) unique.set(id,r);
 }
 const cell=days=>{
  const rows=[...unique.values()].filter(r=>now-Date.parse(r.attempted_at)<days*86400000);
  return rows.length<5 ? {n:0,rate:null} : {n:rows.length,rate:rows.filter(r=>r.result==='success').length/rows.length};
 };
 const week=cell(7),month=cell(30);
 return {checked_at:at,ttl_seconds:86400,sample_size_7d:week.n,sample_size_30d:month.n,success_rate_7d:week.rate,success_rate_30d:month.rate,
  status:'synthetic_only',verified_operators:1,max_operator_weight:1,confirmed_by_probe:true,quarantined:false};
}
export async function storeOutcomes(scans,{output,at=new Date().toISOString()}) {
 const dir=join(output,'outcomes'); await mkdir(dir,{recursive:true});
 const date=at.slice(0,10), path=join(dir,`${date}.json`);
 let daily=[]; try {daily=JSON.parse(await readFile(path,'utf8'));} catch(e) {if(e.code!=='ENOENT') throw e;}
 if(!Array.isArray(daily) || !daily.every(validSyntheticReport)) throw new Error('Invalid daily outcomes');
 const map=new Map(daily.map(r=>[`${r.domain}:${r.intent}`,r]));
 for(const scan of scans) for(const r of scan.synthetic_reports ?? []) {
  if(!validSyntheticReport(r) || r.attempted_at.slice(0,10)!==date) throw new Error('Invalid generated outcome');
  map.set(`${r.domain}:${r.intent}`,r);
 }
 await writeFile(`${path}.tmp`,JSON.stringify([...map.values()],null,2)+'\n'); await rename(`${path}.tmp`,path);
 const history=[];
 for(const file of await readdir(dir)) {
  if(!/^\d{4}-\d\d-\d\d\.json$/.test(file)) continue;
  const age=Date.parse(at)-Date.parse(file.slice(0,10)); if(age<0 || age>31*86400000) continue;
  const rows=JSON.parse(await readFile(join(dir,file),'utf8'));
  if(!Array.isArray(rows)) throw new Error('Invalid outcome history');
  history.push(...rows.filter(r=>validSyntheticReport(r) && r.attempted_at.slice(0,10)===file.slice(0,10)));
 }
 for(const scan of scans) {
  scan.outcomes_by_intent=Object.fromEntries(['read'].map(intent=>[intent,aggregateOutcomes(history,scan.domain,intent,at)]));
  scan.outcomes=scan.outcomes_by_intent.read;
 }
}
