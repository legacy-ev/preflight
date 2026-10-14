import test from 'node:test';
import assert from 'node:assert/strict';
import { rdapLookup } from '../rdap.mjs';

test('RDAP bootstrap follows registry prefixes while keeping queried domain fixed and discarding contact data',async()=>{
 const calls=[];
 const result=await rdapLookup('shop.example',{at:'2026-10-14T12:00:00Z',validateURL:async()=>true,fetchImpl:async url=>{
   calls.push(url);
   if(calls.length===1) return new Response('',{status:302,headers:{location:'https://rdap.registry.example/com/v1/domain/shop.example'}});
   return new Response(JSON.stringify({ldhName:'SHOP.EXAMPLE',events:[{eventAction:'registration',eventDate:'2026-01-01T12:00:00Z'}],entities:[{email:'private@example.com'}]}));
 }});
 assert.equal(result.status,'ok');
 assert.equal(calls.length,2);
 assert.equal(result.domain_age_days,286);
 assert.ok(!JSON.stringify(result).includes('private@example.com'));
});

test('RDAP rejects redirects to a different query, credentials, private hosts and non-HTTPS',async()=>{
 for(const location of ['https://rdap.registry.example/domain/evil.example','https://u:p@rdap.registry.example/domain/shop.example','http://rdap.registry.example/domain/shop.example','https://private.example/domain/shop.example']) {
   let calls=0;
   const result=await rdapLookup('shop.example',{validateURL:async url=>!url.includes('private.example'),fetchImpl:async()=>{
     calls++;return new Response('',{status:302,headers:{location}});
   }});
   assert.equal(calls,1);
   assert.equal(result.status,'unsafe_redirect');
 }
});

test('RDAP registration and identity missing are unknown; errors never reveal request details',async()=>{
 for(const data of [{ldhName:'wrong.example'}, {ldhName:'shop.example',events:[]}, {ldhName:'shop.example',events:[{eventAction:'registration',eventDate:'invalid'}]}]) {
   const result=await rdapLookup('shop.example',{validateURL:async()=>true,fetchImpl:async()=>new Response(JSON.stringify(data))});
   assert.equal(result.domain_age_days,null);
   assert.notEqual(result.status,'ok');
 }
});
