import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('weekly identity refresh skips fresh snapshots and keeps files on validation failure',async()=>{
 const {refreshIdentity}=await import('../refresh-identity.mjs');
 const root=await mkdtemp(join(tmpdir(),'identity-')); const directory=join(root,'vendor');
 try {
  await cp(new URL('../vendor/',import.meta.url),directory,{recursive:true});
  let calls=0;
  const original=await readFile(join(directory,'metadata.json'),'utf8');
  const at=JSON.parse(original).checked_at;
  const due=new Date(Date.parse(at)+604800001).toISOString();
  assert.equal(await refreshIdentity({directory,at,read:async()=>{calls++;throw Error();}}),false);
  assert.equal(calls,0);
  await assert.rejects(refreshIdentity({directory,at:due,read:async()=>'<html>untrusted error</html>'}));
  assert.equal(await readFile(join(directory,'metadata.json'),'utf8'),original);
  const requested=[];
  const refreshed=await refreshIdentity({directory,at:due,read:async url=>{requested.push(url);return readFile(new URL('../vendor/'+new URL(url).pathname.split('/').at(-1),import.meta.url),'utf8');}});
  assert.equal(refreshed,true);
  assert.deepEqual(requested.map(url=>new URL(url).pathname.split('/').at(-1)),['confusables.txt','Scripts.txt']);
  const metadata=JSON.parse(await readFile(join(directory,'metadata.json'),'utf8'));
  assert.deepEqual(Object.keys(metadata.sha256),['confusables.txt','Scripts.txt']);
  assert.equal(JSON.parse(await readFile(join(directory,'metadata.json'),'utf8')).checked_at,due);
 }finally{await rm(root,{recursive:true,force:true});}
});
