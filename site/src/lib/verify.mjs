// Static CONTRACT.md envelope; RFC 8785-compatible for I-JSON input.
export function canonical(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-I-JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
const decode = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function verifyEnvelope(envelope, trustedJwks, now = Date.now()) {
  const { response, signature: s } = envelope;
  if (!response || s?.alg !== 'ed25519' || !s.sig) throw new Error('Unsigned response: treat as CAUTION');
  const generated = Date.parse(s.generated_at), expires = Date.parse(s.expires_at);
  if (!Number.isFinite(generated) || !Number.isFinite(expires) || generated > now || expires <= now || expires <= generated || expires - generated > 86400000 || response.generated_at !== s.generated_at)
    throw new Error('Expired or invalid dates: treat as CAUTION');
  const jwk = trustedJwks.keys.find(k => k.kid === s.kid && k.kty === 'OKP' && k.crv === 'Ed25519');
  if (!jwk) throw new Error('Unknown signing key: treat as CAUTION');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
  if (!await crypto.subtle.verify('Ed25519', key, decode(s.sig), new TextEncoder().encode(canonical(response))))
    throw new Error('Bad signature: treat as CAUTION');
  // Envelope dates are not covered by the response signature. Anchor expiry to signed generated_at.
  if (now >= Date.parse(response.generated_at) + 86400000) throw new Error('Snapshot older than 24h: treat as CAUTION');
  return response;
}
