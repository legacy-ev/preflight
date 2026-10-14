import { responseRoutes } from './routes.mjs';
export const RULESET_VERSION = '0.1.0-static.1';
const COMMERCE_INTENTS = ['purchase', 'book', 'account_create', 'submit_form'];
const INTENTS = ['read', 'search', 'compare', 'account_login', 'account_create', 'purchase', 'book', 'cancel', 'submit_form', 'download', 'api_call'];
const TEXT = {
  SAFETY_PHISHING_LISTED:'A current trusted safety feed lists this domain.',
  SAFETY_LOOKALIKE_YOUNG:'This domain resembles a seed brand and was registered less than 90 days ago.',
  SAFETY_INJECTION_HIGH:'High-severity prompt-injection heuristics matched the page.',
  TOS_BANS_AGENTS:'High-confidence terms classification bans agents for this intent.',
  TOS_BANS_AUTOMATED_ACCOUNTS:'Terms ban automated account creation.',
  PAYEE_SANCTIONS_MATCH:'A high-confidence payee sanctions match was reported.',
  ACCESS_BLOCKED:'The probe received an access block; this may be specific to PreflightBot.',
  ACCESS_CHALLENGE_PAGE:'A challenge or interstitial was detected; no bypass was attempted.',
  ROBOTS_DISALLOWS_USER_AGENTS:'Robots rules disallow at least one sampled user-triggered AI agent on this path.',
  TOS_REQUIRES_IDENTIFICATION:'Terms require agents to identify themselves.',
  TOS_AMBIGUOUS:'Terms classification has low confidence.',
  PAY_PER_CRAWL:'The probe received HTTP 402 with a declared price.',
  SAFETY_YOUNG_DOMAIN:'This domain was registered less than 90 days ago.',
  SAFETY_INJECTION_MEDIUM:'Medium-severity prompt-injection heuristics matched the page.',
  OUTCOME_LOW_SUCCESS:'Verified outcomes have a seven-day success rate below 50%.',
  OUTCOME_RECENT_DROP:'Verified outcomes fell more than 30 percentage points against the 30-day rate.',
  NO_RETURNS_POLICY:'No returns policy was found for purchase intent.',
  DATA_STALE:'At least one required component is older than twice its TTL.',
  NO_DATA:'No homepage scan is available; retry after permission and access are available.',
  DATA_INCOMPLETE:'Required scan coverage is incomplete or unavailable.',
  INDEPENDENT_SAFETY_UNVERIFIED:'Independent safety agreement is unavailable; a clean heuristic scan alone cannot establish GO.',
  SAFETY_REVIEW_REQUIRED:'A previous safety flag remains pending human review.',
  UNSIGNED_SCAN:'The scan is unsigned because no signing key was supplied.',
};

export function verdict(scan, intent = 'read', at = new Date().toISOString()) {
  if (!INTENTS.includes(intent)) throw new Error('Unsupported intent');
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(scan.domain)) throw new Error('Invalid domain');
  const { safety:s = {}, access:a = {}, route:r = {}, tos:t = {}, outcomes:o = {} } = scan;
  const reasons = [];
  const add = (code, severity, component = 'safety', evidence = {}) => {
    const c = scan[component] ?? {};
    reasons.push({ code, severity, text: TEXT[code], evidence_id: evidence.evidence_id ?? `${scan.domain}:${scan.checked_at}:${component}:${code}`,
      source: evidence.source ?? 'preflight_scan', checked_at: evidence.checked_at ?? c.checked_at ?? scan.checked_at ?? at,
      ttl_seconds: evidence.ttl_seconds ?? c.ttl_seconds ?? 3600 });
  };
  const ages = {};
  let stale = false;
  let invalidTime = false;
  for (const component of ['safety', 'access', 'route', 'tos']) {
    const c = scan[component] ?? {};
    const delta = Date.parse(at) - Date.parse(c.checked_at ?? '1970-01-01');
    if (!Number.isFinite(delta) || delta < 0) invalidTime = true;
    const age = Math.max(0, Math.floor(delta / 1000));
    ages[component] = Number.isFinite(age) ? age : 2147483647;
    if (ages[component] > 2 * (c.ttl_seconds ?? 3600)) stale = true;
  }
  for (const listing of s.listings ?? []) {
    if (listing.trusted === true && Date.parse(at) - Date.parse(listing.checked_at) <= listing.ttl_seconds * 1000 && Date.parse(listing.checked_at) <= Date.parse(at)) {
      add('SAFETY_PHISHING_LISTED','stop','safety',listing); break;
    }
  }
  const young = Number.isInteger(s.domain_age_days) && s.domain_age_days >= 0 && s.domain_age_days < 90;
  if (young && s.lookalike_of) add('SAFETY_LOOKALIKE_YOUNG','stop');
  if (s.findings?.some(x => x.severity === 'high')) add('SAFETY_INJECTION_HIGH','stop');
  const classes = [t.class, ...(t.classes ?? [])];
  if (classes.includes('bans_agents') && t.confidence === 'high' && !['read','search'].includes(intent)) add('TOS_BANS_AGENTS','stop','tos');
  if (classes.includes('bans_automated_accounts') && intent === 'account_create') add('TOS_BANS_AUTOMATED_ACCOUNTS','stop','tos');
  if (['purchase','book'].includes(intent) && s.payee_sanctions_match === 'high') add('PAYEE_SANCTIONS_MATCH','stop');
  if ([401,403,429].includes(a.status) || a.block_page) add('ACCESS_BLOCKED','caution','access');
  if (a.challenge) add('ACCESS_CHALLENGE_PAGE','caution','access');
  if (a.robots_user_agents?.some(x => x.allowed === false)) add('ROBOTS_DISALLOWS_USER_AGENTS','caution','access');
  if (classes.includes('requires_identification')) add('TOS_REQUIRES_IDENTIFICATION','caution','tos');
  if (t.confidence === 'low') add('TOS_AMBIGUOUS','caution','tos');
  if (a.status === 402 && a.pay_per_crawl?.price) add('PAY_PER_CRAWL','caution','access');
  if (young && !s.lookalike_of && COMMERCE_INTENTS.includes(intent)) add('SAFETY_YOUNG_DOMAIN','caution');
  if (s.findings?.some(x => x.severity === 'medium')) add('SAFETY_INJECTION_MEDIUM','caution');
  // Threat-model bounds override raw outcome rates. Static scanner has none.
  const eligible = o.verified_operators >= 3 && o.confirmed_by_probe === true && o.quarantined !== true && o.max_operator_weight <= 0.3;
  if (eligible && o.sample_size_7d >= 5 && o.success_rate_7d < 0.5) add('OUTCOME_LOW_SUCCESS','caution','outcomes');
  if (eligible && o.sample_size_24h >= 5 && o.sample_size_30d >= 5 && o.success_rate_30d - o.success_rate_24h > 0.3) add('OUTCOME_RECENT_DROP','caution','outcomes');
  if (intent === 'purchase' && scan.commerce?.checked === true && scan.commerce.returns_policy_found === false) add('NO_RETURNS_POLICY','caution');
  if (stale) add('DATA_STALE','caution');
  if (!scan.scanned) add('NO_DATA','caution','access');
  if (invalidTime || [s,a,r].some(c => c.complete !== true)) add('DATA_INCOMPLETE','caution');
  if (!s.independently_verified) add('INDEPENDENT_SAFETY_UNVERIFIED','caution');
  if (scan.signed_requests === false) add('UNSIGNED_SCAN','caution','access');
  for (const retained of scan.retained_safety_reasons ?? []) {
    if (!reasons.some(x => x.code === retained.code)) reasons.push({ ...retained });
  }
  if (scan.retained_safety_reasons?.length) add('SAFETY_REVIEW_REQUIRED','caution');
  const result = reasons.some(x => x.severity === 'stop') ? 'STOP' : reasons.some(x => x.severity === 'caution') ? 'CAUTION' : 'GO';
  const low = reasons.some(x => ['DATA_STALE','NO_DATA','TOS_AMBIGUOUS','DATA_INCOMPLETE'].includes(x.code));
  const allFresh = Object.entries(ages).every(([k,v]) => v <= (scan[k]?.ttl_seconds ?? 3600));
  return { domain: scan.domain, intent, verdict: result, confidence: low ? 'low' : allFresh && eligible && o.sample_size_7d >= 20 ? 'high' : 'medium',
    summary: result === 'GO' ? 'No deterministic rule fired; this is advisory only.' : `${result}: ${reasons.map(x => TEXT[x.code] ?? 'A previous safety flag remains.').join(' ')}`.slice(0,280),
    reasons, best_route: responseRoutes(r.routes ?? [],scan.domain), requirements:{ must_self_identify:classes.includes('requires_identification'), login_required:a.status === 401,
      captcha_seen:Boolean(a.challenge), pay_per_crawl:a.pay_per_crawl ?? null, tos_class: t.class ?? 'unknown', tos_url:null, tos_classification:'not yet classified' },
    safety:{listed_on:(s.listings ?? []).filter(x=>x.trusted === true).map(x=>x.source), domain_age_days:s.domain_age_days ?? null,
      lookalike_of:s.lookalike_of ?? null,injection_findings:(s.findings ?? []).map(x=>x.code)},
    outcomes:{success_rate_7d:eligible ? o.success_rate_7d ?? null : null,success_rate_30d:eligible ? o.success_rate_30d ?? null : null,
      sample_size_7d:eligible ? o.sample_size_7d ?? 0 : 0,top_failure_stage:null},freshness:ages,
    links:{human_page:`/preflight/site/${scan.domain}`,retry:`/preflight/api/v1/preflight/${scan.domain}.json`},
    ruleset_version:RULESET_VERSION,generated_at:at,signature:null };
}
