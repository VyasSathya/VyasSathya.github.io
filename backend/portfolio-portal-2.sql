-- Portal part 2: phone notifications, the notice feed, decisions, reminders. Same private schema rules.
alter table portfolio.portal_access drop constraint if exists portal_access_role_check;
alter table portfolio.portal_access add constraint portal_access_role_check check (role in ('owner','client','sync','cron'));
alter table portfolio.portal_access add column if not exists seen_at timestamptz;
alter table portfolio.portal_access add column if not exists prev_seen_at timestamptz;
alter table portfolio.portal_access add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table portfolio.portal_milestones add column if not exists reminded_at timestamptz;
alter table portfolio.portal_items add column if not exists nudged_at timestamptz;

create table if not exists portfolio.portal_push_subs (
 id uuid primary key default gen_random_uuid(),
 access_id uuid not null references portfolio.portal_access(id) on delete cascade,
 endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
 p256dh text not null check (length(p256dh) <= 200),
 auth text not null check (length(auth) <= 100),
 device text not null default '' check (length(device) <= 200),
 created_at timestamptz not null default now(),
 last_ok_at timestamptz,
 failures int not null default 0
);
create index if not exists portal_push_subs_access on portfolio.portal_push_subs(access_id);

create table if not exists portfolio.portal_notices (
 id bigserial primary key,
 project_id text references portfolio.portal_projects(id) on delete cascade,
 audience text not null check (audience in ('client','owner')),
 kind text not null check (length(kind) <= 40),
 title text not null check (length(title) <= 200),
 body text not null default '' check (length(body) <= 600),
 url text not null default '' check (length(url) <= 300),
 created_at timestamptz not null default now(),
 pushed int not null default 0
);
create index if not exists portal_notices_project on portfolio.portal_notices(project_id, created_at desc);

create table if not exists portfolio.portal_asks (
 id uuid primary key default gen_random_uuid(),
 project_id text not null references portfolio.portal_projects(id) on delete cascade,
 question text not null check (length(question) between 1 and 500),
 detail text not null default '' check (length(detail) <= 3000),
 choices text[] not null default '{}',
 due_on date,
 answer text check (length(answer) <= 500),
 answer_note text not null default '' check (length(answer_note) <= 3000),
 answered_at timestamptz,
 created_at timestamptz not null default now(),
 closed boolean not null default false
);
create index if not exists portal_asks_project on portfolio.portal_asks(project_id, created_at desc);

do $$
declare t text;
begin
 foreach t in array array['portal_push_subs','portal_notices','portal_asks'] loop
  execute format('alter table portfolio.%I enable row level security', t);
  execute format('revoke all on portfolio.%I from public, anon, authenticated', t);
 end loop;
end $$;
revoke all on all sequences in schema portfolio from public, anon, authenticated;
alter table portfolio.portal_asks add column if not exists reminded_at timestamptz;
