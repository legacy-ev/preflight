import { publicFetch } from '../scanner/transport.mjs';
import { readBounded } from '../scanner/network.mjs';
import { requestHeaders } from '../scanner/signing.mjs';
import { parseRobots, robotsDecision } from '../scanner/robots.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

// Fixed source URLs only. Redirects never expand the source allowlist. Per-host
// serialization applies to robots and API requests together, including failures.
export function sourceClient({fetchImpl=publicFetch,key=null,wait=sleep,timeout=10000}={}) {
  const hosts=new Map();
  async function get(url,maxBytes=8*1024*1024,robots=false,request={}) {
    const signal=AbortSignal.timeout(timeout);
    const response=await fetchImpl(url,{method:'GET',...request,redirect:'error',signal,headers:{...requestHeaders(url,key),...request.headers}});
    if(robots && [404,410].includes(response.status)) {await response.body?.cancel();return ''; }
    if (response.status>=300 || response.status<200) {await response.body?.cancel();throw new Error('Source unavailable');}
    const result=await readBounded(response,maxBytes);
    if(result.truncated) throw new Error('Source exceeds byte limit');
    return result.body;
  }
  return async function read(url,request={}) {
    const u=new URL(url);
    if(u.protocol!=='https:' || u.username || u.password || u.hash) throw new Error('Invalid source URL');
    let state=hosts.get(u.host);
    if(!state) {state={queue:Promise.resolve(),rules:null,initialized:false,failed:false};hosts.set(u.host,state);}
    const job=state.queue.then(async()=>{
      if(state.failed) throw new Error('Host unavailable');
      try {
        if(!state.initialized) {
          try {state.rules=parseRobots(await get(`${u.origin}/robots.txt`,65536,true));}
          catch { // Only an explicit 404/410 establishes absent robots.
            state.failed=true;throw new Error('Robots unavailable');
          }
          state.initialized=true;
          await wait(1000);
        }
        const decision=robotsDecision(state.rules,'PreflightBot',u.pathname);
        if(!decision.allowed || decision.crawl_delay_seconds>60) throw new Error('Robots disallows source');
        return await get(url,8*1024*1024,false,request);
      } catch(error) {state.failed=true;throw error;}
      finally {await wait(Math.max(1000,(robotsDecision(state.rules || [],'PreflightBot',u.pathname).crawl_delay_seconds || 0)*1000));}
    });
    state.queue=job.catch(()=>{});
    return job;
  };
}
