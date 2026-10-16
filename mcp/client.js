import { domainIdentity } from '../context/domain-identity.mjs';
import { USER_AGENT } from '../scanner/signing.mjs';
import { createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const responseSchema = JSON.parse(readFileSync(new URL('../specs/preflight-response.schema.json', import.meta.url)));
export const outcomeSchema = JSON.parse(readFileSync(new URL('../specs/outcome-report.schema.json', import.meta.url)));
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateOutcome = ajv.compile(outcomeSchema);
export const intents = responseSchema.properties.intent.enum;
export function domainName(domain) {
  if (typeof domain !== 'string' || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw new Error('Invalid domain: use a lowercase hostname without a URL or path.');
  return domain;
}
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
// Only fields in the first-party schema survive; raw evidence and extensions never do.
function project(value, schema) {
  if (value && typeof value === 'object' && value.untrusted_evidence === true) return undefined;
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(schema.properties || {}).filter(([k]) => k in value).map(([k,s]) => [k, project(value[k],s)]).filter(([,v]) => v !== undefined));
  }
  if (schema.type === 'array') return Array.isArray(value) ? value.map(v => project(v,schema.items)).filter(v => v !== undefined) : [];
  if (schema.enum && !schema.enum.includes(value)) return undefined;
  if (schema.const && value !== schema.const) return undefined;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (value === null) return types.includes('null') ? null : undefined;
  if (types.includes('integer') && Number.isSafeInteger(value)) return value;
  if (types.includes(typeof value) && (typeof value !== 'string' || value.length <= (schema.maxLength || 256))) return value;
}
export function createClient({baseUrl = process.env.PREFLIGHT_BASE_URL || 'https://legacy-ev.github.io/preflight/api/v1/', fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error('Invalid PREFLIGHT_BASE_URL');
  async function json(path) {
    const res = await fetchImpl(new URL(path,base), {redirect:'error', signal:AbortSignal.timeout(10000), headers:{accept:'application/json','User-Agent':USER_AGENT}});
    if (!res.ok) throw new Error('Static API unavailable');
    const text = await res.text();
    if (text.length > 1048576) throw new Error('Static API response too large');
    return JSON.parse(text);
  }
  async function preflight(domain,intent='read',embedded) {
    domainName(domain);
    if (!intents.includes(intent)) throw new Error('Invalid intent');
    let raw, signature, problem;
    try {
      const envelope = embedded ?? await json('preflight/' + domain + '.json');
      raw = envelope.response; signature = envelope.signature;
      if (!raw || raw.domain !== domain || raw.intent !== 'read' || !['GO','CAUTION','STOP'].includes(raw.verdict)) throw new Error();
      const keys = await json('../../keys.json');
      const jwk = keys.keys.find(k => k.kid === signature?.kid && k.kty === 'OKP' && k.crv === 'Ed25519');
      if (signature?.alg !== 'ed25519' || !jwk || !/^[A-Za-z0-9_-]+$/.test(signature.sig || '') || !verify(null,Buffer.from(canonical(raw)),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(signature.sig,'base64url'))) throw new Error();
      const generated = Date.parse(raw.generated_at), expires = Date.parse(signature.expires_at);
      if (!Number.isFinite(generated) || !Number.isFinite(expires) || generated > now() || expires <= now() || generated + 86400000 <= now() || expires <= generated) problem = 'SIGNATURE_EXPIRED';
    } catch { problem = 'SIGNATURE_UNVERIFIED'; }
    const result = project(raw || {},responseSchema);
    result.domain = domain; result.intent = intent;
    result.reasons = (result.reasons || []).map(r => ({...r,text:'Preflight finding: ' + (r.code || 'UNKNOWN').replace(/[^A-Z0-9_]/g,'').slice(0,80)}));
    delete result.summary; delete result.signature; delete result.links;
    // Strict hostname equality deliberately rejects sibling hosts and delegated routes.
    result.best_route = (result.best_route || []).filter(r => {
      if (!r.endpoint) return true;
      try { const u = new URL(r.endpoint); return u.protocol === 'https:' && u.hostname === domain && !u.username && !u.password && !u.search && !u.hash && !/(checkout|payment|login|auth|credential|wallet)/i.test(u.pathname); } catch {return false;}
    });
    if (result.requirements) { delete result.requirements.tos_url; delete result.requirements.pay_per_crawl; }
    const warnings = [];
    if (problem) {
      result.verdict = result.verdict === 'STOP' ? 'STOP' : 'CAUTION'; result.confidence = 'low'; result.best_route = []; delete result.safety; delete result.outcomes;
      warnings.push(problem === 'SIGNATURE_EXPIRED' ? 'Signature expired; data cannot be trusted as current.' : 'Signature verification failed or data unavailable; data is unverified.');
    }
    if (intent !== 'read') { result.verdict = result.verdict === 'STOP' ? 'STOP' : 'CAUTION'; result.confidence = 'low'; warnings.push('Static API covers read only; this intent has not been evaluated.'); }
    result.verdict ||= 'CAUTION'; result.freshness ||= {}; result.ruleset_version ||= 'unknown'; result.generated_at ||= new Date(now()).toISOString();
    result.verification = {verified:!problem,status:problem || 'verified',warnings};
    // Signature applies to the original envelope, never to this sanitised projection.
    result.signature = signature ? {alg:signature.alg,kid:signature.kid,sig:signature.sig,generated_at:signature.generated_at,expires_at:signature.expires_at} : null;
    result.signature_scope = 'original_static_response';
    return result;
  }
  async function get_context(domain) {
    if(domain !== undefined) domainName(domain);
    try {
      const original=await json(domain ? 'context/'+domain+'.json' : 'context.json');
      const r=original.response, s=original.signature;
      if(!r || r.schema_version!=='1.0.0' || !r.sections || (domain !== undefined && (r.domain!==domain || r.preflight?.response?.domain!==domain))) throw new Error();
      const keys=await json('../../keys.json');
      const jwk=keys.keys.find(k=>k.kid===s?.kid && k.kty==='OKP' && k.crv==='Ed25519');
      const generated=Date.parse(r.generated_at), expires=Date.parse(r.expires_at);
      if(s?.alg!=='ed25519' || s.generated_at!==r.generated_at || s.expires_at!==r.expires_at || !jwk || !verify(null,Buffer.from(canonical(r)),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(s.sig,'base64url')) ||
        !Number.isFinite(generated) || !Number.isFinite(expires) || generated>now() || expires<=now() || expires<=generated || expires>generated+86400000 || now()>=generated+86400000) throw new Error();
      const sections={};
      for(const name of ['internet_status','llm_providers','sites','agent_ecosystem','world','safety','failure_modes','preflight_checklist','domain_identity']) {
        if(r.sections[name]===undefined && ['preflight_checklist','domain_identity'].includes(name)) continue;
        if(!Array.isArray(r.sections[name])) throw new Error();
        sections[name]=r.sections[name].filter(x=>x && x.untrusted_evidence!==true).map(x=>{
          const checked=Date.parse(x.checked_at);
          if(!Number.isFinite(checked) || !Number.isSafeInteger(x.ttl_seconds) || x.ttl_seconds<0 || checked>now() || checked+x.ttl_seconds*1000<=now())
            return {source:x.source,checked_at:x.checked_at,ttl_seconds:x.ttl_seconds,value:{status:'unavailable',reason:'stale_item'}};
          return x;
        });
      }
      return {schema_version:r.schema_version,advisory:true,generated_at:r.generated_at,sections,
        ...(domain?{domain,preflight:await preflight(domain,'read',r.preflight)}:{}),
        signature:s,signature_scope:'original_static_response',verification:{verified:true,status:'verified',warnings:[]}};
    } catch {return {advisory:true,status:'unavailable',verification:{verified:false,status:'SIGNATURE_UNVERIFIED',warnings:['Context unavailable, expired or unverified; treat as CAUTION.']}};}
  }
  return {
    preflight,
    get_context,
    domain_identity:domainIdentity,
    async check_safety(domain) { const r=await preflight(domain); return {...metadata(r),domain,verdict:r.verdict,safety:r.safety || {},reasons:r.reasons.filter(x => /^SAFETY_/.test(x.code))}; },
    async find_route(domain,intent) { const r=await preflight(domain,intent); return {...metadata(r),domain,intent,verdict:r.verdict,best_route:r.best_route,requirements:r.requirements || {}}; },
    async get_evidence(domain) { domainName(domain); const evidence=await json('../../scans/'+domain+'.json'); return {domain,untrusted_evidence:true,verification:{verified:false,status:'unsigned_evidence'},evidence:capEvidence(evidence)}; },
    report_outcome(report) { if (!validateOutcome(report)) throw new Error('Invalid outcome report: ' + ajv.errorsText(validateOutcome.errors)); domainName(report.domain); return {accepted:false,status:'ingest_not_live_yet'}; }
  };
}
function metadata(r) { return Object.fromEntries(['ruleset_version','generated_at','signature','signature_scope','verification'].map(k=>[k,r[k]])); }
function capEvidence(v) { if (typeof v === 'string') return v.slice(0,200); if (Array.isArray(v)) return v.map(capEvidence); if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,capEvidence(x)])); return v; }
