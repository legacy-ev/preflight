import test from 'node:test';
import assert from 'node:assert/strict';
import { probeOutcomes, aggregateOutcomes, validSyntheticReport } from '../outcomes.mjs';
import { BoundedClient } from '../network.mjs';
const at='2026-10-16T12:00:00.000Z';
function setup(body, pages={}) {
 const calls=[]; let clock=0;
 const client=new BoundedClient('https://example.com',{validateURL:async()=>true,now:()=>clock,sleep:async n=>{clock+=n;},fetchImpl:async(url,options)=>{calls.push({url,options}); return new Response(pages[new URL(url).pathname]??'<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"></OpenSearchDescription>');}});
 client.robots=path=>({allowed:path!='/denied'});
 return {client,calls,home:{status:200,body,url:'https://example.com/',headers:{},truncated:false}};
}
test('search fetches only a same-origin descriptor, never templates or forms',async()=>{
 const f=setup('<form action="/submit"></form><link rel="search" type="application/opensearchdescription+xml" href="/os.xml">');
 const reports=await probeOutcomes('example.com',f.client,f.home,{at});
 assert.deepEqual(reports.map(x=>x.result),['success','success']);
 assert.deepEqual(f.calls.map(x=>x.url),['https://example.com/os.xml']);
 assert.equal(f.calls[0].options.method,'GET');
 assert.ok(reports.every(validSyntheticReport));
});
test('unsafe, query-bearing, denied and absent descriptors never submit searches',async()=>{
 for(const href of ['https://evil.example/os.xml','/denied','/os.xml?q=private','/os.xml#private','']) {
  const f=setup(`<link rel="search" type="application/opensearchdescription+xml" href="${href}">`);
  const reports=await probeOutcomes('example.com',f.client,f.home,{at});
  assert.equal(reports[1].result,'partial'); assert.equal(f.calls.length,0);
 }
});
test('no home, challenge and truncated pages cannot succeed',async()=>{
 for(const home of [null,{status:403},{status:200,challenge:true},{status:200,truncated:true}]) {
  const f=setup(''); const reports=await probeOutcomes('example.com',f.client,home,{at});
  assert.ok(reports.every(x=>x.result!=='success')); assert.equal(f.calls.length,0);
 }
});
test('aggregation hides n<5, deduplicates daily and intent, excludes invalid/future data',async()=>{
 const f=setup(''); const [base]=await probeOutcomes('example.com',f.client,f.home,{at});
 const rows=Array.from({length:5},(_,i)=>({...base,attempted_at:`2026-10-${String(12+i).padStart(2,'0')}T10:00:00.000Z`}));
 assert.equal(aggregateOutcomes(rows.slice(1),'example.com','read',at).success_rate_7d,null);
 const result=aggregateOutcomes([...rows,...rows,{...base,attempted_at:'2026-10-17T00:00:00Z'},{...base,extra:'bad'}],'example.com','read',at);
 assert.equal(result.sample_size_7d,5); assert.equal(result.success_rate_7d,1);
 assert.equal(result.verified_operators,1);
 assert.equal(aggregateOutcomes(rows,'example.com','search',at).sample_size_7d,0);
 assert.equal(validSyntheticReport({...base,path_template:'/private'}),false);
});

import { storeOutcomes } from '../outcomes.mjs';
import { verdict } from '../verdict.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('daily persistence replaces samples, preserves other domains and aggregates history',async()=>{
 const output=await mkdtemp(join(tmpdir(),'preflight-outcomes-'));
 try {
  const f=setup(''); const reports=await probeOutcomes('example.com',f.client,f.home,{at});
  const scans=[{domain:'example.com',synthetic_reports:reports}];
  await storeOutcomes(scans,{output,at});
  await storeOutcomes(scans,{output,at});
  let rows=JSON.parse(await readFile(join(output,'outcomes/2026-10-16.json'),'utf8'));
  assert.equal(rows.length,2);
  await storeOutcomes([{domain:'other.com',synthetic_reports:reports.map(r=>({...r,domain:'other.com'}))}],{output,at});
  rows=JSON.parse(await readFile(join(output,'outcomes/2026-10-16.json'),'utf8'));
  assert.equal(rows.length,4);
  for(let day=12;day<16;day++) {
   const stamp=`2026-10-${day}T12:00:00.000Z`;
   await storeOutcomes([{domain:'example.com',synthetic_reports:reports.map(r=>({...r,attempted_at:stamp}))}],{output,at:stamp});
  }
  await storeOutcomes(scans,{output,at});
  assert.equal(scans[0].outcomes_by_intent.read.sample_size_7d,5);
  assert.equal(scans[0].outcomes_by_intent.search.success_rate_30d,0);
 } finally {await rm(output,{recursive:true,force:true});}
});
test('displayed synthetic rates cannot grant GO or fire diversity-gated caution rules',()=>{
 const component={checked_at:at,ttl_seconds:86400,complete:true};
 const o={sample_size_7d:20,sample_size_30d:20,success_rate_7d:0,success_rate_30d:0,verified_operators:1,max_operator_weight:1,confirmed_by_probe:true};
 const scan={domain:'example.com',checked_at:at,scanned:true,safety:{...component,independently_verified:false},access:component,route:component,tos:component,outcomes:o,outcomes_by_intent:{read:o}};
 for(const rate of [0,1]) {
  o.success_rate_7d=rate;
  const response=verdict(scan,'read',at);
  assert.equal(response.verdict,'CAUTION');
  assert.equal(response.outcomes.success_rate_7d,rate);
  assert.ok(!response.reasons.some(r=>r.code.startsWith('OUTCOME_')));
 }
 assert.equal(verdict(scan,'search',at).outcomes.success_rate_7d,null);
 scan.safety.listings=[{trusted:true,source:'fixture',checked_at:at,ttl_seconds:3600}];
 assert.equal(verdict(scan,'read',at).verdict,'STOP');
});
test('descriptor redirects obey robots and cannot leave the origin',async()=>{
 for(const location of ['https://evil.example/os.xml','/denied']) {
  const f=setup('<link rel="search" type="application/opensearchdescription+xml" href="/os.xml">');
  f.client.fetchImpl=async(url)=>{f.calls.push(url);return new Response('',{status:302,headers:{location}});};
  const reports=await probeOutcomes('example.com',f.client,f.home,{at});
  assert.equal(f.calls.length,1); assert.equal(reports[1].result,'failed');
 }
});
test('synthetic reports satisfy the shared outcome schema including strict property lists',async()=>{
 const schema=JSON.parse(await readFile(new URL('../../specs/outcome-report.schema.json',import.meta.url),'utf8'));
 function check(value,s) {
  const type=value===null?'null':typeof value;
  assert.ok([s.type].flat().includes(type) || Number.isInteger(value) && s.type==='integer');
  if(s.enum) assert.ok(s.enum.includes(value));
  if(s.pattern) assert.match(value,new RegExp(s.pattern));
  if(s.maxLength) assert.ok(value.length<=s.maxLength);
  if(s.format==='date-time') assert.ok(Number.isFinite(Date.parse(value)));
  if(type==='object') {
   for(const key of s.required??[]) assert.ok(Object.hasOwn(value,key));
   for(const [key,item] of Object.entries(value)) {assert.ok(s.properties[key]);check(item,s.properties[key]);}
  }
 }
 const f=setup('');
 for(const report of await probeOutcomes('example.com',f.client,f.home,{at})) check(report,schema);
});
