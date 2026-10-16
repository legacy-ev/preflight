# Feed review and synthetic outcomes plan

User-authorized implementation on feat/feeds-probe; no accounts, spend or API keys.

1. Record official feed licensing/auth findings in DECISIONS.md. Do not integrate an ambiguous source.
2. Test then implement read/search synthetic reports sharing the existing BoundedClient. Search means homepage and at most one same-origin OpenSearch descriptor, never invoking a search URL or form. Preserve robots, redirects, limits and SSRF protections.
3. Persist schema-conforming reports in daily outcome arrays; deduplicate domain×intent on daily reruns. Aggregate trusted local synthetic records by domain×intent over rolling 7/30 days; hide cells below five. One operator cannot change verdicts or supply independent safety agreement.
4. Wire into the daily scanner workflow, document static limitations, run node --test and three-domain diagnostic scan outside the checkout, review, append worklog, commit and push.

Review focus: denied robots, cross-origin descriptors/redirects, challenge/truncation, future/invalid/duplicate reports, sample thresholds and no GO promotion.
