import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog} from '../agent_tooling/index.mjs';
const catalog=JSON.parse(await readFile(new URL('../data/tooling.json',import.meta.url)));
test('every tooling entry requires bounded pricing and signup provenance',()=>{
 const example=structuredClone(Object.values(catalog)[0][0]);
 Object.assign(example.value,{cost_flag:'unknown',pricing_source_url:example.source,free_tier_details:'unknown',signup_methods:'unknown'});
 const check=value=>validateCatalog({example:[{...example,value}]});
 check(example.value);
 for(const field of ['cost_flag','pricing_source_url','free_tier_details','signup_methods']){const v={...example.value};delete v[field];assert.throws(()=>check(v),field);}
 for(const patch of [{cost_flag:'cheap'},{free_tier_details:'x'.repeat(141)},{pricing_source_url:'http://localhost/'},{signup_methods:'oauth'},{cost_flag:'free_tier'},{signup_methods:'magic_link'}])assert.throws(()=>check({...example.value,...patch}));
});
test('infrastructure coverage and required fields survive catalog validation',()=>{
 validateCatalog(catalog);
 const expected={storage:5,databases_vector:5,gpu_compute:8,cpu_serverless_vms:6,queues_workflows:3,domains_dns:2,sms_voice:3,maps_geocoding:3,ocr_speech_vision:4,self_hostable_tools:9,free_llm_apis:2};
 for(const [category,count] of Object.entries(expected))assert.equal(catalog[category]?.length,count,category);
 for(const item of Object.values(catalog).flat()){
  assert.ok(['free','free_tier','paid','unknown'].includes(item.value.cost_flag));
  if(item.value.cost_flag!=='unknown')assert.ok(item.value.pricing_checked_at&&item.value.pricing_evidence_quote);
 }
 for(const item of catalog.free_llm_apis){assert.match(item.value.rate_limits_url,/^https:/);assert.match(item.value.deprecations_url,/^https:/);}
});

test('magic-link and OAuth-only signup expose agent friction',async()=>{
 const {agentSignupFriction}=await import('../tooling/fields.mjs');
 assert.equal(agentSignupFriction('magic_link'),true);
 assert.equal(agentSignupFriction('oauth_only'),true);
 assert.equal(agentSignupFriction('email_password'),false);
 assert.equal(agentSignupFriction('unknown'),false);
});

test('known signup methods and quirks require their own capped evidence',()=>{
 const item=structuredClone(Object.values(catalog)[0][0]);
 const base={...item.value,cost_flag:'unknown',free_tier_details:'unknown',signup_methods:'unknown'};
 const check=patch=>validateCatalog({example:[{...item,value:{...base,...patch}}]});
 for(const signup_methods of ['magic_link','oauth_only','email_password']){
  assert.throws(()=>check({signup_methods}));
  check({signup_methods,signup_source_url:item.source,signup_evidence_quote:'Example fixture',signup_checked_at:item.checked_at});
 }
 assert.throws(()=>check({free_tier_quirks:'Unverified quirk'}));
 assert.throws(()=>check({pricing_evidence_quote:'x'.repeat(141)}));
 assert.throws(()=>check({free_tier_details:'Unverified allowance',pricing_checked_at:null}));
});

test('published tooling snapshot carries the same required catalog fields',async()=>{
 const snapshot=JSON.parse(await readFile(new URL('../public-data/api/v1/tooling.json',import.meta.url)));
 validateCatalog(snapshot.response.categories);
 assert.deepEqual(snapshot.response.categories,catalog);
 const urls=new Set(Object.values(catalog).flat().map(item=>item.value.official_url));
 assert.equal(snapshot.response.liveness.length,urls.size);
});
