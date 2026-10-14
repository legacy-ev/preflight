import { cp, mkdir, access, readdir } from 'node:fs/promises';
const exists = async p => { try { await access(p); return true; } catch { return false; } };
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
