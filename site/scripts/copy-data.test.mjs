import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { signingKey, publicJWK, envelope } from '../../scanner/signing.mjs';
import { verifyTooling } from '../../agent_tooling/index.mjs';
const seed=Buffer.alloc(32,9).toString('base64url'),key=signingKey(seed),jwks={keys:[publicJWK(key)]};
const script=new URL('./copy-data.mjs',import.meta.url);
for(const mode of ['unsigned','expired','signed','build-signs'])test('site tooling publication: '+mode,async()=>{
 const root=await mkdtemp(join(tmpdir(),'tooling-copy-'));
 try {
  for(const dir of ['site/fixtures/api/v1','keys','public-data/api/v1'])await mkdir(join(root,dir),{recursive:true});
  await writeFile(join(root,'keys/public-jwks.json'),JSON.stringify(jwks));
  const raw=envelope({categories:{},liveness:[]},mode==='unsigned'||mode==='build-signs'?null:key,mode==='expired'?'2020-01-01T00:00:00Z':new Date().toISOString());
  await writeFile(join(root,'public-data/api/v1/tooling.json'),JSON.stringify(raw));
  execFileSync(process.execPath,[script.pathname],{cwd:join(root,'site'),env:{...process.env,PREFLIGHT_SIGNING_KEY:mode==='build-signs'?seed:''}});
  const output=join(root,'site/dist/api/v1/tooling.json');
  if(mode==='unsigned'||mode==='expired')await assert.rejects(readFile(output),{code:'ENOENT'});
  else assert.ok(verifyTooling(JSON.parse(await readFile(output,'utf8')),jwks,new Date().toISOString()));
 }finally{await rm(root,{recursive:true,force:true});}
});
