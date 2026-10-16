import { sourceClient } from './fetch.mjs';
import { publicFetch } from '../scanner/transport.mjs';
const INDEXES=new Set(['npm','PyPI'].map(e=>`https://storage.googleapis.com/osv-vulnerabilities/${e}/modified_id.csv`));
// Preserve sourceClient's DNS pinning, robots checks, honest UA, byte cap,
// timeout and host pacing. Only these two fixed indexes receive Range.
export function factsClient({fetchImpl=publicFetch,...options}={}) {
  return sourceClient({...options,fetchImpl:async(url,request)=>fetchImpl(url,INDEXES.has(url)?{...request,headers:{...request.headers,Range:'bytes=0-65535'}}:request)});
}
