import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createClient} from '../client.js';

test('get_evidence reads evidence published by the site under the Pages base',async()=>{
  const root=await mkdtemp(join(tmpdir(),'preflight-mcp-publication-'));
  let server;
  try {
    await mkdir(join(root,'site/fixtures/api/v1'),{recursive:true});
    await mkdir(join(root,'public-data/scans'),{recursive:true});
    await mkdir(join(root,'keys'));
    await writeFile(join(root,'public-data/scans/example.com.json'),JSON.stringify({
      evidence:{span:'untrusted '.repeat(40),untrusted_evidence:true},
    }));
    await writeFile(join(root,'keys/public-jwks.json'),'{"keys":[]}');
    await cp(new URL('../../site/scripts/copy-data.mjs',import.meta.url),join(root,'site/copy-data.mjs'));
    execFileSync(process.execPath,['copy-data.mjs'],{cwd:join(root,'site')});
    server=createServer(async(req,res)=>{
      if(req.url!=='/preflight/scans/example.com.json') {res.writeHead(404).end();return;}
      try {res.setHeader('Content-Type','application/json');res.end(await readFile(join(root,'site/dist/scans/example.com.json')));}
      catch {res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const client=createClient({baseUrl:`http://127.0.0.1:${server.address().port}/preflight/api/v1/`});
    const result=await client.get_evidence('example.com');
    assert.equal(result.domain,'example.com');assert.equal(result.untrusted_evidence,true);
    assert.equal(result.verification.status,'unsigned_evidence');
    assert.equal(result.evidence.evidence.span.length,200);
  } finally {
    if(server) await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await rm(root,{recursive:true,force:true});
  }
});
