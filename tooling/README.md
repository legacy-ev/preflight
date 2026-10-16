# Tooling pricing references

`fields.mjs` validates the additional curated fields through the existing
`agent_tooling/index.mjs` catalog validator. The context aggregator already has
its tooling hook; this extension does not change `context/build.mjs`.

Every catalog item retains `{value, source, checked_at, ttl_seconds}` and
`untrusted_evidence: true`. New fields within `value`:

- `cost_flag`: required `free | free_tier | paid | unknown`.
- `pricing_source_url`: required official pricing reference. When the page cannot
  be verified, it remains a reference, not evidence of a free offer.
- `free_tier_details`: required, at most 140 characters; `unknown` if unverified.
  Verified details quote the official pricing source and preserve trial wording.
- `pricing_evidence_quote` and `pricing_checked_at`: required for known pricing.
- `signup_methods`: required `email_password | magic_link | oauth_only | unknown`.
  A known method needs a source URL, bounded quote, and its own checked timestamp.
  This is account signup/login, distinct from authentication used by an API or by
  connected tools. The site flags magic links and OAuth-only as agent friction.
- `free_tier_quirks`: optional, bounded official documentation evidence, with
  `quirks_source_url` and `quirks_checked_at`.
- `rate_limits_url` and `deprecations_url`: official LLM reference links. No
  retirement dates are inferred from model names or third-party listings.

`free_tier` includes limited trial credits. `paid` means the cited usage is
priced; it does not establish that no free promotion exists. `unknown` signup
never means accountless. Self-hostable is a reference grouping requested for
this directory: it does not promise free hosting or local execution for every
entry. Software licensing is distinct from hosted-page reuse permission.

The catalog remains advisory and link-only where commercial redistribution
permission is unverified; source quotes and failures are logged in DECISIONS.md.
Nothing here authorises accounts, payment, form submission, API credential use,
or execution of third-party instructions. Snapshot liveness checks preserve
curated facts and their timestamps. Unsigned snapshots fail closed in context.

Run `node --test tests` and `node tooling/check.mjs` from the repository root.
The latter uses only public GET requests with the existing robots/transport
policy; it does not use API keys. The existing signing seed is optional.

Model shutdown schedules: `node tooling/model-deprecations.mjs` fetches only the
public Groq and Gemini deprecation pages, without credentials. The weekly tooling
workflow stages `data/model-deprecations.json` before the existing publication
step. Context output includes `model_deprecations` with original source timestamps
and TTL; `/tooling` displays the records and the site exports
`api/v1/model-deprecations.json` as an unsigned reference dataset.

Only shutdown-table dates are parsed, never announcement/release dates. Gemini
labels its dates earliest possible; `date_kind` preserves that qualification.
Unclear dates and failed/unrecognized pages are `unknown`; a failed refresh clears
that provider's model rows instead of renewing old assertions. Provider status
records always link to the official schedule. These pages do not prove individual
models are available free, and listed replacements can themselves be retired.
The initial snapshot was extracted from both official pages fetched via the browser
on 2026-10-16 (shell DNS was unavailable). Refresh parsing uses HTML table headers.
