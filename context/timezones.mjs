// IANA TZif records, not ICU display strings, define offsets and the DST bit.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { envelope } from '../scanner/signing.mjs';
import { BASE, ZONES } from './sources.mjs';
const SOURCE='https://www.iana.org/time-zones';
const DAY=86400;
function block(b,start,width) {
  if(b.toString('ascii',start,start+4)!=='TZif') throw Error('Invalid TZif');
  const [gmt,std,leap,n,t,chars]=Array.from({length:6},(_,i)=>b.readUInt32BE(start+20+i*4));
  let p=start+44;
  const times=Array.from({length:n},()=>{const v=width===8?Number(b.readBigInt64BE(p)):b.readInt32BE(p);p+=width;return v;});
  const indexes=[...b.subarray(p,p+n)];p+=n;
  const types=Array.from({length:t},()=>{const v={seconds:b.readInt32BE(p),is_dst:Boolean(b[p+4])};p+=6;return v;});
  p+=chars+leap*(width+4)+std+gmt;
  return {times,indexes,types,end:p};
}
function clock(s) {
  const m=s.match(/^([+-]?)(\d+)(?::(\d+))?(?::(\d+))?$/);if(!m)throw Error('Invalid POSIX offset');
  return (m[1]==='-'?-1:1)*(Number(m[2])*3600+Number(m[3]||0)*60+Number(m[4]||0));
}
function ruleTime(rule,year,offset) {
  const m=rule.match(/^M(\d+)\.(\d)\.(\d)(?:\/([+\-\d:]+))?$/);if(!m)throw Error('Unsupported POSIX rule');
  const [,month,week,weekday,time]=m;
  let day=1+(Number(weekday)-new Date(Date.UTC(year,Number(month)-1,1)).getUTCDay()+7)%7+(Number(week)-1)*7;
  if(day>new Date(Date.UTC(year,Number(month),0)).getUTCDate())day-=7;
  return Date.UTC(year,Number(month)-1,day)/1000+clock(time||'2')-offset;
}
function extend(table,footer,year) {
  if(!footer)return;
  const m=footer.match(/^(?:<[^>]+>|[A-Za-z]+)([+\-\d:]+)(?:(?:<[^>]+>|[A-Za-z]+)([+\-\d:]+)?,([^,]+),([^,]+))?$/);
  if(!m)throw Error('Unsupported TZif footer');
  if(!m[3])return;
  const standard={seconds:-clock(m[1]),is_dst:false};
  const daylight={seconds:m[2]?-clock(m[2]):standard.seconds+3600,is_dst:true};
  const last=table.times.at(-1)??-Infinity;
  const extra=[];
  for(let y=year-1;y<=year+2;y++)extra.push([ruleTime(m[3],y,standard.seconds),daylight],[ruleTime(m[4],y,daylight.seconds),standard]);
  for(const [time,type] of extra.sort((a,b)=>a[0]-b[0]))if(time>last){table.times.push(time);table.indexes.push(table.types.length);table.types.push(type);}
}
function offset(seconds) {
  const minutes=Math.abs(seconds)/60;
  if(!Number.isInteger(minutes))throw Error('Subminute offset not representable');
  return `UTC${seconds<0?'-':'+'}${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
}
export async function zoneFact(zone,at,zoneRoot='/usr/share/zoneinfo') {
  if(!/^[A-Za-z0-9_+\-/]+$/.test(zone)||zone.split('/').some(x=>x==='..'||!x))throw Error('Invalid zone');
  let b;
  try{b=await readFile(join(zoneRoot,zone));}catch{
    const links=(await readFile(join(zoneRoot,'tzdata.zi'),'utf8')).split('\n').map(l=>l.match(/^L (\S+) (\S+)$/)).filter(Boolean);
    const target=links.find(l=>l[2]===zone)?.[1];if(!target)throw Error('Missing zone');
    b=await readFile(join(zoneRoot,target));
  }
  let table=block(b,0,4);
  if(b[4]!==0)table=block(b,table.end,8);
  const start=Math.floor(Date.parse(at)/1000);if(!Number.isFinite(start))throw Error('Invalid time');
  extend(table,b.subarray(table.end).toString().trim(),new Date(at).getUTCFullYear());
  const state=t=>{
    let lo=0,hi=table.times.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(table.times[mid]<=t)lo=mid+1;else hi=mid;}
    return table.types[lo?table.indexes[lo-1]:0];
  };
  const current=state(start);let next_transition=null;
  // Bracket each actual transition (including offset-neutral DST changes), then
  // binary-search the UTC second. Never miss two changes within a sample day.
  for(const candidate of table.times)if(candidate>start&&candidate<=start+400*DAY) {
    const before=state(candidate-1),after=state(candidate);
    if(before.seconds===after.seconds&&before.is_dst===after.is_dst)continue;
    let lo=Math.max(start,candidate-DAY),hi=candidate;
    while(hi-lo>1){const mid=Math.floor((lo+hi)/2),s=state(mid);if(s.seconds===before.seconds&&s.is_dst===before.is_dst)lo=mid;else hi=mid;}
    next_transition={at:new Date(hi*1000).toISOString(),offset:offset(after.seconds),is_dst:after.is_dst};break;
  }
  return {zone,offset:offset(current.seconds),is_dst:current.is_dst,next_transition};
}
export async function timezoneData({at,key=null,zoneRoot='/usr/share/zoneinfo'}={}) {
  const zones=new Set([...Intl.supportedValuesOf('timeZone'),...ZONES]);
  // Include aliases and Etc zones omitted by supportedValuesOf, excluding copies
  // under posix/right and administrative files.
  async function walk(path='') {
    for(const e of await readdir(join(zoneRoot,path),{withFileTypes:true})) {
      const name=path?`${path}/${e.name}`:e.name;
      if(['posix','right'].includes(name)||['localtime','posixrules'].includes(name))continue;
      if(e.isDirectory())await walk(name);
      else {const b=await readFile(join(zoneRoot,name));if(b.subarray(0,4).toString()==='TZif')zones.add(name);}
    }
  }
  let tzdb_version=null;
  try{await walk();const zi=await readFile(join(zoneRoot,'tzdata.zi'),'utf8');tzdb_version=zi.match(/^# version (\S+)/)?.[1]||null;for(const m of zi.matchAll(/^L \S+ (\S+)$/gm))zones.add(m[1]);}catch{ /* Per-zone failure remains explicit. */ }
  const items=await Promise.all([...zones].sort().map(async zone=>{
    let value;try{value={status:'ok',...await zoneFact(zone,at,zoneRoot)};}catch{value={status:'unavailable',zone,reason:'tzif_unavailable_or_unsupported'};}
    return {value,source:SOURCE,checked_at:at,ttl_seconds:3600,untrusted_evidence:true};
  }));
  const metadata={tzdb_version,node_tzdb_version:process.versions.tz||null,offset_engine:'system_tzif',transition_horizon_days:400};
  return {file:envelope({schema_version:'1.0.0',advisory:true,...metadata,zones:items},key,at),
    pointer:{value:{kind:'timezones',url:`${BASE}/api/v1/timezones.json`,count:items.length,...metadata,major_zones:items.filter(x=>ZONES.includes(x.value.zone))},source:SOURCE,checked_at:at,ttl_seconds:3600,untrusted_evidence:true}};
}
