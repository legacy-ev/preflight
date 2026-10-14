import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { robotsDecision, parseRobots } from '../robots.mjs';
import { BoundedClient } from '../network.mjs';
import { publicFetch } from '../transport.mjs';

// Run hostile input out of process so a backtracking regression cannot hang the suite.
test('robots wildcard matching handles hostile patterns in bounded time', () => {
  const code = `import {robotsDecision,parseRobots} from './robots.mjs';
    const rules=parseRobots('User-agent: *\\nDisallow: /'+'*a'.repeat(40)+'b$');
    if(!robotsDecision(rules,'PreflightBot','/'+'a'.repeat(200000)).allowed) process.exit(1);
    const long=parseRobots('User-agent: *\\nDisallow: /*'+'a'.repeat(50000)+'b*');
    if(!robotsDecision(long,'PreflightBot','/'+'a'.repeat(200000)).allowed) process.exit(1);`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:new URL('..',import.meta.url),timeout:2000});
  assert.equal(result.error,undefined);
  assert.equal(result.status,0);
});

test('wildcards preserve anchored, prefix, repeated-star and literal semantics',()=>{
  for(const [pattern,path,match] of [
    ['/a*b$','/axbb',true], ['/a*b$','/axbbc',false], ['/a*b','/axbbc',true],
    ['/a**b*c$','/abbc',true], ['/*ab*ab$','/ab',false], ['/*ab*ab$','/abab',true],
    ['/a.b$','/axb',false], ['/*$','/anything',true], ['/a$','/aa',false],
    ['/a*aab$','/aaaaab',true], ['/é*%62$','/%C3%A9xxb',true],
  ]) assert.equal(robotsDecision(parseRobots(`User-agent: *\nDisallow: ${pattern}`),'PreflightBot',path).allowed,!match,`${pattern} ${path}`);
});

test('relative redirect uses current directory and still enforces origin and path safety',async()=>{
  for(const [location,expected] of [['next.json','https://shop.example/dir/next.json'],['../next.json','https://shop.example/next.json'],['//evil.example/x',null],['../login',null]]) {
    const calls=[];
    const client=new BoundedClient('https://shop.example',{validateURL:async()=>true,sleep:async()=>{},now:()=>0,fetchImpl:async url=>{
      calls.push(url);
      return calls.length===1 ? new Response('',{status:302,headers:{location}}) : new Response('ok');
    }});
    const result=await client.get('/dir/start.json');
    assert.deepEqual(calls,expected?['https://shop.example/dir/start.json',expected]:['https://shop.example/dir/start.json']);
    assert.equal(result.error,expected?undefined:'unsafe_or_off_origin_redirect');
  }
});

test('synthetic DNS requires independent public DNS confirmation before connecting',async()=>{
  let connects=0;let confirmations=0;
  const options={lookupImpl:async()=>[{address:'198.18.0.1',family:4}],
    dnsJSON:async (_host,type)=>{confirmations++;return {Status:0,Answer:type===1?[{type:1,data:'10.0.0.1'}]:[]};},
    requestImpl:()=>{connects++;throw new Error('must not connect');}};
  await assert.rejects(publicFetch('https://shop.example/',{},options),/Non-public/);
  assert.ok(confirmations>0);
  assert.equal(connects,0);
});

test('synthetic gateway connects only for confirmed public names and pins gateway with original TLS hostname',async()=>{
  const {EventEmitter}=await import('node:events');
  const {Readable}=await import('node:stream');
  const {validatePublicURL}=await import('../addresses.mjs');
  let connections=0;
  const dependencies={lookupImpl:async()=>[{address:'198.18.0.1',family:4}],
    dnsJSON:async (_host,type)=>({Status:0,Answer:type===1?[{type:1,data:'1.1.1.1'}]:[{type:28,data:'2606:4700:4700::1111'}]}),
    requestImpl:(url,options,callback)=>{
      connections++;
      assert.equal(url.hostname,'shop.example');assert.equal(options.servername,'shop.example');
      assert.notEqual(options.rejectUnauthorized,false);
      options.lookup(url.hostname,{},(error,address)=>{assert.equal(error,null);assert.equal(address,'198.18.0.1');});
      const req=new EventEmitter();req.end=()=>{
        const res=Readable.from([Buffer.from('public')]);res.statusCode=200;res.headers={};callback(res);
      };return req;
    }};
  assert.equal(await validatePublicURL('https://shop.example/',dependencies),true);
  const response=await publicFetch('https://shop.example/',{},dependencies);
  assert.equal(await response.text(),'public');assert.equal(connections,1);
});

test('synthetic DNS fails closed for private/mixed DNS, missing DNS, resolver failure and legacy opt-in',async()=>{
  let connections=0;
  for(const answer of [
    {Status:0,Answer:[{type:1,data:'10.1.2.3'}]},
    {Status:0,Answer:[{type:1,data:'1.1.1.1'},{type:28,data:'fd00::1'}]},
    {Status:0,Answer:[{type:1,data:'127.0.0.1'}]},
    {Status:0,Answer:[{type:1,data:'169.254.169.254'}]},
    {Status:0,Answer:[{type:1,data:'198.18.0.1'}]},
    {Status:3}, {Status:0}, {Status:0,TC:true}, {Status:0,Answer:[{type:1,data:'not-an-ip'}]},
    null,
  ]) {
    await assert.rejects(publicFetch('https://shop.example/',{}, {
      allowSyntheticDNS:true,lookupImpl:async()=>[{address:'198.18.0.1',family:4}],
      dnsJSON:async()=>{if(!answer) throw new Error('resolver unavailable');return answer;},
      requestImpl:()=>{connections++;throw new Error('must not connect');},
    }));
  }
  assert.equal(connections,0);
});

test('literal, local and mixed private DNS never use synthetic gateway confirmation',async()=>{
  let confirmations=0;
  for(const [url,addresses] of [
    ['https://198.18.0.1/',['198.18.0.1']], ['https://localhost/',['198.18.0.1']],
    ['https://shop.internal/',['198.18.0.1']], ['https://shop.example/',['198.18.0.1','10.0.0.1']],
    ['https://shop.example/',['127.0.0.1']], ['http://shop.example/',['198.18.0.1']],
  ]) await assert.rejects(publicFetch(url,{}, {lookupImpl:async()=>addresses.map(address=>({address,family:4})),
    dnsJSON:async()=>{confirmations++;throw new Error('must not confirm');}}));
  assert.equal(confirmations,0);
});
