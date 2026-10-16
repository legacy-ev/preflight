import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { signingKey, publicJWK, KID } from '../scanner/signing.mjs';
import { buildCompute, publishCompute } from './build.mjs';
const args=process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--output' || !args[1])) throw new Error('Usage: node compute/index.mjs [--output directory]');
// Existing signing seed only; never inspect or use compute/API credentials.
const key=signingKey(process.env.PREFLIGHT_SIGNING_KEY);
if(key) {
  const jwks=JSON.parse(await readFile(new URL('../keys/public-jwks.json',import.meta.url),'utf8'));
  if(!jwks.keys.some(k=>k.kid===KID && k.x===publicJWK(key).x)) throw new Error('Signing key does not match published JWKS');
}
const output=resolve(args[1] || 'public-data');
await publishCompute(buildCompute({key}),output);
console.log(`Compute: 7 envelopes; link-only (no eligible prices); signed=${Boolean(key)}; output=${output}`);
