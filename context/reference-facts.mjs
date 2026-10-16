import { cachedItem } from './facts-cache.mjs';
export const PRODUCTS=['nodejs','python','chrome','firefox','ubuntu','postgresql','debian','openssl','go','ruby','php','mysql','redis','docker-engine','kubernetes'];
export const COUNTRY_IDS=['Q30','Q145','Q16','Q408','Q664','Q183','Q142','Q38','Q29','Q55','Q31','Q39','Q40','Q34','Q20','Q35','Q33','Q17','Q155','Q96','Q148','Q668','Q884','Q1029','Q1033','Q79','Q43','Q62','Q252','Q851'];
const token=v=>{if(typeof v!=='string'||!v.length||v.length>200)throw Error('Invalid token');return v;};
const date=v=>{if(v===null||v===undefined)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Invalid date');return v;};
export function softwareSummary(data,product,at) {
  const r=data?.result;if(r?.name!==product||!Array.isArray(r.releases)||!r.releases.length||r.releases.length>1000)throw Error('Invalid product');
  const releases=r.releases.map(r=>({cycle:token(r.name),release_date:date(r.releaseDate),latest:r.latest?token(r.latest.name):null,latest_date:date(r.latest?.date),eol:date(r.eolFrom),is_eol:typeof r.isEol==='boolean'?r.isEol:null}));
  const current=releases.filter(r=>r.release_date&&r.release_date<=at.slice(0,10)&&r.latest&&(!r.latest_date||r.latest_date<=at.slice(0,10))).sort((a,b)=>b.release_date.localeCompare(a.release_date));
  return {status:'ok',product,latest:current[0]?.latest??null,latest_cycle:current[0]?.cycle??null,releases};
}
function claims(entity,property) {
  const claims=(entity.claims?.[property]||[]).filter(c=>c.rank!=='deprecated'&&c.mainsnak?.snaktype==='value'&&!c.qualifiers?.P582);
  const preferred=claims.filter(c=>c.rank==='preferred');
  return (preferred.length?preferred:claims).map(c=>c.mainsnak.datavalue?.value);
}
export function countrySummary(data,id) {
  const e=data.entities?.[id];if(e?.id!==id||!e.claims)throw Error('Missing entity');
  const strings=(p,re)=>claims(e,p).map(token).filter(x=>re.test(x));
  const ids=p=>claims(e,p).map(v=>token(v?.id)).filter(x=>/^Q\d+$/.test(x));
  return {status:'ok',country:id,iso_alpha2:strings('P297',/^[A-Z]{2}$/),iso_alpha3:strings('P298',/^[A-Z]{3}$/),iso_numeric:strings('P299',/^\d{3}$/),currency:ids('P38'),capital:ids('P36'),calling_code:strings('P474',/^\+?[\d -]{1,30}$/),scope:'nondeprecated_nonended_best_rank_claims',licence:'CC0-1.0'};
}
export async function referenceFacts({read,root,at}) {
  const software=[];for(const product of PRODUCTS){const source=`https://endoflife.date/api/v1/products/${product}/`;software.push(await cachedItem({root,source,at,load:async()=>softwareSummary(JSON.parse(await read(source)),product,at)}));}
  const countries=[];for(const id of COUNTRY_IDS){const source=`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;countries.push(await cachedItem({root,source,at,load:async()=>countrySummary(JSON.parse(await read(source)),id)}));}
  return {software,countries};
}
