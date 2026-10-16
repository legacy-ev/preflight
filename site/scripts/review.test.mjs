import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('site publishing copies evidence verbatim alongside API and keys',async()=>{
  const root=await mkdtemp(join(tmpdir(),'preflight-site-'));
  try {
    await mkdir(join(root,'site/fixtures/api/v1'),{recursive:true});
    await mkdir(join(root,'public-data/scans'),{recursive:true});
    await mkdir(join(root,'keys'));
    const raw='{"domain":"example.com","evidence":{"span":"untrusted","untrusted_evidence":true}}\n';
    await writeFile(join(root,'public-data/scans/example.com.json'),raw);
    await writeFile(join(root,'keys/public-jwks.json'),'{"keys":[]}');
    execFileSync(process.execPath,[new URL('./copy-data.mjs',import.meta.url).pathname],{cwd:join(root,'site')});
    assert.equal(await readFile(join(root,'site/dist/scans/example.com.json'),'utf8'),raw);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('MCP page uses the README installation commands and real server entry',async()=>{
  const page=await readFile(new URL('../src/pages/mcp.astro',import.meta.url),'utf8');
  const readme=await readFile(new URL('../../mcp/README.md',import.meta.url),'utf8');
  for(const text of ['npm ci','npm test','npm start','/absolute/path/to/preflight/mcp/server.js','PREFLIGHT_BASE_URL','https://legacy-ev.github.io/preflight/api/v1/']) {
    assert.ok(readme.includes(text));assert.ok(page.includes(text),text);
  }
  assert.ok(!page.includes('dist/index.js'));
  assert.ok(!page.includes('npm run build'));
});

test('tools redirect shares a base-aware destination for refresh, canonical and visible link',async()=>{
  const page=await readFile(new URL('../src/pages/tools.astro',import.meta.url),'utf8');
  assert.ok(page.includes("`${import.meta.env.BASE_URL.replace(/\\/$/, '')}/tooling/`"));
  assert.ok(page.includes('new URL(target, Astro.site)'));
  assert.match(page, /<meta http-equiv="refresh" content=\{`0;url=\$\{target\}`\}/);
  assert.match(page, /<link rel="canonical" href=\{canonical\}/);
  assert.match(page, /<a href=\{target\}>Agent tooling<\/a>/);
});
