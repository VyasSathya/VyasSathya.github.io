// Client portal + owner studio API. Every caller presents a private key link (x-portal-key);
// only its SHA-256 is stored. Roles: owner (everything), client (own projects, client-visible
// fields only), sync (push feeds from the owner's machine). No Supabase Auth users are created.
import postgres from 'npm:postgres@3.4.5';

const allowed = new Set(['https://vyasapps.dev','https://www.vyasapps.dev','https://vyassathya.github.io']);
const localDev = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3, idle_timeout: 20 });
const REVIEW_BUSINESS_DAYS = 5;

type Access = { id: string; role: 'owner' | 'client' | 'sync'; project_ids: string[]; label: string };
class Fail extends Error { constructor(public status: number, msg: string) { super(msg); } }

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const newToken = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const url = (v: unknown) => { const s = str(v, 500); if (!s) return ''; if (!/^https:\/\/[^\s]+$/i.test(s)) throw new Fail(400, 'Links must start with https://'); return s; };
const uuid = (v: unknown) => { if (typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v)) throw new Fail(400, 'Bad id'); return v; };
const slug = (v: unknown) => { if (typeof v !== 'string' || !/^[a-z0-9][a-z0-9-]{1,60}$/.test(v)) throw new Fail(400, 'Bad project id'); return v; };
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const cents = (v: unknown) => (v === null || v === '' || v === undefined ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : (() => { throw new Fail(400, 'Bad amount'); })());

function addBusinessDays(from: Date, n: number) {
 const d = new Date(from);
 while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n--; }
 return d;
}

async function authorize(req: Request): Promise<Access> {
 const key = req.headers.get('x-portal-key') || '';
 if (!/^[A-Za-z0-9_-]{40,60}$/.test(key)) throw new Fail(401, 'This link is not valid.');
 const rows = await sql`update portfolio.portal_access set last_used_at = now(), use_count = use_count + 1
  where token_hash = ${await sha(key)} and revoked_at is null and (expires_at is null or expires_at > now())
  returning id, role, project_ids, label`;
 if (!rows.length) throw new Fail(401, 'This link is not valid or has been turned off.');
 return rows[0] as unknown as Access;
}

const log = (a: Access, op: string, target = '', detail: unknown = {}) =>
 sql`insert into portfolio.portal_events(access_id, role, op, target, detail) values (${a.id}, ${a.role}, ${op}, ${target}, ${sql.json(detail as never)})`;

// Review windows that ran out with no change request count as accepted.
const settleReviews = () => sql`update portfolio.portal_milestones set state = 'accepted', accepted_by = 'auto', accepted_at = review_due_at, updated_at = now()
 where state = 'in_review' and review_due_at < now()`;

function need(a: Access, ...roles: Access['role'][]) { if (!roles.includes(a.role)) throw new Fail(403, 'Not allowed.'); }
function canSee(a: Access, projectId: string) { if (a.role === 'owner') return; if (a.role === 'client' && a.project_ids.includes(projectId)) return; throw new Fail(403, 'Not allowed.'); }

async function clientView(a: Access) {
 await settleReviews();
 const ids = a.project_ids;
 const projects = await sql`select id, title, client_name, summary, site_url, preview_url, status, check_in_day, updated_at
  from portfolio.portal_projects where id = any(${ids}) and status <> 'archived' order by sort, title`;
 const milestones = await sql`select id, project_id, seq, kind, title, outcome, due_on, amount_cents, currency, state, review_opened_at, review_due_at,
  accepted_at, accepted_by, pay_state, invoice_url, paid_at from portfolio.portal_milestones
  where project_id = any(${ids}) and client_visible order by project_id, seq`;
 const mids = milestones.map(m => m.id);
 const items = mids.length ? await sql`select id, milestone_id, title, done, done_at, waiting_on, waiting_since, sort from portfolio.portal_items
  where milestone_id = any(${mids}) and client_visible order by sort, created_at` : [];
 const updates = await sql`select id, project_id, created_at, done, next, needs, decisions, preview_url, video_url from portfolio.portal_updates
  where project_id = any(${ids}) and client_visible order by created_at desc limit 60`;
 const messages = await sql`select id, project_id, milestone_id, kind, author, body, created_at from portfolio.portal_messages
  where project_id = any(${ids}) order by created_at desc limit 100`;
 return { role: 'client', label: a.label, projects, milestones, items, updates, messages };
}

async function ownerView() {
 await settleReviews();
 const projects = await sql`select * from portfolio.portal_projects order by sort, title`;
 const milestones = await sql`select * from portfolio.portal_milestones order by project_id, seq`;
 const items = await sql`select * from portfolio.portal_items order by sort, created_at`;
 const updates = await sql`select * from portfolio.portal_updates order by created_at desc limit 300`;
 const messages = await sql`select * from portfolio.portal_messages order by created_at desc limit 300`;
 const links = await sql`select id, role, label, project_ids, created_at, expires_at, revoked_at, last_used_at, use_count from portfolio.portal_access order by created_at desc`;
 const syncs = await sql`select distinct on (source) source, ran_at, ok, detail from portfolio.portal_sync_runs order by source, ran_at desc`;
 return { role: 'owner', projects, milestones, items, updates, messages, links, syncs };
}

async function milestoneProject(id: string) {
 const r = await sql`select project_id, state, client_visible from portfolio.portal_milestones where id = ${id}`;
 if (!r.length) throw new Fail(404, 'Milestone not found.');
 return r[0];
}

async function handle(a: Access, b: Record<string, unknown>) {
 const op = str(b.op, 40);
 switch (op) {
  case 'view':
   if (a.role === 'owner') return ownerView();
   if (a.role === 'client') return clientView(a);
   return { role: 'sync', projects: await sql`select id, status, sources from portfolio.portal_projects where status <> 'archived'` };

  // ---- client actions ----
  case 'approve': {
   need(a, 'client', 'owner');
   const id = uuid(b.milestone_id); const m = await milestoneProject(id); canSee(a, m.project_id);
   if (m.state !== 'in_review' && m.state !== 'changes_requested') throw new Fail(409, 'This milestone is not waiting for approval.');
   const by = a.role === 'client' ? 'client' : 'owner';
   await sql`update portfolio.portal_milestones set state = 'accepted', accepted_by = ${by}, accepted_at = now(), updated_at = now() where id = ${id}`;
   await sql`insert into portfolio.portal_messages(project_id, milestone_id, kind, author, access_id, body) values (${m.project_id}, ${id}, 'approve', ${a.role === 'client' ? 'client' : 'vyas'}, ${a.id}, ${str(b.body, 4000)})`;
   await log(a, op, id); return { ok: true };
  }
  case 'request_changes': {
   need(a, 'client');
   const id = uuid(b.milestone_id); const m = await milestoneProject(id); canSee(a, m.project_id);
   const body = str(b.body, 4000); if (body.length < 3) throw new Fail(400, 'Say what needs to change.');
   if (m.state !== 'in_review') throw new Fail(409, 'This milestone is not in review.');
   await sql`update portfolio.portal_milestones set state = 'changes_requested', updated_at = now() where id = ${id}`;
   await sql`insert into portfolio.portal_messages(project_id, milestone_id, kind, author, access_id, body) values (${m.project_id}, ${id}, 'changes', 'client', ${a.id}, ${body})`;
   await log(a, op, id); return { ok: true };
  }
  case 'message': {
   need(a, 'client', 'owner');
   const pid = slug(b.project_id); canSee(a, pid);
   const body = str(b.body, 4000); if (!body) throw new Fail(400, 'Write a message first.');
   await sql`insert into portfolio.portal_messages(project_id, kind, author, access_id, body, read_at)
    values (${pid}, 'comment', ${a.role === 'client' ? 'client' : 'vyas'}, ${a.id}, ${body}, ${a.role === 'owner' ? new Date() : null})`;
   await log(a, op, pid); return { ok: true };
  }

  // ---- owner actions ----
  case 'save_project': {
   need(a, 'owner'); const p = (b.project || {}) as Record<string, unknown>;
   const id = slug(p.id);
   const kind = p.kind === 'client' ? 'client' : 'own';
   const status = ['active', 'paused', 'done', 'archived'].includes(p.status as string) ? p.status as string : 'active';
   const sources = p.sources && typeof p.sources === 'object' ? p.sources : {};
   await sql`insert into portfolio.portal_projects(id, title, kind, client_name, summary, site_url, preview_url, status, check_in_day, sources, owner_notes, sort)
    values (${id}, ${str(p.title, 120) || id}, ${kind}, ${str(p.client_name, 120)}, ${str(p.summary, 2000)}, ${url(p.site_url)}, ${url(p.preview_url)}, ${status},
     ${str(p.check_in_day, 20)}, ${sql.json(sources as never)}, ${str(p.owner_notes, 5000)}, ${Number(p.sort) || 100})
    on conflict (id) do update set title = excluded.title, kind = excluded.kind, client_name = excluded.client_name, summary = excluded.summary,
     site_url = excluded.site_url, preview_url = excluded.preview_url, status = excluded.status, check_in_day = excluded.check_in_day,
     sources = excluded.sources, owner_notes = excluded.owner_notes, sort = excluded.sort, updated_at = now()`;
   await log(a, op, id); return { ok: true, id };
  }
  case 'save_milestone': {
   need(a, 'owner'); const m = (b.milestone || {}) as Record<string, unknown>;
   const pid = slug(m.project_id);
   const vals = { title: str(m.title, 160), outcome: str(m.outcome, 3000), due: date(m.due_on), amount: cents(m.amount_cents), invoice: url(m.invoice_url),
    kind: m.kind === 'change' ? 'change' : 'milestone', visible: m.client_visible !== false, seq: Number(m.seq) || null };
   if (!vals.title) throw new Fail(400, 'Give the milestone a title.');
   if (m.id) {
    const id = uuid(m.id);
    await sql`update portfolio.portal_milestones set title = ${vals.title}, outcome = ${vals.outcome}, due_on = ${vals.due}, amount_cents = ${vals.amount},
     invoice_url = ${vals.invoice}, kind = ${vals.kind}, client_visible = ${vals.visible}, seq = coalesce(${vals.seq}, seq),
     pay_state = case when ${vals.invoice} <> '' and pay_state = 'none' then 'due' else pay_state end, updated_at = now() where id = ${id}`;
    await log(a, op, id); return { ok: true, id };
   }
   const r = await sql`insert into portfolio.portal_milestones(project_id, seq, kind, title, outcome, due_on, amount_cents, invoice_url, pay_state, client_visible)
    values (${pid}, coalesce(${vals.seq}, (select coalesce(max(seq), 0) + 1 from portfolio.portal_milestones where project_id = ${pid})), ${vals.kind}, ${vals.title},
     ${vals.outcome}, ${vals.due}, ${vals.amount}, ${vals.invoice}, ${vals.invoice ? 'due' : 'none'}, ${vals.visible}) returning id`;
   await log(a, op, r[0].id); return { ok: true, id: r[0].id };
  }
  case 'milestone_state': {
   need(a, 'owner'); const id = uuid(b.id); const to = str(b.to, 20); await milestoneProject(id);
   if (to === 'active') await sql`update portfolio.portal_milestones set state = 'active', review_opened_at = null, review_due_at = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
   else if (to === 'planned') await sql`update portfolio.portal_milestones set state = 'planned', review_opened_at = null, review_due_at = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
   else if (to === 'in_review') { const now = new Date(); await sql`update portfolio.portal_milestones set state = 'in_review', review_opened_at = ${now}, review_due_at = ${addBusinessDays(now, REVIEW_BUSINESS_DAYS)}, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`; }
   else if (to === 'accepted') await sql`update portfolio.portal_milestones set state = 'accepted', accepted_by = 'owner', accepted_at = now(), updated_at = now() where id = ${id}`;
   else if (to === 'paid') await sql`update portfolio.portal_milestones set pay_state = 'paid', paid_at = now(), updated_at = now() where id = ${id}`;
   else if (to === 'due') await sql`update portfolio.portal_milestones set pay_state = 'due', paid_at = null, updated_at = now() where id = ${id}`;
   else if (to === 'unbilled') await sql`update portfolio.portal_milestones set pay_state = 'none', paid_at = null, updated_at = now() where id = ${id}`;
   else throw new Fail(400, 'Unknown state.');
   await log(a, op, id, { to }); return { ok: true };
  }
  case 'delete_milestone': {
   need(a, 'owner'); const id = uuid(b.id);
   const r = await sql`select count(*)::int n from portfolio.portal_items where milestone_id = ${id}`;
   if (r[0].n > 0) throw new Fail(409, 'Move or delete its items first.');
   await sql`delete from portfolio.portal_milestones where id = ${id} and state in ('planned','active')`;
   await log(a, op, id); return { ok: true };
  }
  case 'save_item': {
   need(a, 'owner'); const it = (b.item || {}) as Record<string, unknown>;
   const waiting = ['none', 'client', 'vyas'].includes(it.waiting_on as string) ? it.waiting_on as string : 'none';
   const done = it.done === true;
   if (it.id) {
    const id = uuid(it.id);
    await sql`update portfolio.portal_items set
     title = coalesce(nullif(${str(it.title, 300)}, ''), title),
     done = ${done}, done_at = case when ${done} and not done then now() when not ${done} then null else done_at end,
     waiting_on = ${done ? 'none' : waiting}, waiting_since = case when ${done ? 'none' : waiting} = 'none' then null when waiting_on = ${waiting} then waiting_since else current_date end,
     client_visible = ${it.client_visible !== false}, sort = coalesce(${Number(it.sort) || null}, sort),
     milestone_id = coalesce(${it.milestone_id ? uuid(it.milestone_id) : null}::uuid, milestone_id), updated_at = now()
     where id = ${id}`;
    await log(a, op, id); return { ok: true, id };
   }
   const mid = uuid(it.milestone_id); const title = str(it.title, 300); if (!title) throw new Fail(400, 'Write the item first.');
   const r = await sql`insert into portfolio.portal_items(milestone_id, title, done, done_at, waiting_on, waiting_since, client_visible, sort)
    values (${mid}, ${title}, ${done}, ${done ? new Date() : null}, ${waiting}, ${waiting === 'none' ? null : new Date()}, ${it.client_visible !== false},
     (select coalesce(max(sort), 0) + 10 from portfolio.portal_items where milestone_id = ${mid})) returning id`;
   await log(a, op, r[0].id); return { ok: true, id: r[0].id };
  }
  case 'delete_item': { need(a, 'owner'); const id = uuid(b.id); await sql`delete from portfolio.portal_items where id = ${id}`; await log(a, op, id); return { ok: true }; }
  case 'save_update': {
   need(a, 'owner'); const u = (b.update || {}) as Record<string, unknown>; const pid = slug(u.project_id);
   const v = { done: str(u.done, 4000), next: str(u.next, 4000), needs: str(u.needs, 4000), decisions: str(u.decisions, 4000), preview: url(u.preview_url), video: url(u.video_url), visible: u.client_visible !== false };
   if (!v.done && !v.next && !v.needs && !v.decisions) throw new Fail(400, 'The check-in is empty.');
   if (u.id) {
    const id = uuid(u.id);
    await sql`update portfolio.portal_updates set done = ${v.done}, next = ${v.next}, needs = ${v.needs}, decisions = ${v.decisions}, preview_url = ${v.preview}, video_url = ${v.video}, client_visible = ${v.visible} where id = ${id}`;
    await log(a, op, id); return { ok: true, id };
   }
   const r = await sql`insert into portfolio.portal_updates(project_id, done, next, needs, decisions, preview_url, video_url, client_visible)
    values (${pid}, ${v.done}, ${v.next}, ${v.needs}, ${v.decisions}, ${v.preview}, ${v.video}, ${v.visible}) returning id`;
   await log(a, op, r[0].id); return { ok: true, id: r[0].id };
  }
  case 'mark_read': { need(a, 'owner'); const pid = slug(b.project_id); await sql`update portfolio.portal_messages set read_at = now() where project_id = ${pid} and read_at is null`; return { ok: true }; }
  case 'create_link': {
   need(a, 'owner');
   const role = b.role === 'owner' ? 'owner' : b.role === 'sync' ? 'sync' : 'client';
   const ids = role === 'client' ? (Array.isArray(b.project_ids) ? b.project_ids.map(slug) : []) : [];
   if (role === 'client' && !ids.length) throw new Fail(400, 'Pick the project this link opens.');
   const days = Number(b.days) > 0 ? Math.min(Number(b.days), 3650) : null;
   const token = newToken();
   const r = await sql`insert into portfolio.portal_access(token_hash, role, label, project_ids, expires_at)
    values (${await sha(token)}, ${role}, ${str(b.label, 120)}, ${ids}, ${days ? new Date(Date.now() + days * 864e5) : null}) returning id`;
   await log(a, op, r[0].id, { role, ids });
   return { ok: true, id: r[0].id, token, role };
  }
  case 'revoke_link': {
   need(a, 'owner'); const id = uuid(b.id);
   if (id === a.id) throw new Fail(409, 'This is the key you are using. Revoke it from another device.');
   await sql`update portfolio.portal_access set revoked_at = now() where id = ${id} and revoked_at is null`;
   await log(a, op, id); return { ok: true };
  }

  // ---- sync feed ----
  case 'sync': {
   need(a, 'sync', 'owner');
   const source = str(b.source, 40) || 'local';
   const items = Array.isArray(b.items) ? b.items.slice(0, 5000) as Record<string, unknown>[] : [];
   const signals = (b.signals && typeof b.signals === 'object' ? b.signals : {}) as Record<string, unknown>;
   const rows = items.map(it => ({ ref: str(it.ref, 300), title: str(it.title, 300), done: it.done === true,
    project_id: typeof it.project_id === 'string' ? it.project_id : '', source: ['hub', 'github', 'brain'].includes(it.source as string) ? it.source as string : 'hub' }))
    .filter(r => r.ref && r.title && r.project_id);
   const skipped = items.length - rows.length;
   // One statement: changed feed items update in place; new ones land in the project's current milestone,
   // hidden from the client until Vyas shows them. Items whose project has no open milestone wait for one.
   const [res] = await sql`with incoming as (
     select * from jsonb_to_recordset(${sql.json(rows as never)}::jsonb) as x(ref text, title text, done boolean, project_id text, source text)),
    upd as (update portfolio.portal_items i set title = x.title, done = x.done,
      done_at = case when x.done and not i.done then now() when not x.done then null else i.done_at end, updated_at = now()
     from incoming x where i.source = x.source and i.source_ref = x.ref and (i.title <> x.title or i.done <> x.done) returning 1),
    cur as (select distinct on (project_id) project_id, id from portfolio.portal_milestones where state <> 'accepted' order by project_id, seq),
    ins as (insert into portfolio.portal_items(milestone_id, title, done, done_at, client_visible, source, source_ref, sort)
     select c.id, x.title, x.done, case when x.done then now() end, false, x.source, x.ref, 1000 + row_number() over ()
     from incoming x join cur c on c.project_id = x.project_id
     where not exists (select 1 from portfolio.portal_items i where i.source = x.source and i.source_ref = x.ref)
     on conflict (source, source_ref) do nothing returning 1)
    select (select count(*) from upd)::int as changed, (select count(*) from ins)::int as added`;
   const added = res.added, changed = res.changed;
   for (const [pid, sig] of Object.entries(signals)) {
    if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(pid) || !sig || typeof sig !== 'object') continue;
    await sql`update portfolio.portal_projects set signals = ${sql.json(sig as never)} where id = ${pid}`;
   }
   const detail = { added, changed, skipped, items: items.length, projects: Object.keys(signals).length, note: str(b.note, 300) };
   await sql`insert into portfolio.portal_sync_runs(source, ok, detail) values (${source}, true, ${sql.json(detail)})`;
   await sql`delete from portfolio.portal_sync_runs where ran_at < now() - interval '30 days'`;
   return { ok: true, ...detail };
  }
 }
 throw new Fail(400, 'Unknown request.');
}

Deno.serve(async (req: Request) => {
 const origin = req.headers.get('origin') || '';
 const fromSite = allowed.has(origin) || localDev.test(origin);
 const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
 if (fromSite) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-portal-key', 'Access-Control-Allow-Methods': 'POST,OPTIONS' });
 const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
 if (req.method === 'OPTIONS') return new Response(null, { status: fromSite ? 204 : 403, headers });
 // Browsers must come from the site; the sync script has no Origin and authenticates with its own key.
 if (origin && !fromSite) return reply(403, { error: 'Open the portal from vyasapps.dev.' });
 if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
 try {
  const raw = await req.text();
  if (raw.length > 2_000_000) return reply(413, { error: 'Too large.' });
  const body = raw ? JSON.parse(raw) : {};
  const access = await authorize(req);
  if (access.role === 'sync' && body.op !== 'sync' && body.op !== 'view') return reply(403, { error: 'Not allowed.' });
  return reply(200, await handle(access, body));
 } catch (e) {
  if (e instanceof Fail) return reply(e.status, { error: e.message });
  console.error(e);
  return reply(500, { error: 'Something went wrong. Try again.' });
 }
});
