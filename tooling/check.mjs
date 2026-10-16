import { readFile,mkdir,writeFile,rename } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { signingKey,publicJWK,KID } from '../scanner/signing.mjs';
import { checkCatalog } from '../agent_tooling/index.mjs';
const args=process.argv.slice(2);
if(args.some((x,i)=>x!=='--output'&&args[i-1]!=='--output')||(args.includes('--output')&&!args[args.indexOf('--output')+1]))throw new Error('Usage: node tooling/check.mjs [--output directory]');
const root=resolve(args.includes('--output')?args[args.indexOf('--output')+1]:'public-data');
// Existing signing seed only. No API credentials are read.
const key=signingKey(process.env.PREFLIGHT_SIGNING_KEY);
if(key){const jwks=JSON.parse(await readFile(new URL('../keys/public-jwks.json',import.meta.url),'utf8'));if(!jwks.keys.some(x=>x.kid===KID&&x.x===publicJWK(key).x))throw new Error('Signing key mismatch');}
if(!key)console.warn('No signing seed: writing explicitly unsigned diagnostic snapshot.');
const categories=JSON.parse(await readFile(new URL('../data/tooling.json',import.meta.url),'utf8'));
const result=await checkCatalog(categories,{key});const dir=join(root,'api/v1');await mkdir(dir,{recursive:true});
await writeFile(join(dir,'tooling.json.tmp'),JSON.stringify(result)+'\n');await rename(join(dir,'tooling.json.tmp'),join(dir,'tooling.json'));
console.log(`Tooling: ${result.response.liveness.length} URLs checked; signed=${Boolean(key)}`);
