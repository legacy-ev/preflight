import { readFileSync } from 'node:fs';
import { domainToASCII,domainToUnicode } from 'node:url';
import { isIP } from 'node:net';
const vendor=name=>readFileSync(new URL(`./vendor/${name}`,import.meta.url),'utf8');
const metadata=JSON.parse(vendor('metadata.json'));
const exact=new Set(),wildcard=new Set(),exceptions=new Set();
for(const line of vendor('public_suffix_list.dat').split('\n')) {
 const rule=line.trim(); if(!rule || rule.startsWith('//')) continue;
 const set=rule.startsWith('!')?exceptions:rule.startsWith('*.')?wildcard:exact;
 const ascii=domainToASCII(rule.replace(/^!|^\*\./,''));
 if(!ascii) throw new Error('Invalid PSL snapshot');
 set.add(ascii);
}
const confusables=new Map();
const decode=s=>String.fromCodePoint(...s.trim().split(/\s+/).map(n=>parseInt(n,16)));
for(const line of vendor('confusables.txt').split('\n')) {
 const body=line.split('#')[0].trim(); if(!body) continue;
 const [from,to]=body.split(';'); confusables.set(decode(from),decode(to));
}
const scripts=vendor('Scripts.txt').split('\n').map(line=>line.split('#')[0].trim()).filter(Boolean).map(line=>{
 const [span,name]=line.split(';').map(s=>s.trim()); const [lo,hi=lo]=span.split('..').map(s=>parseInt(s,16));
 return {lo,hi,name};
}).sort((a,b)=>a.lo-b.lo);
function scriptOf(cp) {
 let lo=0,hi=scripts.length-1;
 while(lo<=hi) {const mid=(lo+hi)>>1,r=scripts[mid];if(cp<r.lo)hi=mid-1;else if(cp>r.hi)lo=mid+1;else return r.name;}
 return 'Unknown';
}
function registrable(host) {
 const labels=host.split('.');let suffix=1;
 for(let i=0;i<labels.length;i++) {
  const rest=labels.slice(i).join('.');
  if(exceptions.has(rest)) {suffix=labels.length-i-1;break;}
  if(exact.has(rest))suffix=Math.max(suffix,labels.length-i);
  if(i>0 && wildcard.has(rest))suffix=Math.max(suffix,labels.length-i+1);
 }
 return labels.length>suffix?labels.slice(-suffix-1).join('.'):null;
}
// Advisory deterministic identity only. Never replaces exact-origin route checks.
export function domainIdentity(input) {
 if(typeof input!=='string' || input.length>253 || /[\s\/:@?#\\%\u0000-\u001f]/u.test(input)) throw new Error('Invalid hostname');
 const ascii=domainToASCII(input.replace(/\.$/,'')).toLowerCase();
 if(!ascii || ascii.length>253 || isIP(ascii) || !ascii.includes('.') || !ascii.split('.').every(l=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) throw new Error('Invalid hostname');
 const unicode=domainToUnicode(ascii);
 const labelScripts=unicode.split('.').map(label=>[...new Set([...label].map(ch=>scriptOf(ch.codePointAt(0))).filter(s=>!['Common','Inherited'].includes(s)))]);
 const nfd=unicode.normalize('NFD');
 const skeleton=[...nfd].map(ch=>confusables.get(ch) ?? ch).join('').normalize('NFD');
 const strings={ascii_hostname:ascii,unicode_hostname:unicode,registrable_domain:registrable(ascii),confusable_skeleton:skeleton};
 const truncated=skeleton.length>200;
 return {value:{status:'ok',...strings,confusable_skeleton:skeleton.slice(0,200),
  punycode:ascii.split('.').some(l=>l.startsWith('xn--')),mixed_script:labelScripts.some(s=>s.length>1),mixed_script_scope:'within_label',
  confusable:skeleton!==nfd,confusable_meaning:'skeleton_mapping_changed_not_proof_of_impersonation',display_truncated:truncated,
  private_suffixes:true,advisory:true,unicode_version:'17.0.0',reference_sources:metadata.sources,
  last_known_working_at:null},source:'https://publicsuffix.org/list/public_suffix_list.dat',checked_at:metadata.checked_at,ttl_seconds:604800};
}
