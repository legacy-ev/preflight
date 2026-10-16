import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { envelope, signingKey, publicJWK, KID } from '../scanner/signing.mjs';
import { verifyTooling } from '../agent_tooling/index.mjs';

// Repository liveness data is refreshed weekly; only the envelope is renewed here.
export function refreshTooling(raw, key, jwks, at = new Date().toISOString()) {
  if (!key || !jwks.keys.some(k => k.kid === KID && k.x === publicJWK(key).x)) throw new Error('Missing or mismatched tooling signing key');
  const signed = envelope(raw.response, key, at);
  verifyTooling(signed, jwks, at);
  return signed;
}
export async function refreshToolingFile(path, key, jwks) {
  const signed = refreshTooling(JSON.parse(await readFile(path, 'utf8')), key, jwks);
  await writeFile(path + '.tmp', JSON.stringify(signed) + '\n');
  await rename(path + '.tmp', path);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const jwks = JSON.parse(await readFile(new URL('../keys/public-jwks.json', import.meta.url), 'utf8'));
  await refreshToolingFile('public-data/api/v1/tooling.json', signingKey(process.env.PREFLIGHT_SIGNING_KEY), jwks);
}
