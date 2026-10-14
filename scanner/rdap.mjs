import { setTimeout as sleep } from 'node:timers/promises';
import { domainAge } from './safety.mjs';
import { readBounded, validatePublicURL } from './network.mjs';
import { requestHeaders } from './signing.mjs';
import { publicFetch } from './transport.mjs';

// One queue for the bootstrap/registry service, shared across scan workers.
let queue=Promise.resolve();
let nextAt=0;
export function rdapLookup(domain,{key=null,fetchImpl=null,allowSyntheticDNS=false,validateURL=validatePublicURL,timeoutMs=12000,at=new Date().toISOString()}={}) {
  const fetchRequest=fetchImpl ?? ((url,options)=>publicFetch(url,options,{allowSyntheticDNS}));
  const job=queue.then(async()=>{
    await sleep(Math.max(0,nextAt-Date.now()));
    let url=`https://rdap.org/domain/${encodeURIComponent(domain)}`;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let status=null;
    try {
      for(let i=0;i<5;i++) {
        const u=new URL(url);
        if(u.protocol!=='https:' || u.username || u.password || u.search || u.hash || !u.pathname.toLowerCase().endsWith(`/domain/${domain.toLowerCase()}`) || !await validateURL(url)) return {status:'unsafe_redirect',domain_age_days:null};
        const response=await fetchRequest(url,{method:'GET',redirect:'manual',headers:{...requestHeaders(url,key),'Accept':'application/rdap+json, application/json'},signal:controller.signal});
        status=response.status;
        if(status>=300 && status<400) {
          await response.body?.cancel();
          const location=response.headers.get('location');
          if(!location) break;
          url=new URL(location,url).href;
          await sleep(1000);
          continue;
        }
        if(status!==200) {await response.body?.cancel();break;}
        const result=await readBounded(response,262144);
        if(result.truncated) return {status:'truncated',http_status:status,domain_age_days:null};
        const data=JSON.parse(result.body);
        // Store only registration facts, never RDAP contact details or notices.
        if(data.ldhName?.toLowerCase()!==domain.toLowerCase()) return {status:'domain_mismatch',http_status:status,domain_age_days:null};
        const domain_age_days=domainAge(data,at);
        return {status:domain_age_days===null?'registration_unavailable':'ok',http_status:status,domain_age_days,checked_at:at};
      }
      return {status:'unavailable',http_status:status,domain_age_days:null};
    } catch {return {status:controller.signal.aborted?'timeout':'unavailable',http_status:status,domain_age_days:null};}
    finally {clearTimeout(timer);nextAt=Date.now()+1000;}
  });
  queue=job.catch(()=>{});
  return job;
}
