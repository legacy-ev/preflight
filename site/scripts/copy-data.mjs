import { verifyTooling } from '../../agent_tooling/index.mjs';
import { signingKey } from '../../scanner/signing.mjs';
import { refreshToolingFile } from '../../tooling/refresh.mjs';
import { cp, mkdir, access, readdir, readFile, rm } from 'node:fs/promises';
const exists = async p => { try { await access(p); return true; } catch { return false; } };
const toolingPath = '../public-data/api/v1/tooling.json';
const jwks = JSON.parse(await readFile('../keys/public-jwks.json', 'utf8'));
if (process.env.PREFLIGHT_SIGNING_KEY && await exists(toolingPath))
  await refreshToolingFile(toolingPath, signingKey(process.env.PREFLIGHT_SIGNING_KEY), jwks);
await mkdir('dist/api/v1', { recursive: true });
if (await exists('../public-data/api')) await cp('../public-data/api', 'dist/api', { recursive: true });
for (const name of await readdir('fixtures/api/v1')) {
  const target = `dist/api/v1/${name}`;
  if (!await exists(target) || (name === 'preflight' && !(await readdir(target)).some(f => f.endsWith('.json'))))
    await cp(`fixtures/api/v1/${name}`, target, { recursive: true });
}
if (await exists('../public-data/scans')) await cp('../public-data/scans', 'dist/scans', { recursive: true });
await mkdir('dist/.well-known', { recursive: true });
await cp('../keys/public-jwks.json', 'dist/.well-known/http-message-signatures-directory');
await cp('../keys/public-jwks.json', 'dist/keys.json');

// Never publish unsigned, expired, or invalid tooling snapshots.
try {
  verifyTooling(JSON.parse(await readFile('dist/api/v1/tooling.json', 'utf8')), jwks, new Date().toISOString());
} catch {
  await rm('dist/api/v1/tooling.json', { force: true });
}
