import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('TZif offsets, exact transitions, negative DST and fractional zones', async()=>{
  const {zoneFact}=await import('../context/timezones.mjs');
  const london=await zoneFact('Europe/London','2026-10-16T12:00:00Z');
  assert.equal(london.offset,'UTC+01:00');assert.equal(london.is_dst,true);
  assert.deepEqual(london.next_transition,{at:'2026-10-25T01:00:00.000Z',offset:'UTC+00:00',is_dst:false});
  assert.equal((await zoneFact('Asia/Kolkata','2026-10-16T12:00:00Z')).offset,'UTC+05:30');
  const dublinWinter=await zoneFact('Europe/Dublin','2026-12-01T12:00:00Z');
  assert.equal(dublinWinter.offset,'UTC+00:00');
  assert.equal((await zoneFact('Europe/Dublin','2026-07-01T12:00:00Z')).offset,'UTC+01:00');
  // tzdata builds differ: negative DST marks Dublin winter true, while Ubuntu builds may mark it false.
  assert.ok(dublinWinter.is_dst===true||dublinWinter.is_dst===false);
  assert.equal((await zoneFact('UTC','2026-10-16T12:00:00Z')).next_transition,null);
  await assert.rejects(zoneFact('../etc/passwd','2026-10-16T12:00:00Z'));
});
test('software projects v1 releases without copying arbitrary upstream text',async()=>{
  const {softwareSummary}=await import('../context/reference-facts.mjs');
  const result=softwareSummary({result:{name:'nodejs',releases:[{name:'26',releaseDate:'2026-05-05',latest:{name:'26.12.0',date:'2026-10-14'},eolFrom:'2029-04-30',isEol:false,description:'evil'}]}},'nodejs','2026-10-16T12:00:00Z');
  assert.equal(result.latest,'26.12.0');assert.equal(result.releases[0].eol,'2029-04-30');assert.ok(!JSON.stringify(result).includes('evil'));
  assert.throws(()=>softwareSummary({},'nodejs','2026-10-16T12:00:00Z'));
});
test('daily cache preserves checked_at, expires and does not cache failures as success',async()=>{
  const {cachedItem}=await import('../context/facts-cache.mjs');
  const root=await mkdtemp(join(tmpdir(),'facts-'));let calls=0;
  const options={root,source:'https://example.org/data',at:'2026-10-16T00:00:00Z',load:async()=>{calls++;return {status:'ok',n:calls};}};
  try {
    const a=await cachedItem(options);const b=await cachedItem({...options,at:'2026-10-16T01:00:00Z'});
    assert.deepEqual(a,b);assert.equal(calls,1);
    assert.equal((await cachedItem({...options,at:'2026-10-17T00:00:00Z'})).value.n,2);
    assert.equal((await cachedItem({...options,at:'2026-10-18T00:00:00Z',load:async()=>{throw Error('private');}})).value.status,'unavailable');
  }finally{await rm(root,{recursive:true,force:true});}
});
test('Wikidata uses preferred nondeprecated current claims and structured IDs only',async()=>{
  const {countrySummary}=await import('../context/reference-facts.mjs');
  const claim=(v,rank='normal',qualifiers={})=>({rank,qualifiers,mainsnak:{snaktype:'value',datavalue:{value:v}}});
  const data={entities:{Q30:{id:'Q30',claims:{P297:[claim('US')],P298:[claim('USA')],P36:[claim({'id':'Q61'}),claim({id:'Q60'},'deprecated')],P38:[claim({id:'Q4917'})],P474:[claim('1')]},labels:{en:{value:'evil'}}}}};
  const result=countrySummary(data,'Q30');assert.deepEqual(result.capital,['Q61']);assert.equal(result.iso_alpha2[0],'US');assert.ok(!JSON.stringify(result).includes('evil'));
});
test('OSV projection filters package, dates, withdrawn and unknown licences; no descriptions',async()=>{
  const {advisorySummary}=await import('../context/vulnerabilities.mjs');
  const record={id:'GHSA-2222-3333-4444',published:'2026-10-15T00:00:00Z',summary:'evil',affected:[{package:{ecosystem:'PyPI',name:'mcp'},ranges:[{type:'ECOSYSTEM',events:[{introduced:'0'},{fixed:'1.2.3'}]}]}],severity:[{type:'CVSS_V3',score:'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'}]};
  const out=advisorySummary(record,['PyPI','mcp'],'2026-10-16T00:00:00Z');assert.equal(out.id,record.id);assert.ok(!JSON.stringify(out).includes('evil'));
  for(const score of ['CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:L','CVSS:3.1/AV:N','6.9'])
    assert.equal(advisorySummary({...record,severity:[{type:'CVSS_V3',score}]},['PyPI','mcp'],'2026-10-16T00:00:00Z').highlight,false);
  for(const score of ['7.0','9.8','CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H'])
    assert.ok(advisorySummary({...record,severity:[{type:'CVSS_V3',score}]},['PyPI','mcp'],'2026-10-16T00:00:00Z'));
  assert.equal(advisorySummary({...record,id:'UNKNOWN-123'},['PyPI','mcp'],'2026-10-16T00:00:00Z'),null);
  assert.equal(advisorySummary({...record,withdrawn:'2026-10-15T00:00:00Z'},['PyPI','mcp'],'2026-10-16T00:00:00Z'),null);
});
test('all Intl zones and IANA aliases publish with a verifiable envelope and a compact pointer',async()=>{
  const {timezoneData}=await import('../context/timezones.mjs');
  const {signingKey,canonical}=await import('../scanner/signing.mjs');
  const {createPublicKey,verify}=await import('node:crypto');
  const key=signingKey(Buffer.alloc(32,9).toString('base64url'));
  const result=await timezoneData({at:'2026-10-16T12:00:00Z',key});
  const zones=result.file.response.zones;
  for(const zone of Intl.supportedValuesOf('timeZone'))assert.ok(zones.some(x=>x.value.zone===zone&&x.value.status==='ok'),zone);
  assert.ok(zones.some(x=>x.value.zone==='Etc/GMT+5'&&x.value.offset==='UTC-05:00'));
  assert.equal(result.pointer.value.count,zones.length);assert.ok(result.pointer.value.major_zones.length<30);
  assert.equal(result.file.response.node_tzdb_version,process.versions.tz);
  assert.ok(verify(null,Buffer.from(canonical(result.file.response)),createPublicKey(key),Buffer.from(result.file.signature.sig,'base64url')));
});
test('OSV batch pagination, detail deduplication, all severities and cache fallback with mocked fetch',async()=>{
  const {vulnerabilityFacts,PACKAGES,BATCH_URL}=await import('../context/vulnerabilities.mjs');
  const {factsClient}=await import('../context/facts-client.mjs');
  const root=await mkdtemp(join(tmpdir(),'osv-'));const calls=[];let batches=0,offline=false;
  const read=factsClient({wait:async()=>{},fetchImpl:async(url,options)=>{
    calls.push({url,...options});
    if(offline)return new Response('',{status:503});
    if(url.endsWith('/robots.txt'))return new Response('',{status:404});
    assert.ok(options.headers['User-Agent'].startsWith('PreflightBot/'));
    assert.equal(options.redirect,'error');assert.ok(options.signal);
    if(url===BATCH_URL){
      const {queries}=JSON.parse(options.body);assert.equal(options.method,'POST');
      batches++;
      if(batches===1){assert.deepEqual(queries.map(q=>[q.package.ecosystem,q.package.name]),PACKAGES);
        return Response.json({results:queries.map((_,i)=>({vulns:[{id:'GHSA-shared-1'}],...(i===0?{next_page_token:'page2'}:{})}))});}
      assert.equal(queries.length,1);assert.equal(queries[0].page_token,'page2');
      return Response.json({results:[{vulns:[{id:'GHSA-low-2'},{id:'GHSA-unknown-3'},{id:'UNKNOWN-1'}]}]});
    }
    const id=url.split('/').at(-1);
    return Response.json({id,published:'2020-01-01T00:00:00Z',affected:PACKAGES.map(([ecosystem,name])=>({package:{ecosystem,name}})),
      database_specific:{severity:id.includes('shared')?'CRITICAL':id.includes('low')?'LOW':undefined},details:'do not copy'});
  }});
  try{
    const at='2026-10-16T00:00:00Z';const a=await vulnerabilityFacts({root,read,at});
    assert.equal(batches,2);assert.equal(calls.filter(c=>c.url.includes('/vulns/')).length,3);
    assert.deepEqual(a[0].value.records.map(r=>r.severity_level),['critical','low','unknown']);
    assert.equal(a[0].value.excluded_licence_records,1);
    for(const item of a)for(const r of item.value.records){assert.equal(r.checked_at,at);assert.equal(r.ttl_seconds,86400);assert.ok(r.source.startsWith('https://api.osv.dev/v1/vulns/'));assert.equal(r.highlight,r.severity_level==='critical');assert.ok(r.attribution);}
    assert.ok(!JSON.stringify(a).includes('do not copy'));
    const count=calls.length;
    assert.deepEqual(await vulnerabilityFacts({root,read,at:'2026-10-16T12:00:00Z'}),a);assert.equal(calls.length,count);
    offline=true;
    assert.deepEqual(await vulnerabilityFacts({root,read,at:'2026-10-18T00:00:00Z'}),a);
    assert.deepEqual(await vulnerabilityFacts({root,read,at:'2026-10-19T00:00:00Z'}),a);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('OSV malformed batches and failed details fail closed; pagination is bounded',async()=>{
  const {vulnerabilityFacts,PACKAGES,BATCH_URL,LIMITS}=await import('../context/vulnerabilities.mjs');
  for(const response of [{}, {results:[]}, {results:PACKAGES.map(()=>({vulns:{}}))}, {results:PACKAGES.map(()=>({error:'bad'}))}]){
    const root=await mkdtemp(join(tmpdir(),'osv-'));let calls=0;
    try{const items=await vulnerabilityFacts({root,at:'2026-10-16T00:00:00Z',read:async()=>{calls++;return JSON.stringify(response);}});
      assert.equal(calls,1);assert.ok(items.every(i=>i.value.status==='unavailable'&&i.value.package));
    }finally{await rm(root,{recursive:true,force:true});}
  }
  const root=await mkdtemp(join(tmpdir(),'osv-'));let batches=0;
  try{
    const items=await vulnerabilityFacts({root,at:'2026-10-16T00:00:00Z',read:async(url)=>{
      if(url!==BATCH_URL)throw Error('detail offline');
      batches++;return JSON.stringify({results:PACKAGES.map((_,i)=>({vulns:i===0?[{id:'GHSA-test-1'}]:[],next_page_token:'more'}))});
    }});
    assert.equal(batches,LIMITS.batch_requests);assert.equal(items[0].value.status,'unavailable');
    assert.ok(items.slice(1).every(i=>i.value.truncated&&i.value.records.length===0));
  }finally{await rm(root,{recursive:true,force:true});}
});
test('OSV POST allowlist rejects other endpoints, packages and malformed bodies',async()=>{
  const {factsClient}=await import('../context/facts-client.mjs');const read=factsClient();
  for(const [url,body] of [
    ['https://api.osv.dev/v1/query',{queries:[{package:{ecosystem:'PyPI',name:'mcp'}}]}],
    ['https://api.osv.dev/v1/querybatch',{queries:[{package:{ecosystem:'PyPI',name:'other'}}]}],
    ['https://api.osv.dev/v1/querybatch',{queries:[]}],
    ['https://api.osv.dev/v1/querybatch',{queries:[{package:{ecosystem:'PyPI',name:'mcp'},version:'1'}]}]
  ])assert.throws(()=>read(url,{method:'POST',body:JSON.stringify(body)}));
});
test('OSV record and global detail budgets mark incomplete coverage',async()=>{
  const {vulnerabilityFacts,PACKAGES,BATCH_URL,LIMITS}=await import('../context/vulnerabilities.mjs');
  const root=await mkdtemp(join(tmpdir(),'osv-cap-'));let gets=0;
  try{
    const items=await vulnerabilityFacts({root,at:'2026-10-16T00:00:00Z',read:async url=>{
      if(url===BATCH_URL)return JSON.stringify({results:PACKAGES.map((_,i)=>({vulns:Array.from({length:101},(_,j)=>({id:`GHSA-${i}-${j}`}))}))});
      gets++;const id=url.split('/').at(-1),index=Number(id.split('-')[1]);
      const [ecosystem,name]=PACKAGES[index];
      return JSON.stringify({id,published:'2020-01-01T00:00:00Z',affected:[{package:{ecosystem,name}}]});
    }});
    assert.equal(gets,LIMITS.detail_requests);assert.ok(items.every(i=>i.value.truncated));
    assert.equal(items[0].value.records.length,LIMITS.records_per_package);
    assert.equal(items.at(-1).value.records.length,0);assert.equal(items.at(-1).value.status,'ok');
  }finally{await rm(root,{recursive:true,force:true});}
});
