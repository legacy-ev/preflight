import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { canonical, verifyEnvelope } from '../src/lib/verify.mjs';
test('verification accepts signed responses and rejects tampering, expiration and unsigned fixtures', async () => {
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const jwks={keys:[{...publicKey.export({format:'jwk'}),kid:'test'}]};
  const response={domain:'example.com',generated_at:'2026-10-14T09:00:00Z',verdict:'CAUTION',reasons:[]};
  const signature={alg:'ed25519',kid:'test',sig:sign(null,Buffer.from(canonical(response)),privateKey).toString('base64url'),generated_at:response.generated_at,expires_at:'2026-10-15T09:00:00Z'};
  const now=Date.parse('2026-10-14T10:00:00Z');
  assert.deepEqual(await verifyEnvelope({response,signature},jwks,now),response);
  await assert.rejects(verifyEnvelope({response:{...response,verdict:'GO'},signature},jwks,now),/Bad signature/);
  await assert.rejects(verifyEnvelope({response,signature},jwks,Date.parse(signature.expires_at)),/Expired/);
  await assert.rejects(verifyEnvelope({response,signature:{...signature,sig:''}},jwks,now),/Unsigned/);
  await assert.rejects(verifyEnvelope({response,signature:{...signature,kid:'attacker'}},jwks,now),/Unknown/);
  await assert.rejects(verifyEnvelope({response,signature:{...signature,expires_at:'2026-10-16T09:00:00Z'}},jwks,now),/invalid dates/);
});
