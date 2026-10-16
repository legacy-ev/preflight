# Agent Homepage context

Node 20 ESM, zero dependencies. From the repo root:

    npm ci --ignore-scripts --prefix context
    npm test --prefix context
    node context/index.mjs --output /tmp/preflight-context

Omit --output to publish public-data/api/v1/context.json and context/<domain>.json.
Uses scanner/signing.mjs's existing PREFLIGHT_SIGNING_KEY seed only. Missing seed
produces signature:null; invalid seeds stop publication. No API credentials.
All sections are arrays of {value,source,checked_at,ttl_seconds,untrusted_evidence?}.
Check each TTL independently; original site timestamps survive aggregation.
Domain files embed the original preflight envelope, without renewing it.

Only fixed, reviewed sources are fetched. Reuses scanner public-DNS/pinned HTTPS
transport, honest optionally signed PreflightBot requests, robots-first checks,
per-host serialization/one-second spacing, timeout, byte caps, no redirects and
stop-on-error. Upstream errors become unavailable. Registry reports page size,
not an invented total when paginated; listings/endpoints are never returned.

Licence decisions are in DECISIONS.md. Nager.Date API commercial use requires
sponsorship despite its MIT code. Statuspage public endpoints have no verified
commercial redistribution grant; they and hyperscalers remain link-only. The
Statuspage parser is implemented/tested but disabled pending a reviewed licence
decision. No permission is assumed from anonymous availability. Fastly's example
endpoint could not be verified and is omitted.

Selected LiteLLM prices are USD per input/output token, not all billing options
or a claim about current popularity. Missing models are unavailable. UA tokens
are untrusted; protocols are static discovery paths, never action routes. Source
licence notices ship as /context-NOTICES.txt. ECB rates remain free, attributed,
unmodified numeric reference values (XML projected to JSON), not transaction rates.

Hourly Action runs at minute 23 and dispatches Pages after committing. Scan and
context share public-data-${github.ref} concurrency and rebase/retry publication.
Generated files are not checked in during development. Generate context before
the site build to preview data; without it the homepage explicitly says unavailable.
GitHub Pages project hosting serves /preflight/llms.txt and /preflight/SKILL.md;
an origin-root /llms.txt or /SKILL.md needs an origin-root deployment/custom domain.

UK bank holidays use GOV.UK's public JSON with OGL v3 attribution in the item.
Verdict/safety summaries preserve the oldest scan checked_at and expire after one
hour. Safety counts distinguish current/expired CERT Polska feed checks and
historically listed responses; absence is never a clean bill of health. The
scanner downloads the official active-only list once per run with a five-minute
TTL; context reuses published observations without another feed download.

Extended facts use separate modules. `api/v1/timezones.json` contains the full
scanner-envelope zone list; world carries its pointer, count and major zones.
Requires Linux system `/usr/share/zoneinfo` TZif and tzdata.zi files. Both system
and Node tzdb versions are reported; ICU does not calculate offsets or DST.
Transitions cover 400 days and use exact-second binary search. The DST flag is
from tzdb, including negative DST. Unsupported data is unavailable.

`software` contains endoflife.date API v1 product cycles/latest/EOL. World adds
30 Wikidata country entity projections (ISO codes, currency/capital QIDs, calling
codes). `vulnerabilities` contains requested package records from bounded OSV
recent-change sampling, never a vulnerability-free assertion. No HTTP POST is
used: full OSV package search requires a read-only POST and remains link-only
under the no-posting constraint. See D-016 for coverage/licences.

Remote projected facts, including unavailable results, persist for 24 hours in
`public-data/context-cache/`; hourly builds preserve original checked_at.
Do not delete that directory in scheduled builds. Individual upstream strings
are capped at 200 characters and items flagged untrusted_evidence. All source
requests use the existing bounded, robots-first, honest-UA transport.
Run added regressions from root with `node --test tests`.
