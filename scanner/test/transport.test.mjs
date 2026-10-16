import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { publicFetch } from '../transport.mjs';
import { robotsDecision, parseRobots } from '../robots.mjs';

test('HTTPS request pins approved DNS result, preserving original hostname and preventing rebinding',async()=>{
 let lookups=0;let requested=false;
 const lookupImpl=async()=>{lookups++;return [{address:lookups===1?'1.1.1.1':'127.0.0.1',family:4}];};
 const requestImpl=(url,options,callback)=>{
  requested=true;
  assert.equal(url.hostname,'shop.example');
  assert.equal(options.servername,'shop.example');
  options.lookup('shop.example',{all:true},(error,records)=>{
   assert.equal(error,null);assert.deepEqual(records,[{address:'1.1.1.1',family:4}]);
  });
  options.lookup('shop.example',{},(error,address,family)=>{
   assert.equal(error,null);assert.equal(address,'1.1.1.1');assert.equal(family,4);
  });
  const request=new EventEmitter();
  request.end=()=>{
   const response=Readable.from([Buffer.from('<p>Shop</p>')]);
   response.statusCode=200;response.headers={'content-type':'text/html'};
   callback(response);
  };
  return request;
 };
 const response=await publicFetch('https://shop.example/',{headers:{'User-Agent':'PreflightBot/1.0'}},{lookupImpl,requestImpl});
 assert.equal(await response.text(),'<p>Shop</p>');
 assert.equal(response.status,200);assert.equal(lookups,1);assert.ok(requested);
});

test('transport never connects to DNS answers containing any private address',async()=>{
 let calls=0;
 await assert.rejects(publicFetch('https://shop.example/',{}, {lookupImpl:async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}],requestImpl:()=>{calls++;}}));
 assert.equal(calls,0);
});

test('robots matched third-party rules are capped and marked untrusted',()=>{
 const decision=robotsDecision(parseRobots('User-agent: *\nDisallow: /private'),'PreflightBot','/private');
 assert.equal(decision.untrusted_evidence,true);
 assert.ok(decision.matched_rule.length<=200);
});

test('compressed HTTPS bodies are decoded before the streaming byte cap is applied',async()=>{
 const {gzipSync}=await import('node:zlib');
 const {readBounded}=await import('../network.mjs');
 const requestImpl=(_url,_options,callback)=>{
  const req=new EventEmitter();
  req.end=()=>{
   const response=Readable.from([gzipSync(Buffer.from('x'.repeat(10000)))]);
   response.statusCode=200;response.headers={'content-encoding':'gzip'};
   callback(response);
  };
  return req;
 };
 const response=await publicFetch('https://shop.example/',{}, {lookupImpl:async()=>[{address:'1.1.1.1',family:4}],requestImpl});
 const result=await readBounded(response,100);
 assert.equal(result.body,'x'.repeat(100));
 assert.equal(result.truncated,true);
});

test('HTTPS transport sends the OSV read-only POST body over the pinned connection',async()=>{
 const body=JSON.stringify({package:{ecosystem:'PyPI',name:'mcp'}});
 const requestImpl=(_url,options,callback)=>{
  assert.equal(options.method,'POST');assert.equal(options.headers['Content-Type'],'application/json');
  const req=new EventEmitter();
  req.end=value=>{
   assert.equal(value,body);
   const response=Readable.from([Buffer.from('{}')]);response.statusCode=200;response.headers={};callback(response);
  };
  return req;
 };
 const response=await publicFetch('https://api.osv.dev/v1/query',{method:'POST',body,headers:{'Content-Type':'application/json'}},
  {lookupImpl:async()=>[{address:'1.1.1.1',family:4}],requestImpl});
 assert.equal(await response.text(),'{}');
});
