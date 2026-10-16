import { BoundedClient, likelyBotVendor } from './network.mjs';
import { parseRobots, robotsDecision, AI_AGENTS } from './robots.mjs';
import { scanInjection, hasProduct, lookalike } from './safety.mjs';
import { discoverRoute, WELL_KNOWN } from './routes.mjs';
import { rdapLookup } from './rdap.mjs';
import { probeOutcomes } from './outcomes.mjs';
import { phishingEvidence } from './phishing.mjs';
import { createHash } from 'node:crypto';
export const SCANNER_VERSION='0.1.0';

export function parseSeeds(csv) {
  const rows=[];let row=[];let field='';let quoted=false;
  for(let i=0;i<csv.length;i++) {
    const ch=csv[i];
    if(ch==='"') {
      if(quoted && csv[i+1]==='"') {field+='"';i++;} else quoted=!quoted;
    } else if(ch===',' && !quoted) {row.push(field);field='';}
    else if(ch==='\n' && !quoted) {row.push(field.replace(/\r$/,''));if(row.some(Boolean)) rows.push(row);row=[];field='';}
    else field+=ch;
  }
  if(quoted) throw new Error('Unterminated CSV quote');
  if(field || row.length) {row.push(field.replace(/\r$/,''));rows.push(row);}
  const header=rows.shift()?.map(x=>x.trim().replace(/^\uFEFF/,''));
  const column=header?.indexOf('domain');
  if(column===undefined || column<0) throw new Error('Seed CSV requires domain header');
  const seen=new Set();
  return rows.map(fields=>{
    const domain=fields[column]?.trim().toLowerCase();
    if(!domain || domain.length>253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw new Error('Invalid domain in seed CSV');
    if(seen.has(domain)) throw new Error(`Duplicate seed domain: ${domain}`);
    seen.add(domain);
    return {domain};
  });
}
function rawProbe(result,path) {
  return {path,status:result.status ?? null,error:result.error ?? null,challenge:Boolean(result.challenge),block_page:Boolean(result.block_page),
    truncated:Boolean(result.truncated),latency_ms:result.latency_ms ?? null,
    // Header values are third-party text; only a small allowlist, capped and marked.
    headers:Object.fromEntries(Object.entries(result.headers ?? {}).map(([k,v])=>[k,{value:v.slice(0,200),untrusted_evidence:true}]))};
}

export async function scanDomain(domain,seeds,{key=null,rdap=rdapLookup,phishingFeed=null,at=new Date().toISOString(),...networkOptions}={}) {
  parseSeeds(`domain\n${domain}\n`);
  const origin=`https://${domain}`;
  const client=new BoundedClient(origin,{...networkOptions,key});
  const scan={domain,scanner_version:SCANNER_VERSION,checked_at:at,scanned:false,signed_requests:Boolean(key),
    safety:{checked_at:at,ttl_seconds:3600,complete:false,independently_verified:false,feed_status:'not checked',listed_on:[],findings:[],domain_age_days:null,
      lookalike_of:lookalike(domain,seeds),rdap:{status:'not checked'}},
    access:{checked_at:at,ttl_seconds:86400,complete:false,status:null,challenge:false,likely_bot_vendor:null,scan_status:'robots_unavailable',
      robots_training:[],robots_user_agents:[],probes:[]},
    route:{checked_at:at,ttl_seconds:86400,complete:false,routes:[],probes:[],schema_org_product:false},
    tos:{checked_at:at,ttl_seconds:604800,class:'unknown',classification:'not yet classified'},
    outcomes:{sample_size_7d:0,success_rate_7d:null,success_rate_30d:null,status:'not collected'}};
  Object.assign(scan.safety,phishingEvidence(domain,phishingFeed));
  let probeHome=null;
  const robots=await client.get('/robots.txt',{robots:true});
  scan.access.robots_probe=rawProbe(robots,'/robots.txt');
  scan.access.status=robots.status;
  scan.access.challenge=Boolean(robots.challenge);
  scan.access.likely_bot_vendor=likelyBotVendor(robots.headers ?? {});
  const valid=robots.status===200 && !robots.truncated && !robots.error && !robots.challenge && !robots.block_page && !/<(?:html|!doctype|script)\b/i.test(robots.body);
  const absent=[404,410].includes(robots.status) && !robots.error && !robots.challenge && !robots.block_page;
  const rules=valid ? parseRobots(robots.body) : absent ? [] : null;
  if(rules) {
    const decide=(agent,path='/')=>robotsDecision(rules,agent,path);
    scan.access.robots_training=AI_AGENTS.training.map(agent=>({agent,...decide(agent)}));
    scan.access.robots_user_agents=AI_AGENTS.user_triggered.map(agent=>({agent,...decide(agent)}));
    scan.access.preflight_robots=decide('PreflightBot');
    scan.access.robots_policy_status=valid?'available':'not_found';
    if(valid) scan.access.robots_sha256=createHash('sha256').update(robots.body).digest('hex');
    client.robots=path=>decide('PreflightBot',path);
    client.interval=Math.max(1000,decide('PreflightBot').crawl_delay_seconds*1000);
    client.nextAt=Math.max(client.nextAt,client.now()+client.interval);
    if(client.interval>60000) scan.access.scan_status='crawl_delay_exceeds_scan_window';
    else if(!decide('PreflightBot').allowed) scan.access.scan_status='disallowed_by_robots';
    else {
      scan.access.scan_status='ok';
      const home=await client.get('/');
      probeHome=home;
      scan.synthetic_reports=await probeOutcomes(domain,client,home,{at});
      scan.access.probes.push(rawProbe(home,'/'));
      if(home.url) {
        const probePath=new URL(home.url).pathname;
        scan.access.probe_path=probePath;
        scan.access.robots_training=AI_AGENTS.training.map(agent=>({agent,...decide(agent,probePath)}));
        scan.access.robots_user_agents=AI_AGENTS.user_triggered.map(agent=>({agent,...decide(agent,probePath)}));
      }
      scan.access.status=home.status;
      scan.access.challenge=Boolean(home.challenge);
      scan.access.block_page=Boolean(home.block_page);
      scan.access.pay_per_crawl=home.pay_per_crawl ?? null;
      scan.access.likely_bot_vendor=likelyBotVendor(home.headers ?? {}) ?? scan.access.likely_bot_vendor;
      scan.access.complete=!home.error && home.status!==null;
      scan.scanned=home.status===200 && !home.error && !home.challenge && !home.block_page;
      if(scan.scanned) {
        scan.safety.findings=scanInjection(home.body);
        scan.safety.homepage_sha256=createHash('sha256').update(home.body).digest('hex');
        scan.safety.homepage_truncated=home.truncated;
        scan.route.schema_org_product=hasProduct(home.body);
        scan.route.routes.push({type:'browser',status:'discovered',endpoint:origin+'/',auth:'unknown',discovered_by:'preflight_scan',discovery_path:'/'});
        if(scan.route.schema_org_product) scan.route.routes.push({type:'structured_feed',status:'discovered',endpoint:origin+'/',auth:'none',discovered_by:'preflight_scan',discovery_path:'/'});
        let routeComplete=true;
        for(const path of WELL_KNOWN) {
          if(client.halted) {routeComplete=false;break;}
          if(!client.robots(path).allowed) {scan.route.probes.push({path,status:null,error:'disallowed_by_robots'});continue;}
          const probe=await client.get(path);
          scan.route.probes.push(rawProbe(probe,path));
          if(probe.error || probe.truncated || probe.challenge || probe.status>=500 || [401,403,429,402].includes(probe.status)) routeComplete=false;
          // Redirects cannot relabel some unrelated page as a discovery manifest.
          if(probe.url===origin+path) scan.route.routes.push(...discoverRoute(probe,origin));
        }
        scan.route.complete=routeComplete;
      } else scan.access.scan_status=home.challenge?'challenge':home.error ?? 'blocked_or_unavailable';
    }
  }
  if(!scan.synthetic_reports) scan.synthetic_reports=await probeOutcomes(domain,client,probeHome,{at});
  // RDAP is an explicit independent registration query, not a page-supplied URL.
  scan.safety.rdap=await rdap(domain,{key,at});
  scan.safety.domain_age_days=scan.safety.rdap.domain_age_days;
  scan.safety.complete=scan.scanned && !scan.safety.homepage_truncated && !scan.safety.findings.some(x=>x.code==='HTML_INSPECTION_LIMIT') && scan.safety.rdap.status==='ok';
  scan.access.request_count=client.requests;
  scan.finished_at=new Date().toISOString();
  return scan;
}
