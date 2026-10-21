-- Portal part 3: industry screens on real projects (estimate, docs, sign, proof, gallery, stages ...).
-- modules is the ordered list the portal renders (portal/modules.js); modules_rev guards the owner's
-- whole-list saves against a client action that landed in between. Files clients send for a doc request
-- go to the private portal-files bucket, reached only through signed URLs the edge function makes.
alter table portfolio.portal_projects add column if not exists modules jsonb;
alter table portfolio.portal_projects add column if not exists modules_rev int not null default 0;
alter table portfolio.portal_projects add column if not exists business_type text not null default '' check (length(business_type) <= 80);

insert into storage.buckets (id, name, public, file_size_limit)
values ('portal-files', 'portal-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
