import { createPrivateKey, createPublicKey, createHash, sign, randomBytes } from 'node:crypto';
export const KID = 'preflight-2026-10';
export const USER_AGENT = 'PreflightBot/1.0 (+https://legacy-ev.github.io/preflight/bot)';
export const SIGNATURE_AGENT = 'https://legacy-ev.github.io';

export function canonical(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite JSON number');
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('Not a JSON value');
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
}

export function signingKey(seed) {
  if (!seed) return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(seed)) throw new Error('PREFLIGHT_SIGNING_KEY must be a base64url raw 32-byte seed');
  const bytes = Buffer.from(seed, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== seed) throw new Error('Invalid Ed25519 seed encoding');
  return createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), bytes]), type: 'pkcs8', format: 'der' });
}

export function publicJWK(key) {
  return { ...createPublicKey(key).export({ format: 'jwk' }), kid: KID, use: 'sig' };
}

export function envelope(response, key, at = new Date().toISOString()) {
  const expires_at = new Date(Date.parse(at) + 86400000).toISOString();
  const payload = { ...response, signature: null, generated_at: at, expires_at };
  return { response: payload, signature: key ? { alg: 'ed25519', kid: KID,
    sig: sign(null, Buffer.from(canonical(payload)), key).toString('base64url'), generated_at: at, expires_at } : null };
}

export function requestHeaders(url, key, at = new Date().toISOString()) {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html, application/json, text/plain;q=0.9' };
  if (!key) return headers;
  const jwk = createPublicKey(key).export({ format: 'jwk' });
  const thumbprint = createHash('sha256').update(canonical({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest('base64url');
  const created = Math.floor(Date.parse(at) / 1000);
  const params = `("@authority" "@method" "@path" "signature-agent");created=${created};expires=${created + 300};keyid="${thumbprint}";alg="ed25519";nonce="${randomBytes(18).toString('base64url')}";tag="web-bot-auth"`;
  const uri = new URL(url);
  headers['Signature-Agent'] = `"${SIGNATURE_AGENT}"`;
  const base = `"@authority": ${uri.host}\n"@method": GET\n"@path": ${uri.pathname}\n"signature-agent": ${headers['Signature-Agent']}\n"@signature-params": ${params}`;
  headers['Signature-Input'] = `preflight=${params}`;
  headers.Signature = `preflight=:${sign(null, Buffer.from(base), key).toString('base64')}:`;
  return headers;
}
