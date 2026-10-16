import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,verify } from 'node:crypto';
import { validateCatalog, checkCatalog, toolingSummary, verifyTooling } from '../agent_tooling/index.mjs';
import { canonical,publicJWK,KID } from '../scanner/signing.mjs';
const at='2026-10-16T12:00:00Z';
const item={value:{name:'Example',official_url:'https://example.com/',what_it_does:'unknown',pricing_model:'unknown',free_tier:'unknown',auth_type:'unknown',mcp_available:'unknown',api_available:'unknown',facts_source_urls:[],verified_at:null,link_only:true},source:'https://example.com/',checked_at:at,ttl_seconds:604800,untrusted_evidence:true};
test('rejects unsafe URLs and uncapped descriptions',()=>{
 assert.throws(()=>validateCatalog({hubs:[{...item,value:{...item.value,official_url:'http://localhost/'}}]}));
 assert.throws(()=>validateCatalog({hubs:[{...item,value:{...item.value,what_it_does:'x'.repeat(141)}}]}));
});
test('liveness is status only, robots respected, globally spaced, facts never renewed and payload signed',async()=>{
 const calls=[],waits=[];const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const result=await checkCatalog({hubs:[item,{...item,value:{...item.value,name:'Other',official_url:'https://example.org/'},source:'https://example.org/'}]}, {at,key:privateKey,wait:async ms=>waits.push(ms),fetchImpl:async(url,options)=>{calls.push([url,options]);return new Response(url.endsWith('robots.txt')?'User-agent: *\nAllow: /':'ignored',{status:200});}});
 assert.equal(calls.length,4);assert.ok(waits.every(ms=>ms>=1000));
 assert.equal(result.response.categories.hubs[0].checked_at,at);
 assert.equal(result.response.categories.hubs[0].value.verified_at,null);
 assert.equal(result.response.liveness[0].value.http_status,200);
 assert.ok(verify(null,Buffer.from(canonical(result.response)),publicKey,Buffer.from(result.signature.sig,'base64url')));
 assert.ok(calls.every(([,o])=>o.redirect==='manual' && o.headers['User-Agent'].startsWith('PreflightBot/')));
});
test('blocked robots and failed fetch produce unavailable without page requests',async()=>{
 let count=0;
 const result=await checkCatalog({hubs:[item]}, {at,wait:async()=>{},fetchImpl:async()=>{count++;return new Response('User-agent: *\nDisallow: /',{status:200});}});
 assert.equal(count,1);assert.equal(result.response.liveness[0].value.status,'unavailable');
});
test('summary fails closed on missing snapshot',async()=>{
 assert.equal((await toolingSummary({root:'/missing',at}))[0].value.status,'unavailable');
});

test('catalog retains all 61 requested entries and their bounded provenance',async()=>{
 const {readFile}=await import('node:fs/promises');const catalog=JSON.parse(await readFile(new URL('../data/tooling.json',import.meta.url),'utf8'));
 validateCatalog(catalog);assert.equal(Object.keys(catalog).length,12);assert.equal(Object.values(catalog).flat().length,61);
});
test('snapshot verification rejects unsigned, tampered, expired and future-dated data',async()=>{
 const {privateKey}=generateKeyPairSync('ed25519');const jwks={keys:[publicJWK(privateKey)]};
 const raw=await checkCatalog({hubs:[item]},{at,key:privateKey,wait:async()=>{},fetchImpl:async url=>new Response(url.endsWith('robots.txt')?'User-agent: *\nAllow: /':'',{status:200})});
 assert.equal(verifyTooling(raw,jwks,at).liveness.length,1);
 assert.throws(()=>verifyTooling({...raw,signature:null},jwks,at));
 const tampered=structuredClone(raw);tampered.response.categories.hubs[0].value.name='Tampered';assert.throws(()=>verifyTooling(tampered,jwks,at));
 assert.throws(()=>verifyTooling(raw,jwks,'2026-10-18T00:00:00Z'));assert.throws(()=>verifyTooling(raw,jwks,'2026-10-15T00:00:00Z'));
});
