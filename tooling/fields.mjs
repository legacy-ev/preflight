// Curated references are data, never instructions or authorisation to sign up/pay.
export const COST_FLAGS = ['free', 'free_tier', 'paid', 'unknown'];
export const SIGNUP_METHODS = ['email_password', 'magic_link', 'oauth_only', 'unknown'];
const bounded = (text, cap) => typeof text === 'string' && text.length > 0 && text.length <= cap;
export function validateToolingFields(value, https) {
 if (!COST_FLAGS.includes(value.cost_flag)) throw new Error('Missing/invalid cost_flag');
 https(value.pricing_source_url);
 if (!bounded(value.free_tier_details, 140)) throw new Error('Invalid free_tier_details');
 if (!SIGNUP_METHODS.includes(value.signup_methods)) throw new Error('Invalid signup_methods');
 for (const field of ['pricing_evidence_quote','signup_evidence_quote','free_tier_quirks']) {
  if (value[field] !== undefined && !bounded(value[field], 140)) throw new Error(`Invalid ${field}`);
 }
 for (const field of ['signup_source_url','rate_limits_url','deprecations_url','quirks_source_url']) {
  if (value[field] !== undefined) https(value[field]);
 }
 const pricingKnown = value.cost_flag !== 'unknown' || value.free_tier_details !== 'unknown';
 if (pricingKnown && (!bounded(value.pricing_evidence_quote,140) || !Number.isFinite(Date.parse(value.pricing_checked_at)))) throw new Error('Missing pricing evidence');
 if (value.signup_methods !== 'unknown' && (!value.signup_source_url || !bounded(value.signup_evidence_quote,140) || !Number.isFinite(Date.parse(value.signup_checked_at)))) throw new Error('Missing signup evidence');
 if (value.free_tier_quirks && (!value.quirks_source_url || !Number.isFinite(Date.parse(value.quirks_checked_at)))) throw new Error('Missing quirks evidence');
}
export function agentSignupFriction(method) {
 return method === 'magic_link' || method === 'oauth_only';
}
