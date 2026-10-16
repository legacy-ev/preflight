import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { signingKey,publicJWK,KID } from '../scanner/signing.mjs';
import { buildContext,publishContext } from './build.mjs';
import { factsClient as sourceClient } from './facts-client.mjs';
const args=process.argv.slice(2);
if(args.some((x,i)=>x!=='--output' && args[i-1]!=='--output') || (args.includes('--output') && !args[args.indexOf('--output')+1])) throw new Error('Usage: node context/index.mjs [--output directory]');
const output=resolve(args.includes('--output')?args[args.indexOf('--output')+1]:'public-data');
// This is the existing Ed25519 signing seed, not an API credential.
const key=signingKey(process.env.PREFLIGHT_SIGNING_KEY);
if(key) {
  const published=JSON.parse(await readFile(new URL('../keys/public-jwks.json',import.meta.url),'utf8'));
  if(!published.keys.some(x=>x.kid===KID && x.x===publicJWK(key).x)) throw new Error('Signing key does not match published public JWKS; refusing to publish');
}
if(!key) console.warn('No signing key supplied: context will be explicitly unsigned.');
const result=await buildContext({read:sourceClient({key}),root:resolve('public-data'),key});
await publishContext(result,output);
console.log(`Context published to ${output}: ${result.domains.length} domain files; signed=${Boolean(key)}`);
