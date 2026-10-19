-- Private portfolio inbox. No anonymous or application-user read access.
create schema if not exists portfolio;
revoke all on schema portfolio from public, anon, authenticated;
create table if not exists portfolio.inquiries (
 id uuid primary key,
 created_at timestamptz not null default now(),
 name text not null check (length(name) between 2 and 100),
 email text not null check (length(email) <= 254),
 project_type text not null check (length(project_type) <= 80),
 budget text not null default '' check (length(budget) <= 80),
 timeline text not null default '' check (length(timeline) <= 120),
 message text not null check (length(message) between 20 and 5000),
 rate_hash text not null,
 status text not null default 'new' check (status in ('new','read','replied','closed'))
);
alter table portfolio.inquiries enable row level security;
revoke all on portfolio.inquiries from public, anon, authenticated;
create index if not exists portfolio_inquiries_created on portfolio.inquiries(created_at desc);

create or replace function public.portfolio_submit_inquiry(
 p_id uuid,p_name text,p_email text,p_project_type text,p_budget text,p_timeline text,p_message text,p_rate_hash text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(lower(p_email),0));
 perform pg_advisory_xact_lock(hashtextextended(p_rate_hash,1));
 if exists(select 1 from portfolio.inquiries where id=p_id) then return p_id; end if;
 if (select count(*) from portfolio.inquiries where rate_hash=p_rate_hash and created_at>now()-interval '1 hour')>=6
 or (select count(*) from portfolio.inquiries where email=lower(p_email) and created_at>now()-interval '1 hour')>=3 then
  raise exception 'Please wait before sending another inquiry.' using errcode='P0001';
 end if;
 insert into portfolio.inquiries(id,name,email,project_type,budget,timeline,message,rate_hash)
 values(p_id,p_name,lower(p_email),p_project_type,p_budget,p_timeline,p_message,p_rate_hash);
 return p_id;
end;
$$;
revoke all on function public.portfolio_submit_inquiry(uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.portfolio_submit_inquiry(uuid,text,text,text,text,text,text,text) to service_role;
