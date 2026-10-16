import { readFile,mkdir,writeFile,rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
export const DAILY_TTL=86400;
// This committed public-data cache survives hourly Actions; only projected facts
// are stored. Never renew checked_at when reusing cached data.
export async function cachedItem({root,source,at,load,untrusted=true}) {
  const directory=join(root,'context-cache');
  const path=join(directory,createHash('sha256').update(`facts-v1:${source}`).digest('hex')+'.json');
  try {
    const item=JSON.parse(await readFile(path,'utf8'));
    const age=Date.parse(at)-Date.parse(item.checked_at);
    if(item.source===source&&item.ttl_seconds===DAILY_TTL&&['ok','unavailable'].includes(item.value?.status)&&age>=0&&age<DAILY_TTL*1000)return item;
  }catch{}
  const base={source,checked_at:at,ttl_seconds:DAILY_TTL,...(untrusted?{untrusted_evidence:true}:{})};
  let item;
  try {
    item={value:await load(),...base};
    if(item.value.status!=='ok')throw Error('Invalid projection');
  }catch{item={value:{status:'unavailable',reason:'fetch_or_validation_failed'},...base};}
  try{await mkdir(directory,{recursive:true});await writeFile(path+'.tmp',JSON.stringify(item)+'\n');await rename(path+'.tmp',path);}catch{/* Read-only output still returns honest facts. */}
  return item;
}
