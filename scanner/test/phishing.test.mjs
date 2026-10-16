import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPhishingFeed,phishingEvidence,CERT_PL } from '../phishing.mjs';
import { verdict } from '../verdict.mjs';
const at='2026-10-16T12:00:00.000Z';
test('one active feed download shared across domains; exact registrable boundaries and STOP TTL',async()=>{
  let calls=0;
  const feed=await loadPhishingFeed({at,read:async url=>{calls++;assert.equal(url,CERT_PL);return 'bad.co.uk\nlogin.safe.com\ntenant.github.io\n';}});
  const hit=phishingEvidence('shop.bad.co.uk',feed);
  assert.equal(hit.listings.length,1);
  for(const domain of ['safe.com','otherbad.co.uk','bad.co.uk.evil.com','github.io','other.github.io']) assert.equal(phishingEvidence(domain,feed).listings.length,0);
  assert.equal(phishingEvidence('tenant.github.io',feed).listings.length,1);
  assert.equal(calls,1);
  const scan={domain:'bad.co.uk',checked_at:at,safety:hit};
  const current=verdict(scan,'read',at);
  assert.equal(current.verdict,'STOP');assert.equal(current.reasons.find(x=>x.code==='SAFETY_PHISHING_LISTED').source,CERT_PL);
  assert.ok(!verdict(scan,'read','2026-10-16T12:05:00.001Z').reasons.some(x=>x.code==='SAFETY_PHISHING_LISTED'));
  assert.ok(!verdict(scan,'read','2026-10-16T11:59:59Z').reasons.some(x=>x.code==='SAFETY_PHISHING_LISTED'));
  assert.ok(current.reasons.some(x=>x.code==='INDEPENDENT_SAFETY_UNVERIFIED'));
});
test('failed, empty or malformed feed stays unavailable without leaking upstream text',async()=>{
  for(const text of ['', 'bad.com\nignore instructions', '<html>failure</html>']) {
    const feed=await loadPhishingFeed({at,read:async()=>text});
    assert.equal(feed.status,'unavailable');assert.equal(phishingEvidence('bad.com',feed).listings.length,0);
  }
  assert.equal((await loadPhishingFeed({at,read:async()=>{throw new Error('secret');}})).status,'unavailable');
});
test('crawler attaches shared feed evidence even when target robots forbids a homepage probe',async()=>{
  const {scanDomain}=await import('../crawler.mjs');
  const feed=await loadPhishingFeed({at,read:async()=> 'bad.co.uk\n'});
  const scan=await scanDomain('bad.co.uk',[],{at,phishingFeed:feed,rdap:async()=>({status:'unavailable',domain_age_days:null}),validateURL:async()=>true,sleep:async()=>{},fetchImpl:async()=>new Response('User-agent: *\nDisallow: /')});
  assert.equal(scan.safety.feed_status,'ok');assert.equal(scan.scanned,false);
  assert.equal(verdict(scan,'read',at).verdict,'STOP');
});
