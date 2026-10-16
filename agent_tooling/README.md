# Agent tooling reference directory

`data/tooling.json` contains alphabetical, manually reviewed reference items, each
with value, source, checked_at and ttl_seconds. Product descriptions are original
neutral paraphrases of the fetched official pages. Unknown is deliberate: a
mention of an integration or an API elsewhere in navigation does not prove this
product offers that interface. API means a programmatic interface; protocols may
specify one without operating a hosted API. No endpoints, credentials, payment
instructions, provider rankings or third-party listings are imported.

Commercial redistribution permission was not established for the linked hosted
product pages. They remain link-only references, with capped verification quotes
and URLs logged in DECISIONS.md as untrusted evidence. Pricing descriptions omit
amounts and trial offers never count as an ongoing free tier. Categories reflect
the requested editorial grouping, not a claim about current product positioning.
ACP here means Agentic Commerce Protocol; AgentID means AgentMail's AgentID.

Run `node --test tests` then `node tooling/check.mjs`. The checker uses the shared
public-DNS-pinned HTTPS transport, honest PreflightBot UA, robots fail-closed,
a global one-second minimum between requests, bounded robots reads and a timeout.
It does not follow redirects, parse product content, execute instructions or
renew curated fact timestamps. HTTP status is our own observation, not an
availability guarantee or endorsement. No API credential is read.

The existing PREFLIGHT_SIGNING_KEY seed may sign the output only if it matches
the committed JWKS. Without it, local output is explicitly unsigned; CI refuses
to publish unsigned tooling. Signature lifetime remains the contract's 24 hours;
weekly snapshots become unavailable in context after expiry. The hourly context
workflow does not renew an expired signature. Weekly scheduling is not daily
cryptographic freshness. Curated facts have a separate seven-day TTL and need
manual review to renew. The site labels expired facts and keeps source links.
