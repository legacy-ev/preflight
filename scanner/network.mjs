import { validatePublicURL } from './addresses.mjs';
import { publicFetch } from './transport.mjs';
export { isPublicAddress, validateResolvedURL, validatePublicURL } from './addresses.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { requestHeaders } from './signing.mjs';
import { safeEndpoint } from './routes.mjs';

export async function readBounded(response,maxBytes=524288) {
  if (!response.body) return {body:'',truncated:false};
  const reader=response.body.getReader();
  const chunks=[]; let total=0; let truncated=false;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      if(total+value.byteLength>maxBytes) {
        chunks.push(value.subarray(0,maxBytes-total));total=maxBytes;truncated=true;await reader.cancel();break;
      }
      chunks.push(value);total+=value.byteLength;
    }
  } finally {reader.releaseLock();}
  return {body:Buffer.concat(chunks,total).toString('utf8'),truncated};
}

export function detectChallenge(body,headers={}) {
  return headers['cf-mitigated'] === 'challenge' || /(?:<title[^>]*>\s*(?:just a moment|attention required|access denied)|verify (?:that )?you are (?:a )?human|checking (?:your )?browser|cf-chl-|challenge-platform|g-recaptcha|hcaptcha|captcha-delivery\.com|px-captcha|pardon our interruption|enable javascript and cookies to continue)/i.test(body);
}
export function detectBlock(body) {
  return /(?:<title[^>]*>\s*(?:access denied|forbidden)|you (?:have been|are) blocked|request (?:has been )?blocked|automated access (?:is )?(?:denied|prohibited))/i.test(body);
}
export function likelyBotVendor(headers) {
  if(headers['cf-ray'] || /cloudflare/i.test(headers.server ?? '')) return 'cloudflare';
  if(headers['x-datadome']) return 'datadome';
  if(headers['x-akamai-transformed'] || headers['akamai-grn'] || /akamaighost/i.test(headers.server ?? '')) return 'akamai';
  if(headers['x-kpsdk-cd'] || headers['x-kpsdk-ct']) return 'kasada';
  if(headers['x-iinfo'] || /incapsula/i.test(headers.server ?? '')) return 'imperva';
  if(headers['x-px-block'] || headers['x-px-captcha']) return 'human';
  if(headers['x-amzn-waf-action']) return 'aws_waf';
  return null;
}
const HEADER_KEYS = ['content-type','server','cf-ray','cf-mitigated','x-datadome','x-akamai-transformed','akamai-grn','x-kpsdk-cd','x-kpsdk-ct','x-iinfo','x-px-block','x-px-captcha','x-amzn-waf-action','retry-after'];

export class BoundedClient {
  constructor(origin,{key=null,fetchImpl=null,now=Date.now,sleep:wait=sleep,validateURL=validatePublicURL,
    allowSyntheticDNS=false,maxRequests=10,minIntervalMs=1000,timeoutMs=12000,maxBytes=524288}={}) {
    this.origin=origin;this.key=key;this.fetchImpl=fetchImpl ?? ((url,options)=>publicFetch(url,options,{allowSyntheticDNS}));this.now=now;this.sleep=wait;this.validateURL=validateURL;
    this.maxRequests=Math.min(10,maxRequests);this.interval=Math.max(1000,minIntervalMs);this.timeout=timeoutMs;this.maxBytes=maxBytes;
    this.requests=0;this.nextAt=0;this.backoff=0;this.halted=false;this.robots=null;
  }
  async get(path,{robots=false,maxBytes=this.maxBytes}={}) {
    let current=safeEndpoint(path,this.origin);
    if(!current) return {status:null,error:'unsafe_or_off_origin_url'};
    for(let redirects=0;redirects<=5;redirects++) {
      if(this.halted) return {status:null,error:'backoff_scan_stopped'};
      if(this.requests>=this.maxRequests) return {status:null,error:'request_budget_exhausted'};
      if(!robots && this.robots && !this.robots(new URL(current).pathname).allowed) return {status:null,error:'disallowed_by_robots'};
      const delay=Math.max(0,this.nextAt-this.now());
      if(delay) await this.sleep(delay);
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),this.timeout);
      const started=this.now();
      this.requests++;
      try {
        if(!await this.validateURL(current)) return {status:null,error:'non_public_destination'};
        const response=await this.fetchImpl(current,{method:'GET',redirect:'manual',headers:requestHeaders(current,this.key),signal:controller.signal});
        const headers=Object.fromEntries(HEADER_KEYS.filter(k=>response.headers.has(k)).map(k=>[k,response.headers.get(k)]));
        const {body,truncated}=await readBounded(response,maxBytes);
        const challenge=detectChallenge(body,headers);
        const block_page=detectBlock(body);
        const price=response.headers.get('x-price') ?? response.headers.get('price');
        const currency=response.headers.get('x-currency') ?? response.headers.get('currency');
        const pay_per_crawl=response.status===402 && /^\d{1,12}(?:\.\d{1,12})?$/.test(price ?? '') && /^[A-Z]{3}$/.test(currency ?? '') ? {price,currency} : null;
        const result={url:current,status:response.status,body,truncated,headers,challenge,block_page,pay_per_crawl,latency_ms:Math.max(0,this.now()-started)};
        if([401,403,429].includes(response.status) || response.status>=500 || response.status===402 || challenge || block_page) {
          // Backoff by ending this site's scan; never retry a challenge.
          this.backoff=Math.max(2000,this.interval*2);
          this.halted=true;
        }
        if(response.status>=300 && response.status<400) {
          const target=safeEndpoint(response.headers.get('location'),this.origin);
          if(!target) return {...result,error:'unsafe_or_off_origin_redirect'};
          current=target;
          continue;
        }
        return result;
      } catch {
        this.backoff=Math.min(60000,Math.max(2000,this.backoff*2));
        return {status:null,error:controller.signal.aborted?'request_timeout':'network_error'};
      } finally {
        clearTimeout(timer);
        this.nextAt=this.now()+Math.max(this.interval,this.backoff);
      }
    }
    return {status:null,error:'redirect_limit_exceeded'};
  }
}
