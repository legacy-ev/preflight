// Kept isolated so a reviewed per-provider commercial grant can enable exactly
// that source without changing failure handling or trusting upstream page URLs.
const cap=x=>String(x).slice(0,200);
export function statusSummary(data) {
  if(!['none','minor','major','critical','maintenance'].includes(data?.status?.indicator) || !Array.isArray(data.incidents) || data.incidents.length>100 || data.incidents.some(x=>typeof x?.name!=='string')) throw new Error('Invalid Statuspage data');
  return {indicator:data.status.indicator,incidents:data.incidents.map(x=>cap(x.name))};
}

export async function statusItem(source,{read,at}) {
  const metadata={source:source.url,checked_at:at,ttl_seconds:3600};
  if(source.reuse!=='verified') return {...metadata,value:{provider:source.name,status:'unavailable',reason:'commercial_reuse_unverified',link_only:true}};
  try {
    const data=statusSummary(JSON.parse(await read(source.url)));
    return {...metadata,value:{provider:source.name,status:'ok',...data},untrusted_evidence:true};
  } catch {return {...metadata,value:{provider:source.name,status:'unavailable',reason:'fetch_or_validation_failed'}};}
}
