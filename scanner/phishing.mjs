import { getDomain } from 'tldts';
import { sourceClient } from '../context/fetch.mjs';
export const CERT_PL = 'https://hole.cert.pl/domains/v2/domains.txt';
import { PHISHING_FEED_TTL_SECONDS } from '../context/sources.mjs';
const DOMAIN=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
// One active-only download per run; never promote a listed subdomain to its parent.
export async function loadPhishingFeed({read=sourceClient(),at}={}) {
  const metadata={source:CERT_PL,ttl_seconds:PHISHING_FEED_TTL_SECONDS};
  try {
    const rows=(await read(CERT_PL)).trim().split(/\r?\n/);
    if(!rows.length || rows.some(x=>x.length>253 || !DOMAIN.test(x))) throw new Error('Invalid feed');
    return {...metadata,fetched_at:at ?? new Date().toISOString(),status:'ok',domains:new Set(rows)};
  } catch {return {...metadata,fetched_at:at ?? new Date().toISOString(),status:'unavailable',domains:new Set()};}
}
export function phishingEvidence(domain,feed) {
  const registrable=getDomain(domain,{allowPrivateDomains:true});
  const hit=feed?.status==='ok' && registrable && feed.domains.has(registrable);
  return {feed_status:feed?.status ?? 'unavailable',feed_checked_at:feed?.fetched_at ?? null,
    listings:hit?[{source:feed.source,checked_at:feed.fetched_at,ttl_seconds:feed.ttl_seconds,trusted:true}]:[]};
}
