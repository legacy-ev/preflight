# Verdict rules v0.1 (deterministic — no LLM decides a verdict)

Evaluate the rules top to bottom.
- **Any STOP rule fires → verdict = STOP.**
- Otherwise, **any CAUTION rule fires → CAUTION**.
- Otherwise **GO**.

Every fired rule becomes one item in `reasons[]`, with its evidence.

Version these rules (`ruleset_version`). Every change gets a dated entry in `DECISIONS.md` and the change feed.

## STOP (any intent)
| Code | Fires when |
|---|---|
| `SAFETY_PHISHING_LISTED` | Domain or exact URL is on a phishing/malware feed (URLhaus, PhishTank, OpenPhish, Safe Browsing/Web Risk) checked within its TTL |
| `SAFETY_LOOKALIKE_YOUNG` | Domain is a lookalike of a known brand (edit distance ≤2 or a homoglyph match against the seed list and Tranco top 10k) **and** is less than 90 days old (RDAP) |
| `SAFETY_INJECTION_HIGH` | The target page contains a high-severity injection pattern, e.g. instructions to the AI in hidden/off-screen text or JSON-LD, or payment/credential instructions in metadata |

## STOP (intent-specific)
| Code | Intents | Fires when |
|---|---|---|
| `TOS_BANS_AGENTS` | all except `read` and `search` | The ToS class is `bans_agents` with high confidence |
| `TOS_BANS_AUTOMATED_ACCOUNTS` | `account_create` | The ToS class includes `bans_automated_accounts` |
| `PAYEE_SANCTIONS_MATCH` | `purchase`, `book` (Phase 3) | The payee entity matches a sanctions list with high confidence |

## CAUTION
| Code | Fires when |
|---|---|
| `ACCESS_BLOCKED` | Our signed probe got 401/403/429 or a block page on the relevant page type. (Not STOP: the block may be specific to our scanner.) |
| `ACCESS_CHALLENGE_PAGE` | A challenge or interstitial was detected |
| `ROBOTS_DISALLOWS_USER_AGENTS` | robots.txt disallows the user-triggered AI agents for the relevant path |
| `TOS_REQUIRES_IDENTIFICATION` | The ToS requires agents to identify themselves. Also set `requirements.must_self_identify = true` |
| `TOS_AMBIGUOUS` | A ToS clause was found but classified with low confidence |
| `PAY_PER_CRAWL` | A 402 with a price was seen |
| `SAFETY_YOUNG_DOMAIN` | Domain is less than 90 days old (no lookalike) and the intent is `purchase`, `book`, `account_create` or `submit_form` |
| `SAFETY_INJECTION_MEDIUM` | A medium-severity injection pattern was found (e.g. invisible Unicode, suspicious meta instructions) |
| `OUTCOME_LOW_SUCCESS` | Success rate over 7 days is below 0.5 with n ≥ 5 for this domain+intent |
| `OUTCOME_RECENT_DROP` | Success rate over 24h is more than 30 points below the 30-day rate, with n ≥ 5 |
| `NO_RETURNS_POLICY` | Intent is `purchase` and no returns policy was found (Phase 3) |
| `DATA_STALE` | Any required component is older than 2× its TTL. Confidence = low |
| `NO_DATA` | Never scanned. Trigger an on-demand scan, return CAUTION with confidence = low, and set `links` so the caller can retry |

## Confidence
- **high:** all components are within TTL, outcome n ≥ 20, and no ambiguous ToS.
- **medium:** within TTL but outcome n < 20, or one component is older than its TTL but under 2× it.
- **low:** `DATA_STALE`, `NO_DATA` or `TOS_AMBIGUOUS` fired.

## Route ordering (`best_route`)
1. Sort by status: `observed_working` > `discovered` > `announced_only` > `unknown` > `broken`.
2. Within the same status, sort by type preference: `api`, `mcp`, `ucp`, `acp`, `pap`, `a2a`, `nlweb`, `webmcp`, `structured_feed`, `markdown`, `browser`.
3. Within the same type, sort by success_rate_7d descending (only when n ≥ 5).

## Injection pattern severity (starting heuristics — tune with fixtures)
- **High:**
  - imperative instructions addressed to an AI/assistant/agent inside elements hidden by CSS (display:none, off-screen positioning, zero font-size, or same colour as background)
  - the same in JSON-LD or meta tags
  - any wallet address, payment link or "send/pay/transfer" instruction inside JSON-LD/meta
  - "ignore previous/prior instructions"-style phrases
- **Medium:**
  - invisible or zero-width Unicode runs (more than ~10 characters)
  - instructions in HTML comments
  - unusually long alt or aria-label text containing imperatives
- Store the matched pattern code and a short span. The span is marked `untrusted_evidence: true` and is **never** passed to an LLM as instructions.

Maintain a fixture set (`/fixtures/injection/*.html`), with known-bad and known-good pages, and run it in CI.

## Static scanner ruleset 0.1.0-static.1 (2026-10-14)

The threat model's golden rules override the fallback GO rule when positive independent agreement is unavailable. The static scanner adds:

| Code | Severity | Fires when |
|---|---|---|
| `DATA_INCOMPLETE` | CAUTION, low confidence | Required safety/access/route scan coverage is missing, truncated or failed |
| `INDEPENDENT_SAFETY_UNVERIFIED` | CAUTION | No explicit independent safety agreement is available |
| `UNSIGNED_SCAN` | CAUTION | Requests could not be signed because no signing key was supplied |
| `SAFETY_REVIEW_REQUIRED` | CAUTION | A previous safety finding remains pending human review; its original reason/severity and evidence are retained |

Outcome rules are applied only when the threat-model diversity, quarantine, per-operator weight and confirming-probe bounds are met. Static scans have no outcomes. Phase 3 returns-policy rules require an actual commerce check, not missing Phase 3 data. ToS remains `unknown` with `not yet classified`. See D-004 through D-007 in DECISIONS.md for limitations and contract-envelope precedence.
