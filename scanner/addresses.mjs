import { isIP } from 'node:net';

export function isPublicAddress(address) {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (ip.startsWith('::ffff:')) {
    const suffix = ip.slice(7);
    if (isIP(suffix) === 4) return isPublicAddress(suffix);
    const parts = suffix.split(':');
    if (parts.length === 2) {
      const value = parseInt(parts[0],16)*65536+parseInt(parts[1],16);
      return isPublicAddress([value>>>24,(value>>>16)&255,(value>>>8)&255,value&255].join('.'));
    }
    return false;
  }
  if (isIP(ip) === 4) {
    const [a,b,c] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  // Only global unicast; reject ULA, link-local, multicast, mapped and transition ranges.
  return isIP(ip) === 6 && /^[23]/.test(ip) && !/^2001:(?:db8|0:|2:|10:|20:)/.test(ip) && !/^2002:/.test(ip);
}

export function validateResolvedURL(url,addresses,{allowSyntheticDNS=false}={}) {
  const u=new URL(url);
  if(u.protocol!=='https:' || u.username || u.password || (u.port && u.port!=='443')) return false;
  const host=u.hostname.replace(/^\[|\]$/g,'');
  if(isIP(host)) return isPublicAddress(host) && addresses.every(isPublicAddress);
  if(!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return false;
  return addresses.length>0 && addresses.every(ip=>isPublicAddress(ip) || (allowSyntheticDNS && ip==='198.18.0.1'));
}
export async function validatePublicURL(url,options={}) {
  // Share transport validation: synthetic DNS requires independent public DNS,
  // even when the legacy --managed-dns flag is supplied.
  const { resolveDestination } = await import('./transport.mjs');
  try {await resolveDestination(url,options);return true;}
  catch {return false;}
}
