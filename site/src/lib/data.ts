import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
export const apiRoot = resolve('../public-data/api');
const fallback = resolve('fixtures/api');
export const usingFixtures = !existsSync(resolve(apiRoot, 'v1/preflight')) || !readdirSync(resolve(apiRoot, 'v1/preflight')).some(f => f.endsWith('.json'));
export const responseRoot = usingFixtures ? fallback : apiRoot;
export function readData(name: string) {
  const live = resolve(apiRoot, 'v1', name);
  return JSON.parse(readFileSync(existsSync(live) ? live : resolve(fallback, 'v1', name), 'utf8'));
}
export const records = readdirSync(resolve(responseRoot, 'v1/preflight')).filter(f => f.endsWith('.json')).sort().map(f => {
  const envelope = JSON.parse(readFileSync(resolve(responseRoot, 'v1/preflight', f), 'utf8'));
  const r = envelope.response;
  if (!r || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(r.domain) || !['GO','CAUTION','STOP'].includes(r.verdict)) throw new Error(`Invalid response: ${f}`);
  return { ...r, envelopeSignature: envelope.signature };
});
export const index = readData('index.json');
export const changes = readData('changes.json').sort((a: any,b: any) => b.at.localeCompare(a.at));
export const href = (path = '') => `/preflight/${path}`;
export const date = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone:'UTC', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' UTC';
export function safeEndpoint(endpoint: string, domain: string) {
  try { const u = new URL(endpoint); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && (u.hostname === domain || u.hostname.endsWith(`.${domain}`)) && !/pay|checkout|login|credential|wallet|token|auth/i.test(u.pathname); } catch { return false; }
}
