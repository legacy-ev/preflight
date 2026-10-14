# MCP tools + REST endpoints

Build this as a remote MCP server (Streamable HTTP) on a Cloudflare Worker, with identical REST endpoints. Verify the current MCP spec revision at modelcontextprotocol.io and log it in `DECISIONS.md`.

**Design rules:**
- Tool descriptions must be short, factual and free of injection-style wording. We will be scanned by other people's poisoning scanners.
- Return structured JSON. Every response includes `ruleset_version`, `generated_at` and `signature`.
- Free tier: no key needed, rate-limited per IP. With an API key: higher limits. Outcome reporters get quota bonuses.

| MCP tool | REST | Phase | Input | Output |
|---|---|---|---|---|
| `preflight` | `GET /v1/preflight?domain=&intent=` | 1 | `domain` (string), `intent` (enum) | `PreflightResponse` (see schema) |
| `check_safety` | `GET /v1/safety?url=` | 1 | `url` or `domain` | the `safety` block + safety reasons only (fast path: cached feeds + RDAP) |
| `find_route` | `GET /v1/route?domain=&intent=` | 1 | `domain`, `intent` | `best_route[]` + `requirements` |
| `report_outcome` | `POST /v1/outcomes` | 1 | `OutcomeReport` (see schema) | `{accepted: bool, quota_bonus: int, id}` |
| `get_evidence` | `GET /v1/evidence/{id}` | 1 | `id` | stored evidence: headers, status, matched robots lines, ToS span (marked untrusted), timestamps |
| `recent_changes` | `GET /v1/changes?since=` | 1 | `since` (ISO date) | list of verdict/status changes |
| `find_sites` | `GET /v1/sites?category=&country=&verdict=&route=` | 2 | filters | list of domains with verdict summary |
| `get_recipe` | `GET /v1/recipes?domain=&intent=` | 2 | `domain`, `intent` | verified step list (built from repeated successful outcomes plus manual review), with success rate |
| `find_tools` | `GET /v1/tools?q=&type=mcp\|x402\|a2a` | 2 | query, type | directory entries + health (uptime, p50 latency) + security scan findings |
| `agent_facts` | `GET /v1/facts?topic=time\|holidays\|fx\|llm_status` | 3 | topic + params | sourced facts with source URL and checked_at |

**Discovery for Preflight itself (Phase 2):**
- `/.well-known/mcp/server.json`
- an entry in the official MCP Registry
- `/llms.txt`
- `/.well-known/agent-card.json`
- a `SKILL.md` that tells agents: "call `preflight` before acting on an unfamiliar site; call `report_outcome` after".
