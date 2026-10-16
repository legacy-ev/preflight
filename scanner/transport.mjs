import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { Readable, pipeline } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import { validateResolvedURL } from './addresses.mjs';
import { requestHeaders } from './signing.mjs';

const SYNTHETIC_GATEWAY = '198.18.0.1';

// Only a fixed, TLS-authenticated resolver may bootstrap via the synthetic
// gateway without independent DNS confirmation. Never follow its redirects.
async function dnsJSON(host, type) {
  const url = new URL('https://cloudflare-dns.com/dns-query');
  url.searchParams.set('name', host);
  url.searchParams.set('type', String(type));
  const records = await lookup(url.hostname, {all:true});
  if (!validateResolvedURL(url.href, records.map(x=>x.address), {allowSyntheticDNS:true}))
    throw new Error('Non-public DNS resolver');
  const response = await fetchResolved(url, {headers:{...requestHeaders(url.href),Accept:'application/dns-json'},
    signal:AbortSignal.timeout(5000)}, records);
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error('DNS resolver unavailable');
  }
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 65536) {await reader.cancel();throw new Error('DNS response too large');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function resolveDestination(value, {lookupImpl=lookup, dnsJSON:confirm=dnsJSON}={}) {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g,'');
  const records = await lookupImpl(host,{all:true});
  const addresses = records.map(x=>x.address);
  if (validateResolvedURL(url.href, addresses)) return records;
  // A literal, local hostname or mixed private/public answer never gets this
  // fallback. The gateway exception alone is insufficient to permit a target.
  if (isIP(host) || !addresses.every(ip=>ip===SYNTHETIC_GATEWAY) ||
      !validateResolvedURL(url.href, addresses, {allowSyntheticDNS:true}))
    throw new Error('Non-public HTTPS destination');
  const answers = await Promise.all([1,28].map(async type=>{
    const data = await confirm(host,type);
    if (data.Status !== 0 || data.TC) throw new Error('Public DNS confirmation failed');
    return (data.Answer ?? []).filter(x=>x.type===1 || x.type===28).map(x=>{
      if (isIP(x.data)!==(x.type===1?4:6)) throw new Error('Invalid public DNS answer');
      return x.data;
    });
  }));
  if (!validateResolvedURL(url.href, answers.flat())) throw new Error('Non-public HTTPS destination');
  return records;
}

// Fetch-compatible HTTPS transport. DNS is checked and the connection pinned;
// HTTPS still authenticates the original hostname, including on the gateway.
export async function publicFetch(value, options={}, dependencies={}) {
  const records = await resolveDestination(value, dependencies);
  return fetchResolved(new URL(value), options, records, dependencies.requestImpl);
}

function fetchResolved(url, {headers={},signal,method='GET',body}={}, records, requestImpl=request) {
  const host=url.hostname.replace(/^\[|\]$/g,'');
  signal?.throwIfAborted();
  const pinnedLookup=(_host,options,callback)=>{
    if(options?.all) callback(null,records);
    else callback(null,records[0].address,records[0].family);
  };
  return new Promise((resolve,reject)=>{
    const req=requestImpl(url,{method,headers:{...headers,'Accept-Encoding':'identity'},signal,
      servername:host,lookup:pinnedLookup},message=>{
      try {
        const responseHeaders=new Headers();
        for(const [name,values] of Object.entries(message.headers)) {
          for(const value of [values].flat()) if(value!==undefined) responseHeaders.append(name,value);
        }
        if([204,205,304].includes(message.statusCode)) {
          message.resume();
          resolve(new Response(null,{status:message.statusCode,headers:responseHeaders}));
          return;
        }
        const encoding=(responseHeaders.get('content-encoding') ?? 'identity').toLowerCase();
        const decoder=({gzip:createGunzip,'x-gzip':createGunzip,deflate:createInflate,br:createBrotliDecompress})[encoding]?.();
        if(encoding!=='identity' && !decoder) throw new Error('Unsupported content encoding');
        const body=decoder ?? message;
        if(decoder) pipeline(message,decoder,()=>{}); // Stream cancellation also destroys upstream.
        resolve(new Response(Readable.toWeb(body),{status:message.statusCode,headers:responseHeaders}));
      } catch(error) {message.destroy();reject(error);}
    });
    req.once('error',reject);
    req.end(body);
  });
}
