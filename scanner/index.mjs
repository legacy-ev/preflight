import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseSeeds, scanDomain } from './crawler.mjs';
import { signingKey, publicJWK, KID } from './signing.mjs';
import { writeOutputs } from './output.mjs';
import { validatePublicURL } from './network.mjs';
import { rdapLookup } from './rdap.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function parseArgs(args) {
  const config={seed:resolve(root,'data/seed-commerce-domains.csv'),output:resolve(root,'public-data'),concurrency:3,domains:null,limit:null,managedDNS:false};
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--managed-dns') {config.managedDNS=true;continue;}
    const value=args[++i];
    if(!value) throw new Error(`Missing value for ${arg}`);
    if(arg==='--seed') config.seed=resolve(value);
    else if(arg==='--output') config.output=resolve(value);
    else if(arg==='--domains') config.domains=value.split(',').map(x=>x.trim().toLowerCase());
    else if(arg==='--concurrency') config.concurrency=Number(value);
    else if(arg==='--limit') config.limit=Number(value);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if(!Number.isInteger(config.concurrency) || config.concurrency<1 || config.concurrency>8) throw new Error('Concurrency must be 1–8');
  if(config.limit!==null && (!Number.isInteger(config.limit) || config.limit<1)) throw new Error('Limit must be positive');
  return config;
}

export async function main(args=process.argv.slice(2)) {
  const config=parseArgs(args);
  const seeds=parseSeeds(await readFile(config.seed,'utf8'));
  const domains=seeds.map(x=>x.domain);
  if(config.domains?.some(x=>!domains.includes(x))) throw new Error('--domains must be from the seed CSV');
  let selected=seeds.filter(x=>!config.domains || config.domains.includes(x.domain));
  if(config.limit) selected=selected.slice(0,config.limit);
  if(!selected.length) throw new Error('No domains selected');
  // This is the only secret read by the scanner. No API keys are inspected or used.
  const key=signingKey(process.env.PREFLIGHT_SIGNING_KEY);
  if(!key) console.warn('WARNING: PREFLIGHT_SIGNING_KEY missing; requests and responses are unsigned (signature:null).');
  else {
    const published=JSON.parse(await readFile(resolve(root,'keys/public-jwks.json'),'utf8'));
    if(!published.keys.some(x=>x.kid===KID && x.x===publicJWK(key).x)) throw new Error('Signing key does not match published public JWKS; refusing to publish');
  }
  let cursor=0;const scans=[];
  async function worker() {
    while(cursor<selected.length) {
      const {domain}=selected[cursor++];
      const validateURL=url=>validatePublicURL(url,{allowSyntheticDNS:config.managedDNS});
      const scan=await scanDomain(domain,domains,{key,validateURL,allowSyntheticDNS:config.managedDNS,rdap:(name,options)=>rdapLookup(name,{...options,validateURL,allowSyntheticDNS:config.managedDNS})});
      if(config.managedDNS) scan.network_mode='managed_synthetic_dns';
      scans.push(scan);
      console.log(`${domain}: ${scan.access.scan_status}; HTTP ${scan.access.status ?? 'unavailable'}; RDAP ${scan.safety.rdap.status}; requests ${scan.access.request_count}`);
    }
  }
  await Promise.all(Array.from({length:Math.min(config.concurrency,selected.length)},worker));
  const result=await writeOutputs(scans,{output:config.output,key});
  console.log(`Wrote ${result.count} scans; change root ${result.root_hash ?? 'none'}`);
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(()=>{
  // Never print unknown network error objects, env values or private key data.
  console.error('Scanner failed. Check seed arguments, signing-key/JWKS configuration and existing JSON/chain integrity.');
  process.exitCode=1;
});
