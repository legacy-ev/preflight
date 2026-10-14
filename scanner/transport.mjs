import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { Readable, pipeline } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import { validateResolvedURL } from './addresses.mjs';

// Fetch-compatible GET transport. DNS is checked once here and the connection
// is pinned to those records; HTTPS still authenticates the original hostname.
export async function publicFetch(value,{headers={},signal}={},
  {allowSyntheticDNS=false,lookupImpl=lookup,requestImpl=request}={}) {
  const url=new URL(value);
  const host=url.hostname.replace(/^\[|\]$/g,'');
  const records=await lookupImpl(host,{all:true});
  if(!validateResolvedURL(url.href,records.map(x=>x.address),{allowSyntheticDNS})) throw new Error('Non-public HTTPS destination');
  signal?.throwIfAborted();
  const pinnedLookup=(_host,options,callback)=>{
    if(options?.all) callback(null,records);
    else callback(null,records[0].address,records[0].family);
  };
  return new Promise((resolve,reject)=>{
    const req=requestImpl(url,{method:'GET',headers:{...headers,'Accept-Encoding':'identity'},signal,
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
    req.end();
  });
}
