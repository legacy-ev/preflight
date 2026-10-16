import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../build.mjs';
test('fleet guidance survives aggregation with ordered checks and provenance',async()=>{
 const {core}=await buildContext({root:'/nonexistent',at:'2026-10-16T12:00:00Z',read:async()=>{throw Error();}});
 const s=core.response.sections;
 assert.ok(s.preflight_checklist?.length>=12);
 assert.equal(s.preflight_checklist[0].value.code,'tools_present');
 assert.ok(s.failure_modes.some(x=>x.value.code==='memory_poisoning'));
 for(const x of [...s.preflight_checklist,...s.failure_modes.filter(x=>x.source.startsWith('Preflight operator'))]) {
  assert.equal(x.source,'Preflight operator fleet observations, 2026-10');
  assert.equal(x.checked_at,'2026-10-16T00:00:00.000Z');
  assert.equal(x.ttl_seconds,31536000);
 }
});
test('identity uses PSL wildcard, exception, private and IDN rules and rejects URLs',async()=>{
 const {domainIdentity}=await import('../domain-identity.mjs');
 for(const [host,want] of [['www.example.co.uk','example.co.uk'],['a.b.ck','a.b.ck'],['a.www.ck','www.ck'],['a.foo.github.io','foo.github.io'],['www.食狮.公司.cn','xn--85x722f.xn--55qx5d.cn'],['co.uk',null]]) {
  assert.equal(domainIdentity(host).value.registrable_domain,want,host);
 }
 const mixed=domainIdentity('pаypal.com').value; // Cyrillic а
 assert.equal(mixed.punycode,true); assert.equal(mixed.mixed_script,true);
 assert.equal(mixed.confusable,true);assert.equal(mixed.confusable_skeleton,'paypal.corn');
 assert.equal(domainIdentity('例子.中国').value.mixed_script,false);
 assert.equal(domainIdentity('example.com').value.punycode,false);
 for(const bad of ['https://example.com','evil.com/path','127.0.0.1','a..com','xn--.com','a.com:443','x@a.com','x\n.com']) assert.throws(()=>domainIdentity(bad),bad);
});
test('long canonical hostname identity is never silently clipped',async()=>{
 const {domainIdentity}=await import('../domain-identity.mjs');
 const host=['a'.repeat(60),'b'.repeat(60),'c'.repeat(60),'d'.repeat(60)].join('.');
 const r=domainIdentity(host).value;
 assert.equal(r.ascii_hostname,host);
 assert.equal(r.registrable_domain,'c'.repeat(60)+'.'+'d'.repeat(60));
});
