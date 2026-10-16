import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {explicitDate,parsePage,refresh,SOURCES,TTL} from '../tooling/model-deprecations.mjs';
const at='2026-10-16T19:00:00.000Z';
const table=(headers,rows)=>`<table><tr>${headers.map(c=>`<th>${c}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
test('only exact calendar dates are accepted',()=>{
 for(const [input,expected] of [['09/14/26','2026-09-14'],['1/6/25','2025-01-06'],['May 7, 2027','2027-05-07'],['2026-10-16','2026-10-16']])assert.equal(explicitDate(input),expected);
 for(const input of ['2026-02-30','02/29/25','Soon','No shutdown date announced','N/A','As early as October 2026','June 2026','Foo 1, 2026'])assert.equal(explicitDate(input),null);
});
test('shutdown column is used rather than announcement or release date',()=>{
 const groq=table(['Deprecated Model','Shutdown Date','Recommended Replacement Model ID'],[['<code>old/model</code>','09/14/26','<code>new/model</code> or <code>other/model</code>']]);
 const [g]=parsePage('Announced August 24, 2026'+groq,'Groq',at);
 assert.equal(g.shutdown_date,'2026-09-14');assert.equal(g.replacement,'new/model or other/model');assert.equal(g.date_kind,'shutdown');
 const google=table(['Model','Release date','Shutdown date','Recommended replacement'],[['gemini-fixture','January 1, 2025','May 7, 2027','gemini-next'],['gemini-unknown','January 1, 2025','No shutdown date announced',''],['gemini-vague','','June 2026','']]);
 const rows=parsePage(google,'Google Gemini',at);
 assert.equal(rows[0].shutdown_date,'2027-05-07');assert.equal(rows[0].date_kind,'earliest_possible');
 for(const r of rows.slice(1)){assert.equal(r.status,'unknown');assert.equal(r.shutdown_date,null);assert.equal(r.replacement,null);}
});
test('unavailable and changed pages become unknown with provenance',async()=>{
 for(const fetcher of [async()=>{throw Error('DNS');},async()=>({ok:false}),async()=>({ok:true,text:async()=>'<html>Sign in</html>'})]){
  const result=await refresh({fetcher,at});assert.deepEqual(result.models,[]);
  for(const p of result.providers){assert.equal(p.status,'unknown');assert.equal(p.checked_at,at);assert.equal(p.ttl_seconds,TTL);assert.ok(SOURCES.some(s=>s.source===p.source));}
 }
});
test('refresh fetches only approved sources without credentials and tolerates one failure',async()=>{
 const calls=[];
 const result=await refresh({at,fetcher:async(url,opts)=>{
  calls.push(url);assert.equal(opts.redirect,'error');assert.equal(opts.headers.Authorization,undefined);
  if(url===SOURCES[1].source)throw Error('offline');
  return {ok:true,text:async()=>table(['Model ID','Shutdown Date','Recommended Replacement Model ID'],[['old','1/6/25','—']])};
 }});
 assert.deepEqual(calls,SOURCES.map(s=>s.source));assert.equal(result.models.length,1);assert.equal(result.models[0].replacement,null);assert.equal(result.providers[1].status,'unknown');
});
test('committed records have official provenance and dates with explicit semantics',async()=>{
 const data=JSON.parse(await readFile(new URL('../data/model-deprecations.json',import.meta.url)));
 assert.equal(data.providers.length,2);assert.ok(data.models.length>0);
 for(const row of [...data.providers,...data.models]){
  assert.ok(SOURCES.some(s=>s.provider===row.provider&&s.source===row.source));assert.ok(Number.isFinite(Date.parse(row.checked_at)));assert.equal(row.ttl_seconds,TTL);
 }
 for(const row of data.models){assert.ok(row.model_id);if(row.shutdown_date){assert.equal(explicitDate(row.shutdown_date),row.shutdown_date);assert.equal(row.status,'dated');}else assert.equal(row.status,'unknown');}
});
test('weekly refresh stages data, and tooling page and site output include schedules',async()=>{
 const read=path=>readFile(new URL(path,import.meta.url),'utf8');
 assert.match(await read('../.github/workflows/tooling.yml'),/node tooling\/model-deprecations.mjs\s+git add data\/model-deprecations.json/);
 assert.match(await read('../site/src/pages/tooling.astro'),/import deprecations from/);
 assert.match(await read('../site/scripts/copy-data.mjs'),/dist\/api\/v1\/model-deprecations.json/);
});
test('context facts preserve source TTL rather than renewing dates',async()=>{
 const {modelDeprecationFacts}=await import('../tooling/model-deprecations.mjs');
 const data=JSON.parse(await readFile(new URL('../data/model-deprecations.json',import.meta.url)));
 const facts=await modelDeprecationFacts();
 assert.equal(facts.length,data.providers.length+data.models.length);
 assert.equal(facts[0].checked_at,data.providers[0].checked_at);assert.equal(facts[0].ttl_seconds,TTL);assert.equal(facts[0].untrusted_evidence,true);
});
