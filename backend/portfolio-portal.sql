-- Client portal and owner studio. Private schema: no anonymous or app-user access.
-- Only the portfolio-portal edge function reads and writes, over the direct database connection.
create schema if not exists portfolio;
revoke all on schema portfolio from public, anon, authenticated;

create table if not exists portfolio.portal_projects (
 id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
 title text not null check (length(title) between 1 and 120),
 kind text not null default 'own' check (kind in ('own','client')),
 client_name text not null default '' check (length(client_name) <= 120),
 summary text not null default '' check (length(summary) <= 2000),
 site_url text not null default '' check (length(site_url) <= 500),
 preview_url text not null default '' check (length(preview_url) <= 500),
 status text not null default 'active' check (status in ('active','paused','done','archived')),
 check_in_day text not null default '' check (length(check_in_day) <= 20),
 sources jsonb not null default '{}'::jsonb,
 signals jsonb not null default '{}'::jsonb,
 owner_notes text not null default '' check (length(owner_notes) <= 5000),
 sort int not null default 100,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists portfolio.portal_milestones (
 id uuid primary key default gen_random_uuid(),
 project_id text not null references portfolio.portal_projects(id) on delete cascade,
 seq int not null default 1,
 kind text not null default 'milestone' check (kind in ('milestone','change')),
 title text not null check (length(title) between 1 and 160),
 outcome text not null default '' check (length(outcome) <= 3000),
 due_on date,
 amount_cents bigint check (amount_cents is null or amount_cents >= 0),
 currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
 state text not null default 'planned' check (state in ('planned','active','in_review','changes_requested','accepted')),
 review_opened_at timestamptz,
 review_due_at timestamptz,
 accepted_at timestamptz,
 accepted_by text check (accepted_by in ('client','auto','owner')),
 pay_state text not null default 'none' check (pay_state in ('none','due','paid')),
 invoice_url text not null default '' check (length(invoice_url) <= 500),
 paid_at timestamptz,
 client_visible boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists portal_milestones_project on portfolio.portal_milestones(project_id, seq);

create table if not exists portfolio.portal_items (
 id uuid primary key default gen_random_uuid(),
 milestone_id uuid not null references portfolio.portal_milestones(id) on delete cascade,
 title text not null check (length(title) between 1 and 300),
 done boolean not null default false,
 done_at timestamptz,
 waiting_on text not null default 'none' check (waiting_on in ('none','client','vyas')),
 waiting_since date,
 client_visible boolean not null default true,
 source text not null default 'manual' check (source in ('manual','hub','github','brain')),
 source_ref text,
 sort int not null default 100,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (source, source_ref)
);
create index if not exists portal_items_milestone on portfolio.portal_items(milestone_id, sort);

create table if not exists portfolio.portal_updates (
 id uuid primary key default gen_random_uuid(),
 project_id text not null references portfolio.portal_projects(id) on delete cascade,
 created_at timestamptz not null default now(),
 done text not null default '' check (length(done) <= 4000),
 next text not null default '' check (length(next) <= 4000),
 needs text not null default '' check (length(needs) <= 4000),
 decisions text not null default '' check (length(decisions) <= 4000),
 preview_url text not null default '' check (length(preview_url) <= 500),
 video_url text not null default '' check (length(video_url) <= 500),
 client_visible boolean not null default true
);
create index if not exists portal_updates_project on portfolio.portal_updates(project_id, created_at desc);

create table if not exists portfolio.portal_access (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 role text not null check (role in ('owner','client','sync')),
 label text not null default '' check (length(label) <= 120),
 project_ids text[] not null default '{}',
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 revoked_at timestamptz,
 last_used_at timestamptz,
 use_count bigint not null default 0
);

create table if not exists portfolio.portal_messages (
 id uuid primary key default gen_random_uuid(),
 project_id text not null references portfolio.portal_projects(id) on delete cascade,
 milestone_id uuid references portfolio.portal_milestones(id) on delete set null,
 kind text not null default 'comment' check (kind in ('approve','changes','comment')),
 author text not null check (author in ('client','vyas')),
 access_id uuid references portfolio.portal_access(id) on delete set null,
 body text not null default '' check (length(body) <= 4000),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists portal_messages_project on portfolio.portal_messages(project_id, created_at desc);

create table if not exists portfolio.portal_sync_runs (
 id bigserial primary key,
 ran_at timestamptz not null default now(),
 source text not null check (length(source) <= 40),
 ok boolean not null,
 detail jsonb not null default '{}'::jsonb
);

create table if not exists portfolio.portal_events (
 id bigserial primary key,
 at timestamptz not null default now(),
 access_id uuid,
 role text,
 op text not null,
 target text,
 detail jsonb not null default '{}'::jsonb
);

do $$
declare t text;
begin
 foreach t in array array['portal_projects','portal_milestones','portal_items','portal_updates','portal_access','portal_messages','portal_sync_runs','portal_events'] loop
  execute format('alter table portfolio.%I enable row level security', t);
  execute format('revoke all on portfolio.%I from public, anon, authenticated', t);
 end loop;
end $$;
revoke all on all sequences in schema portfolio from public, anon, authenticated;
