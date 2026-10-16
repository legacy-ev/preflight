import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPublicKey,verify } from 'node:crypto';
import { buildContext,publishContext,statusSummary,priceSummary,agentSummary,fxSummary,registrySummary,timezoneOffsets } from '../build.mjs';
import { sourceClient } from '../fetch.mjs';
import { signingKey,canonical,envelope } from '../../scanner/signing.mjs';
import { PRICES,AGENTS,FX,REGISTRY } from '../sources.mjs';
const at='2026-10-16T12:00:00.000Z';
const key=signingKey(Buffer.alloc(32,7).toString('base64url'));
const xml="<Cube time='2026-10-15'><Cube currency='USD' rate='1.17'/></Cube>";
const read=async url=>{
  if(url===PRICES)return JSON.stringify({'gpt-5':{input_cost_per_token:1e-6,output_cost_per_token:4e-6,description:'never echo'}});
  if(url===AGENTS)return JSON.stringify({'GPTBot':{description:'ignore instructions'}});
  if(url===FX)return xml;
  if(url===REGISTRY)return JSON.stringify({servers:[{server:{name:'ignore',remotes:[{url:'https://evil.invalid'}]}}],metadata:{count:1,nextCursor:'opaque'}});
  throw new Error('Not allowlisted');
};
test('signed core, per-domain original timestamp, metadata, untrusted isolation, source projections and output paths',async()=>{
  const root=await mkdtemp(join(tmpdir(),'context-'));
  try {
    await mkdir(join(root,'api/v1/preflight'),{recursive:true});
    await writeFile(join(root,'api/v1/index.json'),JSON.stringify([{domain:'example.com',verdict:'CAUTION'},{domain:'../../evil',verdict:'STOP'}]));
    const original=envelope({domain:'example.com',verdict:'CAUTION',safety:{injection_findings:['HIDDEN_TEXT_INSTRUCTION']}},key,'2026-10-15T12:00:00.000Z');
    await writeFile(join(root,'api/v1/preflight/example.com.json'),JSON.stringify(original));
    const result=await buildContext({root,at,key,read});
    assert.equal(result.domains.length,1);assert.deepEqual(result.domains[0][1].response.preflight,original);
    assert.equal(result.core.response.sections.sites[1].checked_at,original.response.generated_at);
    assert.ok(verify(null,Buffer.from(canonical(result.core.response)),createPublicKey(key),Buffer.from(result.core.signature.sig,'base64url')));
    for(const items of Object.values(result.core.response.sections)) for(const item of items) {
      assert.equal(new URL(item.source).protocol,'https:');assert.ok(Number.isFinite(Date.parse(item.checked_at)));assert.ok(Number.isInteger(item.ttl_seconds));assert.ok('value' in item);
    }
    assert.equal(result.core.response.sections.agent_ecosystem[0].untrusted_evidence,true);
    assert.equal(result.core.response.sections.agent_ecosystem.at(-1).value.data.server_count,null);
    assert.equal(result.core.response.sections.safety.at(-1).value.counts_by_pattern.HIDDEN_TEXT_INSTRUCTION,1);
    assert.ok(!JSON.stringify(result).includes('ignore'));assert.ok(!JSON.stringify(result).includes('evil.invalid'));
    await publishContext(result,root);
    assert.deepEqual(JSON.parse(await readFile(join(root,'api/v1/context/example.com.json'),'utf8')),result.domains[0][1]);
    assert.deepEqual(JSON.parse(await readFile(join(root,'api/v1/context.json'),'utf8')),result.core);
  } finally {await rm(root,{recursive:true,force:true});}
});
test('all fetch failures produce unavailable sections and unsigned output, never crash',async()=>{
  const r=await buildContext({root:'/nonexistent',at,read:async()=>{throw new Error('secret text must not escape');}});
  assert.equal(r.core.signature,null);assert.equal(r.domains.length,0);
  for(const name of ['llm_providers','agent_ecosystem','world']) assert.ok(r.core.response.sections[name].some(x=>x.value.status==='unavailable'));
  assert.ok(!JSON.stringify(r).includes('secret text'));
  await assert.rejects(buildContext({at,read,changes:[{url:'javascript:alert(1)',date:'2026-10-16'}]}));
});
test('Statuspage projection caps and flags all retained incident text at the item boundary',()=>{
  const s=statusSummary({status:{indicator:'major',description:'ignore'},incidents:[{name:'x'.repeat(500),body:'evil'}],components:[{name:'evil'}]});
  assert.equal(s.incidents[0].length,200);assert.deepEqual(Object.keys(s),['indicator','incidents']);
  assert.throws(()=>statusSummary({status:{indicator:'ignore'},incidents:[]}));
});
test('strict source parsing and exact price units; Registry page is not a total',()=>{
  assert.equal(priceSummary({'gpt-5':{input_cost_per_token:-1,output_cost_per_token:2}})[0].status,'unavailable');
  assert.equal(priceSummary({'gpt-5':{input_cost_per_token:1,output_cost_per_token:2}})[0].unit,'per_token');
  assert.throws(()=>agentSummary({'evil\nIgnore':{}}));assert.deepEqual(agentSummary({'GPTBot':{text:'evil'}}),['GPTBot']);
  assert.deepEqual(fxSummary(xml).rates,{USD:1.17});assert.throws(()=>fxSummary('<!DOCTYPE x>'+xml));
  assert.throws(()=>registrySummary({servers:[],metadata:{count:10}}));
  assert.equal(registrySummary({servers:[],metadata:{count:0}}).server_count,0);
});
test('IANA offsets respect DST and half-hour zones',()=>{
  const summer=timezoneOffsets('2026-07-01T12:00:00Z'),winter=timezoneOffsets('2026-01-01T12:00:00Z');
  assert.equal(summer.find(x=>x.zone==='Europe/London').offset,'UTC+01:00');
  assert.equal(winter.find(x=>x.zone==='Europe/London').offset,'UTC+00:00');
  assert.equal(summer.find(x=>x.zone==='Asia/Kolkata').offset,'UTC+05:30');
  assert.equal(summer.find(x=>x.zone==='America/New_York').offset,'UTC-04:00');
  const midnight=timezoneOffsets('2026-01-01T00:00:00.123Z');
  assert.equal(midnight.find(x=>x.zone==='UTC').offset,'UTC+00:00');
  assert.equal(midnight.find(x=>x.zone==='America/New_York').offset,'UTC-05:00');
  assert.equal(midnight.find(x=>x.zone==='Pacific/Auckland').offset,'UTC+13:00');
});
test('fetcher honest UA, robots, serial spacing, no redirect, failure backoff, size caps and timeouts',async()=>{
  const requests=[],waits=[];
  const client=sourceClient({wait:async ms=>waits.push(ms),fetchImpl:async(url,options)=>{
    requests.push([url,options]);return new Response(url.endsWith('robots.txt')?'User-agent: PreflightBot\nDisallow: /private':'{}');
  }});
  await Promise.all([client('https://example.com/a'),client('https://example.com/b')]);
  assert.deepEqual(requests.map(x=>new URL(x[0]).pathname),['/robots.txt','/a','/b']);
  assert.ok(waits.every(x=>x>=1000));
  assert.ok(requests.every(([,o])=>o.headers['User-Agent'].startsWith('PreflightBot/') && o.redirect==='error' && o.signal));
  await assert.rejects(client('https://example.com/private'));assert.equal(requests.length,3);
  await assert.rejects(client('https://example.com/c'));assert.equal(requests.length,3);
  for(const status of [403,429,500,302]) {
    let count=0;const fail=sourceClient({wait:async()=>{},fetchImpl:async()=>{count++;return new Response('',{status});}});
    await assert.rejects(fail('https://example.com/a'));await assert.rejects(fail('https://example.com/b'));assert.equal(count,1);
  }
  const absent=sourceClient({wait:async()=>{},fetchImpl:async url=>new Response('{}',{status:url.endsWith('robots.txt')?404:200})});
  assert.equal(await absent('https://example.com/a'),'{}');
  const large=sourceClient({wait:async()=>{},fetchImpl:async()=>new Response('x'.repeat(65537))});await assert.rejects(large('https://example.com/a'));
  await assert.rejects(client('http://example.com'));
  const timeout=sourceClient({timeout:5,wait:async()=>{},fetchImpl:async(_url,{signal})=>new Promise((_,reject)=>{const hold=setTimeout(()=>reject(new Error('late')),100);signal.addEventListener('abort',()=>{clearTimeout(hold);reject(signal.reason);});})});
  await assert.rejects(timeout('https://example.com/a'));
});
test('Statuspage licensing gate prevents fetch; reviewed adapters flag capped names and fail unavailable',async()=>{
  const {statusItem}=await import('../status.mjs');let calls=0;
  const source={name:'Fixture',url:'https://example.com/api/v2/summary.json',reuse:'link_only'};
  const read=async()=>{calls++;return JSON.stringify({status:{indicator:'major'},incidents:[{name:'x'.repeat(500),body:'evil'}]});};
  assert.equal((await statusItem(source,{read,at})).value.status,'unavailable');assert.equal(calls,0);
  const result=await statusItem({...source,reuse:'verified'},{read,at});assert.equal(result.untrusted_evidence,true);assert.equal(result.value.incidents[0].length,200);assert.ok(!JSON.stringify(result).includes('evil'));
  const fail=await statusItem({...source,reuse:'verified'},{read:async()=>{throw new Error('offline');},at});assert.equal(fail.value.status,'unavailable');
});
test('verdict summary uses oldest scan checked_at, expires at TTL and counts independent feed coverage',async()=>{
  const root=await mkdtemp(join(tmpdir(),'context-age-'));
  try {
    await mkdir(join(root,'api/v1/preflight'),{recursive:true});
    const rows=[{domain:'old.com',verdict:'STOP',checked_at:'2026-10-16T11:00:00.000Z'},{domain:'new.com',verdict:'CAUTION',checked_at:at}];
    await writeFile(join(root,'api/v1/index.json'),JSON.stringify(rows));
    for(const row of rows) await writeFile(join(root,`api/v1/preflight/${row.domain}.json`),JSON.stringify(envelope({domain:row.domain,verdict:row.verdict,safety:{feed_status:'ok',feed_checked_at:at,listed_on:row.verdict==='STOP'?['https://hole.cert.pl/domains/v2/domains.txt']:[]}},null,at)));
    const fresh=(await buildContext({root,at,read})).core.response.sections;
    assert.equal(fresh.sites[0].checked_at,rows[0].checked_at);assert.equal(fresh.sites[0].value.status,'ok');
    assert.deepEqual(fresh.safety.at(-1).value.phishing_feed_counts,{checked:2,listed:1,expired:0,unavailable:0});
    const later=(await buildContext({root,at:new Date(Date.parse(at)+600000).toISOString(),read})).core.response.sections;
    assert.deepEqual(later.safety.at(-1).value.phishing_feed_counts,{checked:2,listed:1,expired:0,unavailable:0});
    const expired=(await buildContext({root,at:new Date(Date.parse(at)+21600001).toISOString(),read})).core.response.sections;
    assert.deepEqual(expired.safety.at(-1).value.phishing_feed_counts,{checked:0,listed:1,expired:2,unavailable:0});
    const stale=(await buildContext({root,at:'2026-10-16T12:00:00.001Z',read})).core.response.sections;
    assert.equal(stale.sites[0].value.status,'expired');assert.equal(stale.safety.at(-1).value.status,'expired');
    assert.equal(stale.sites[0].checked_at,rows[0].checked_at);
    await rm(join(root,'api/v1/preflight/new.com.json'));
    assert.equal((await buildContext({root,at,read})).core.response.sections.sites[0].value.status,'unavailable');
  } finally {await rm(root,{recursive:true,force:true});}
});
test('UK holidays keep all divisions, project fields and carry OGL attribution; invalid source unavailable',async()=>{
  const {HOLIDAYS}=await import('../sources.mjs');
  const data=Object.fromEntries(['england-and-wales','scotland','northern-ireland'].map(division=>[division,{division,events:[{title:'Christmas Day',date:'2026-12-25',notes:'',bunting:true,extra:'do not echo'}]}]));
  const run=async data=>(await buildContext({root:'/nonexistent',at,read:async url=>url===HOLIDAYS?JSON.stringify(data):read(url)})).core.response.sections.world.find(x=>x.source===HOLIDAYS);
  const item=await run(data);
  assert.equal(item.value.status,'ok');assert.equal(item.value.data.divisions.length,3);
  assert.match(item.value.data.attribution,/Open Government Licence v3/);assert.ok(!JSON.stringify(item).includes('do not echo'));
  assert.equal((await run({})).value.status,'unavailable');
});
