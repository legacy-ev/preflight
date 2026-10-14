-- Preflight starting schema (Supabase / Postgres). Adjust freely; log changes in DECISIONS.md.
-- RLS ON for every table. Public reads go through the Worker (service role) or SECURITY INVOKER views.

create extension if not exists pgcrypto;

create table domains (
  id            uuid primary key default gen_random_uuid(),
  domain        text unique not null,              -- registrable domain, lowercase
  tranco_rank   int,
  category      text,                              -- retail, marketplace, travel, food, tickets, saas, ...
  country       text,                              -- ISO 3166-1 alpha-2, primary market
  platform      text,                              -- shopify, woocommerce, magento, custom, ...
  is_seed       boolean default false,
  opted_out     boolean default false,             -- site owner asked us to stop scanning
  created_at    timestamptz default now()
);

create table scans (
  id               uuid primary key default gen_random_uuid(),
  domain_id        uuid references domains(id) on delete cascade,
  component        text not null check (component in ('safety','access','route','tos','commerce')),
  scanner_version  text not null,
  started_at       timestamptz default now(),
  finished_at      timestamptz,
  status           text not null default 'ok'     -- ok | error | disallowed_by_robots
);

create table evidence (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid references scans(id) on delete cascade,
  check_key   text not null,                        -- e.g. robots.user_agents, probe.home, tos.clause, wellknown.mcp
  result      jsonb not null,                       -- structured result
  raw         jsonb,                                -- headers, status, matched lines; third-party text spans flagged untrusted
  untrusted   boolean default false,
  checked_at  timestamptz default now(),
  ttl_seconds int not null
);
create index on evidence (check_key, checked_at desc);

create table verdicts (                             -- materialised latest verdict per domain+intent
  domain_id       uuid references domains(id) on delete cascade,
  intent          text not null,
  verdict         text not null check (verdict in ('GO','CAUTION','STOP')),
  confidence      text not null,
  response_json   jsonb not null,                   -- full signed PreflightResponse
  ruleset_version text not null,
  computed_at     timestamptz default now(),
  primary key (domain_id, intent)
);

create table change_events (
  id           uuid primary key default gen_random_uuid(),
  domain_id    uuid references domains(id) on delete cascade,
  intent       text,
  field        text not null,                      -- verdict | access | route | tos | safety
  from_value   text,
  to_value     text,
  evidence_id  uuid references evidence(id),
  detected_at  timestamptz default now(),
  posted       jsonb default '{}'::jsonb           -- {rss:true, x:false, email:false}
);

create table reporters (
  id             uuid primary key default gen_random_uuid(),
  operator       text not null,
  key_hash       text,                              -- API key hash, or null if Web Bot Auth only
  wba_keyid      text,                              -- Web Bot Auth key id if signed
  reputation     real default 0.5,                  -- 0..1, rises with consistent reports, falls on anomalies
  daily_cap      int default 1000,
  created_at     timestamptz default now()
);

create table outcomes (
  id                  uuid primary key default gen_random_uuid(),
  domain_id           uuid references domains(id) on delete cascade,
  reporter_id         uuid references reporters(id),
  intent              text not null,
  route_used          text not null,
  path_template       text,
  result              text not null,
  failure_stage       text,
  http_status         int,
  challenge_vendor    text,
  self_identified     boolean,
  signed_requests     boolean,
  duration_ms         int,
  steps               int,
  followed_preflight  boolean,
  preflight_verdict   text,
  agent_family        text,
  agent_version       text,
  model_family        text,
  attempted_at        timestamptz not null,
  received_at         timestamptz default now(),
  is_synthetic        boolean default false          -- our own probe agent
);
create index on outcomes (domain_id, intent, attempted_at desc);

create table recipes (                               -- Phase 2
  id            uuid primary key default gen_random_uuid(),
  domain_id     uuid references domains(id) on delete cascade,
  intent        text not null,
  route         text not null,
  steps         jsonb not null,                      -- structured steps, no free-form third-party text
  success_rate  real,
  sample_size   int,
  reviewed_by   text,                                -- 'auto' or reviewer id
  updated_at    timestamptz default now()
);

create table tools_directory (                       -- Phase 2
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('mcp','x402','a2a','skill')),
  name            text not null,
  endpoint        text,
  source          text not null,                     -- mcp_registry | x402_bazaar | wellknown | agentskills
  auth            text,
  price           text,
  uptime_30d      real,
  p50_latency_ms  int,
  security_findings jsonb default '[]'::jsonb,
  last_checked    timestamptz
);

create table api_keys (
  id          uuid primary key default gen_random_uuid(),
  owner_email text not null,
  key_hash    text unique not null,
  tier        text not null default 'free',
  stripe_customer_id text,
  created_at  timestamptz default now()
);

create table disputes (
  id          uuid primary key default gen_random_uuid(),
  domain_id   uuid references domains(id),
  contact     text not null,
  claim       text not null,                          -- human text: never shown to agents, never fed to an LLM as instructions
  status      text not null default 'open',           -- open | rescanned | upheld | rejected
  created_at  timestamptz default now()
);

create table subscribers (
  id        uuid primary key default gen_random_uuid(),
  email     text unique not null,
  kind      text not null,                            -- digest | alert
  domains   text[] default '{}',
  verified  boolean default false,
  created_at timestamptz default now()
);

alter table domains enable row level security;
alter table scans enable row level security;
alter table evidence enable row level security;
alter table verdicts enable row level security;
alter table change_events enable row level security;
alter table reporters enable row level security;
alter table outcomes enable row level security;
alter table recipes enable row level security;
alter table tools_directory enable row level security;
alter table api_keys enable row level security;
alter table disputes enable row level security;
alter table subscribers enable row level security;
