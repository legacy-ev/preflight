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
