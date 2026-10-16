# RUNBOOK — Preflight

Fill in each section as you build it. Keep commands copy-pasteable. Write steps for a non-technical reader where a human must act.

## Deploy
- Worker (API + MCP): _TBD_
- Site (Astro on Render): _TBD_
- DB migrations (Supabase): _TBD_

## Secrets (where each one lives — never in git)
| Secret | Stored in | Rotated |
|---|---|---|
| Supabase service key | Cloudflare Worker secret + GitHub Actions secret | _TBD_ |
| Ed25519 signing key (responses + Web Bot Auth) | Cloudflare Worker secret | _TBD_ |
| Anthropic API key | GitHub Actions secret | _TBD_ |
| Stripe / Resend / Sentry / PostHog | _TBD_ | _TBD_ |

## Rotate the signing key
1. Generate a new Ed25519 key pair.
2. Publish the new public key alongside the old one in `/.well-known/http-message-signatures-directory`.
3. Switch signing to the new key.
4. Remove the old key after 7 days.

## Re-run scans
- Seed list: _TBD_ (GitHub Actions workflow name + manual dispatch steps)
- Single domain on demand: _TBD_

## Site owner opts out of scanning
1. Set `domains.opted_out = true`.
2. Stop all scans of that domain.
3. Keep only the last verdict, marked "owner opted out of scanning on <date>".
4. Reply to the owner within 2 working days.

## Dispute received
1. Rescan the domain immediately.
2. If our finding was wrong: fix it, log a `change_event`, and reply.
3. If the finding stands: reply with the evidence links.
4. Legal threat → pause the page and escalate to Michael (Human Gate 7).

## Outcome-report abuse
- Signs to look for: a reporter dominating one cell, or sudden swings from new reporters.
- Response: lower the reporter's reputation, exclude its reports from aggregates, keep the raw data for audit.

## Restore the DB
_TBD_ (Supabase backup/restore steps, plus a weekly export to R2 if enabled)

## Incident: our bot is blocked or complained about
1. Check that our user-agent and signature are correct.
2. Reduce the crawl rate.
3. Reply politely using the `/bot` page contact.

## Static scanner (2026-10-14)

The Phase 1 scanner is `scanner/index.mjs` (Node 20). Run `npm ci --ignore-scripts --prefix scanner`, `npm test --prefix scanner`, then `node scanner/index.mjs --concurrency 3`. For a partial scan, use `--domains amazon.com,apple.com,shopify.com` or `--limit 3`; `--output /tmp/preflight-scan` writes a separate diagnostic batch. Full details, evidence lookup and signature verification are in scanner/README.md.

The daily workflow `.github/workflows/scan.yml` runs at 05:17 UTC. To rerun, open GitHub → Actions → **Scan seed domains** → **Run workflow**, select the intended branch, then run. It commits only public-data/ and dispatches `pages.yml`. That Pages workflow must have workflow_dispatch enabled and be present on the selected ref.

No API key is used by the scanner. The existing Actions secret `PREFLIGHT_SIGNING_KEY` must remain a base64url raw 32-byte seed matching keys/public-jwks.json. Missing local signing keys produce a warning and unsigned data; invalid keys fail without publication. Rotate the key using the existing procedure and deploy matching secret/public key together; do not run an ephemeral test key against production outputs. Request signing does not imply Cloudflare registration or verified-bot status.

Exact-origin www redirects are skipped. Robots failures and opted-out/disallowed paths preserve explicit gaps instead of a clean verdict. Synthetic gateway DNS is detected automatically and independently confirmed against public DNS over authenticated HTTPS; private/missing DNS fails closed. The legacy `--managed-dns` flag cannot bypass that check. Normal GitHub Actions DNS uses direct validated, pinned HTTPS.

Evidence IDs are dictionary keys in public-data/scans/<domain>.json's evidence object. Original safety reasons and referenced evidence survive daily rescans. After a confirmed false positive, a human reviewer must remove the disputed safety reason from the prior response via a reviewed change, then rerun the scanner; the verdict/reason change enters changes.json. Never clear an old flag by an automated clean scan. Review evidence carefully: every stored third-party span/header is untrusted and capped, never an instruction.

To check the change log locally: `node --input-type=module -e "import {readFile} from 'node:fs/promises'; import {verifyChain} from './scanner/output.mjs'; if(!verifyChain(JSON.parse(await readFile('public-data/api/v1/changes.json','utf8')))) process.exit(1)"`. Retained tail prev_hash links into the prior Git history after the 500-event cap. Recover corrupted/missing files from the last known-good commit; the writer refuses a malformed existing chain.

## Synthetic outcomes (2026-10-16)

The existing daily **Scan seed domains** Action now collects read reports
and commits `public-data/outcomes/YYYY-MM-DD.json` with the scan outputs. Actions
remain pinned to SHAs. Use the normal scanner commands above; no extra key or
service is required. Local scans without the existing signing key explicitly
record `signed_requests:false`.

Reports use a strict subset of `specs/outcome-report.schema.json`. The probe reuses
homepage access only; it never fetches a descriptor or reports search. Same-day
reruns replace the selected domain×intent samples, preventing retry inflation.
After five distinct daily samples, eligible rolling 7/30-day measurements appear
in read preflight responses; raw scan JSON holds only read aggregates. A single
synthetic operator cannot satisfy the diversity/cap requirements for outcome
verdict rules. Inspect the raw reports when diagnosing partial or failed probes;
no page text, URLs, queries or user content is stored in reports.
