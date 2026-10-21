// Client portal + owner studio API. Every caller presents a private key link (x-portal-key);
// only its SHA-256 is stored. Roles: owner (everything), client (own projects, client-visible
// fields only), sync (push feeds from the owner's machine). No Supabase Auth users are created.
import postgres from 'npm:postgres@3.4.5';
import webpush from 'npm:web-push@3.6.7';

const allowed = new Set(['https://vyasapps.dev','https://www.vyasapps.dev','https://vyassathya.github.io']);
const localDev = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;
// Plain dates (due_on) stay 'YYYY-MM-DD' strings so no time zone can shift them a day.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3, idle_timeout: 20,
 types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } } });
const REVIEW_BUSINESS_DAYS = 5;
const SITE = 'https://vyasapps.dev';
const VAPID_PUBLIC = Deno.env.get('PORTAL_VAPID_PUBLIC') || '';
if (VAPID_PUBLIC) webpush.setVapidDetails(Deno.env.get('PORTAL_VAPID_SUBJECT') || SITE, VAPID_PUBLIC, Deno.env.get('PORTAL_VAPID_PRIVATE')!);

type Access = { id: string; role: 'owner' | 'client' | 'sync' | 'cron'; project_ids: string[]; label: string; seen_at: string | null; prefs: Record<string, unknown> };
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
  returning id, role, project_ids, label, seen_at, prefs`;
 if (!rows.length) throw new Fail(401, 'This link is not valid or has been turned off.');
 return rows[0] as unknown as Access;
}

const log = (a: Access, op: string, target = '', detail: unknown = {}) =>
 sql`insert into portfolio.portal_events(access_id, role, op, target, detail) values (${a.id}, ${a.role}, ${op}, ${target}, ${sql.json(detail as never)})`;

// Every notice is kept (the in-app feed) and pushed to the devices that should hear it:
// client notices go to client links on that project, owner notices to Vyas's devices.
// The payload is Declarative Web Push (iOS 18.4+ shows it without a service worker); the service
// worker reads the same JSON on every other browser.
async function notify(projectId: string | null, audience: 'client' | 'owner', kind: string, title: string, body = '', link = '') {
 const target = link || (audience === 'owner' ? (projectId ? `/studio/#/p/${projectId}` : '/studio/') : '/portal/');
 const [n] = await sql`insert into portfolio.portal_notices(project_id, audience, kind, title, body, url)
  values (${projectId}, ${audience}, ${kind}, ${title.slice(0, 200)}, ${body.slice(0, 600)}, ${target}) returning id`;
 if (!VAPID_PUBLIC) return;
 const subs = audience === 'owner'
  ? await sql`select s.* from portfolio.portal_push_subs s join portfolio.portal_access a on a.id = s.access_id
     where a.role = 'owner' and a.revoked_at is null and coalesce((a.prefs->>'mute')::boolean, false) = false`
  : await sql`select s.* from portfolio.portal_push_subs s join portfolio.portal_access a on a.id = s.access_id
     where a.role = 'client' and a.revoked_at is null and ${projectId} = any(a.project_ids) and coalesce((a.prefs->>'mute')::boolean, false) = false`;
 const payload = JSON.stringify({ web_push: 8030, notification: { title: title.slice(0, 120), body: body.slice(0, 240), navigate: SITE + target, tag: `${projectId || 'all'}-${kind}`, lang: 'en-US', dir: 'ltr', silent: false } });
 let sent = 0;
 await Promise.allSettled(subs.map(async s => {
  try {
   await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'normal', contentEncoding: 'aes128gcm' });
   sent++;
   await sql`update portfolio.portal_push_subs set last_ok_at = now(), failures = 0 where id = ${s.id}`;
  } catch (e) {
   const code = (e as { statusCode?: number }).statusCode;
   if (code === 404 || code === 410 || code === 403) await sql`delete from portfolio.portal_push_subs where id = ${s.id}`;
   else await sql`update portfolio.portal_push_subs set failures = failures + 1 where id = ${s.id}`;
   console.error('push failed', code, (e as Error).message);
  }
 }));
 await sql`update portfolio.portal_notices set pushed = ${sent} where id = ${n.id}`;
}

const money = (c: number | null, cur = 'usd') => c == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase() }).format(c / 100);
const isClientProject = async (pid: string) => (await sql`select 1 from portfolio.portal_projects where id = ${pid} and kind = 'client'`).length > 0;

// ---- industry screens (portal/modules.js) ----
// A project's `modules` is an ordered list of screens: {id, type, title, ...data}. Every screen and every
// object in its lists carries a short id so client actions name what they touch. Owners hide a screen or
// item with `hidden: true` and keep private notes in keys starting with '_'; neither reaches the client.
type Mod = Record<string, unknown> & { id: string; type: string; title?: string };
type Row = Record<string, unknown> & { id: string };
const MOD_TYPES = new Set(['needs', 'stages', 'estimate', 'photos', 'proof', 'gallery', 'docs', 'sign', 'schedule', 'countdown', 'sessions', 'tickets', 'itinerary', 'schools']);
const LIST_KEYS = ['items', 'steps', 'posts', 'comments', 'checklist', 'budget', 'homework', 'days'];
const FILES = 'portal-files';
const FILE_MAX = 50 * 1024 * 1024;
const STORAGE = (Deno.env.get('SUPABASE_URL') || '') + '/storage/v1';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const rid = () => { const b = new Uint8Array(8); crypto.getRandomValues(b); return Array.from(b, x => (x % 36).toString(36)).join(''); };
const okId = (v: unknown) => typeof v === 'string' && /^[a-z0-9]{4,16}$/.test(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function normalizeModules(v: unknown): Mod[] | null {
 if (v === null) return null;
 if (!Array.isArray(v)) throw new Fail(400, 'Screens must be a list.');
 if (v.length > 24) throw new Fail(400, 'Use 24 screens or fewer.');
 if (JSON.stringify(v).length > 200_000) throw new Fail(413, 'The screens are too large.');
 return v.map(m => {
  if (!isObj(m) || !MOD_TYPES.has(m.type as string)) throw new Fail(400, 'Unknown screen type.');
  const out: Mod = { ...m, id: okId(m.id) ? m.id as string : rid(), type: m.type as string };
  for (const k of LIST_KEYS) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).map(it => isObj(it) ? { ...it, id: okId(it.id) ? it.id : rid() } : it);
  return out;
 });
}

// What a client may see: no hidden screens or items, no '_' keys, and files by name only.
function clientModules(mods: unknown) {
 if (!Array.isArray(mods)) return null;
 const clean = (o: unknown): unknown => Array.isArray(o) ? o.filter(x => !(isObj(x) && x.hidden)).map(clean)
  : isObj(o) ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_') && k !== 'hidden')
   .map(([k, v]) => [k, k === 'file' && isObj(v) ? { name: v.name, size: v.size, at: v.at } : clean(v)])) : o;
 const list = mods.filter(m => isObj(m) && !m.hidden).map(clean);
 return list.length ? list : null;
}

// Locks the project row, hands the screen to `fn` to change in place, saves, and bumps modules_rev.
async function onModule<T>(a: Access, b: Record<string, unknown>, type: string, fn: (m: Mod, p: { title: string; kind: string }) => T | Promise<T>) {
 const pid = slug(b.project_id); canSee(a, pid);
 const mid = str(b.module_id, 20);
 return await sql.begin(async tx => {
  const [p] = await tx`select title, kind, modules from portfolio.portal_projects where id = ${pid} for update`;
  if (!p) throw new Fail(404, 'Project not found.');
  const mods = (Array.isArray(p.modules) ? p.modules : []) as Mod[];
  const m = mods.find(x => isObj(x) && x.id === mid && x.type === type && !x.hidden);
  if (!m) throw new Fail(404, 'This screen changed. Reload and try again.');
  const res = await fn(m, p as unknown as { title: string; kind: string });
  await tx`update portfolio.portal_projects set modules = ${tx.json(mods as never)}, modules_rev = modules_rev + 1, updated_at = now() where id = ${pid}`;
  return { pid, m, res };
 });
}
function rowOf(m: Mod, b: Record<string, unknown>, key = 'items') {
 const id = str(b.item_id, 20);
 const it = ((m[key] || []) as Row[]).find(x => isObj(x) && x.id === id && !x.hidden);
 if (!it) throw new Fail(404, 'This item changed. Reload and try again.');
 return it;
}
const who = (a: Access) => a.role === 'client' ? (a.label || 'Client') : 'Vyas';

async function storage(path: string, body: unknown) {
 if (!SERVICE) throw new Fail(503, 'File storage is not set up.');
 const r = await fetch(`${STORAGE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
 const j = await r.json().catch(() => ({}));
 if (!r.ok) { console.error('storage', r.status, JSON.stringify(j)); throw new Fail(502, 'File storage did not answer. Try again.'); }
 return j as Record<string, string>;
}

// After an owner edit, the client hears about what newly needs them: a new cut to review, new files or
// signatures asked for, an estimate to approve. The first setup of a project's screens is quiet.
async function announceModules(pid: string, before: unknown, after: Mod[] | null) {
 if (!after || !Array.isArray(before) || !before.length) return;
 const old = new Map((before as Mod[]).filter(isObj).map(m => [m.id, m]));
 const asks: string[] = [];
 for (const m of after) {
  if (m.hidden) continue;
  const was = old.get(m.id);
  const fresh = (key: string, open: (r: Row) => boolean) => {
   const seen = new Set(((was?.[key] || []) as Row[]).filter(isObj).map(r => r.id));
   return ((m[key] || []) as Row[]).filter(r => isObj(r) && !r.hidden && !seen.has(r.id) && open(r));
  };
  if (m.type === 'proof' && !m.approved && (!was || was.version !== m.version || was.hidden))
   await notify(pid, 'client', 'proof', `Ready for your review: ${m.title || 'new version'}${m.version ? ' ' + m.version : ''}`, 'Approve it or send your notes.');
  if (m.type === 'docs') asks.push(...fresh('items', r => (r.state || 'needed') === 'needed').map(r => String(r.t)));
  if (m.type === 'sign') asks.push(...fresh('items', r => !r.signed).map(r => `Sign: ${r.t}`));
  if (m.type === 'estimate' && !m.authorized && fresh('items', r => !!r.price && r.sev !== 'green').length)
   await notify(pid, 'client', 'estimate', `${was ? 'Estimate updated' : 'Estimate ready'}: ${m.title || 'estimate'}`, 'Approve or decline each line.');
  if (m.type === 'gallery' && !m.sent && (!was || was.hidden))
   await notify(pid, 'client', 'gallery', `Pick your favorites: ${m.title || 'gallery'}`, m.limit ? `Choose up to ${m.limit}.` : '');
 }
 if (asks.length) await notify(pid, 'client', 'request', asks.length === 1 ? `Needed from you: ${asks[0]}` : `${asks.length} new things needed from you`, asks.slice(0, 5).join(', '));
}

// Review windows that ran out with no change request count as accepted, and both sides hear about it.
async function settleReviews() {
 const done = await sql`update portfolio.portal_milestones set state = 'accepted', accepted_by = 'auto', accepted_at = review_due_at, updated_at = now()
  where state = 'in_review' and review_due_at < now() returning id, project_id, title, client_visible`;
 for (const m of done) {
  await notify(m.project_id, 'owner', 'accepted', `Accepted: ${m.title}`, 'The review window ended with no changes requested.');
  if (m.client_visible) await notify(m.project_id, 'client', 'accepted', `Approved: ${m.title}`, 'The review window ended, so this milestone is approved.');
 }
}

// Run by the database scheduler: review-closing reminders and nudges for things waiting on the client.
async function tick() {
 await settleReviews();
 const closing = await sql`update portfolio.portal_milestones set reminded_at = now()
  where state = 'in_review' and client_visible and reminded_at is null and review_due_at < now() + interval '26 hours'
  returning project_id, title, review_due_at`;
 for (const m of closing) await notify(m.project_id, 'client', 'review-closing', `Review closes soon: ${m.title}`, 'Approve it or request changes. With no reply it counts as approved.');
 const asks = await sql`update portfolio.portal_asks set reminded_at = now()
  where answered_at is null and not closed and reminded_at is null and due_on is not null and due_on <= current_date + 1
  returning project_id, question`;
 for (const q of asks) await notify(q.project_id, 'client', 'ask-due', `Decision due: ${q.question}`);
 const waits = await sql`update portfolio.portal_items i set nudged_at = now()
  from portfolio.portal_milestones m
  where i.milestone_id = m.id and m.client_visible and i.client_visible and not i.done and i.waiting_on = 'client'
   and m.state not in ('planned','accepted') and i.waiting_since <= current_date - 3
   and (i.nudged_at is null or i.nudged_at < now() - interval '3 days')
  returning m.project_id, i.title`;
 const byProject = new Map<string, string[]>();
 for (const w of waits) byProject.set(w.project_id, [...(byProject.get(w.project_id) || []), w.title]);
 for (const [pid, titles] of byProject) {
  await notify(pid, 'client', 'waiting', titles.length === 1 ? `Waiting on you: ${titles[0]}` : `${titles.length} things are waiting on you`, titles.slice(0, 4).join(', '));
  await notify(pid, 'owner', 'waiting', `Nudged ${titles.length === 1 ? 'client about 1 item' : `client about ${titles.length} items`}`, titles.slice(0, 4).join(', '));
 }
 await sql`delete from portfolio.portal_notices where created_at < now() - interval '400 days'`;
 return { ok: true, reminders: closing.length, asks: asks.length, nudges: waits.length };
}

function need(a: Access, ...roles: Access['role'][]) { if (!roles.includes(a.role)) throw new Fail(403, 'Not allowed.'); }
function canSee(a: Access, projectId: string) { if (a.role === 'owner') return; if (a.role === 'client' && a.project_ids.includes(projectId)) return; throw new Fail(403, 'Not allowed.'); }

async function clientView(a: Access) {
 await settleReviews();
 const ids = a.project_ids;
 const projects = (await sql`select id, title, client_name, summary, site_url, preview_url, status, check_in_day, updated_at, modules
  from portfolio.portal_projects where id = any(${ids}) and status <> 'archived' order by sort, title`).map(p => ({ ...p, modules: clientModules(p.modules) }));
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
 const asks = await sql`select id, project_id, question, detail, choices, due_on, answer, answer_note, answered_at, created_at, closed
  from portfolio.portal_asks where project_id = any(${ids}) order by created_at desc limit 60`;
 const notices = await sql`select id, project_id, kind, title, body, created_at from portfolio.portal_notices
  where audience = 'client' and project_id = any(${ids}) order by created_at desc limit 40`;
 const devices = await sql`select count(*)::int n from portfolio.portal_push_subs where access_id = ${a.id}`;
 return { role: 'client', label: a.label, projects, milestones, items, updates, messages, asks, notices,
  seen_at: a.seen_at, push_key: VAPID_PUBLIC, devices: devices[0].n, prefs: a.prefs };
}

async function ownerView(a: Access) {
 await settleReviews();
 const projects = await sql`select * from portfolio.portal_projects order by sort, title`;
 const milestones = await sql`select * from portfolio.portal_milestones order by project_id, seq`;
 const items = await sql`select * from portfolio.portal_items order by sort, created_at`;
 const updates = await sql`select * from portfolio.portal_updates order by created_at desc limit 300`;
 const messages = await sql`select * from portfolio.portal_messages order by created_at desc limit 300`;
 const links = await sql`select id, role, label, project_ids, created_at, expires_at, revoked_at, last_used_at, use_count from portfolio.portal_access order by created_at desc`;
 const syncs = await sql`select distinct on (source) source, ran_at, ok, detail from portfolio.portal_sync_runs order by source, ran_at desc`;
 const asks = await sql`select * from portfolio.portal_asks order by created_at desc limit 300`;
 const notices = await sql`select id, project_id, audience, kind, title, body, created_at, pushed from portfolio.portal_notices order by created_at desc limit 80`;
 const devices = await sql`select access_id, count(*)::int n from portfolio.portal_push_subs group by access_id`;
 return { role: 'owner', projects, milestones, items, updates, messages, links, syncs, asks, notices, devices,
  seen_at: a.seen_at, push_key: VAPID_PUBLIC, me: a.id, prefs: a.prefs };
}

async function milestoneProject(id: string) {
 const r = await sql`select project_id, state, client_visible, title, amount_cents, currency, invoice_url, pay_state from portfolio.portal_milestones where id = ${id}`;
 if (!r.length) throw new Fail(404, 'Milestone not found.');
 return r[0];
}

async function handle(a: Access, b: Record<string, unknown>) {
 const op = str(b.op, 40);
 switch (op) {
  case 'view':
   if (a.role === 'owner') return ownerView(a);
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
   if (a.role === 'client') await notify(m.project_id, 'owner', 'approved', `${a.label || 'Client'} approved ${m.title}`, str(b.body, 300));
   else if (m.client_visible && await isClientProject(m.project_id)) await notify(m.project_id, 'client', 'accepted', `Accepted: ${m.title}`);
   await log(a, op, id); return { ok: true };
  }
  case 'request_changes': {
   need(a, 'client');
   const id = uuid(b.milestone_id); const m = await milestoneProject(id); canSee(a, m.project_id);
   const body = str(b.body, 4000); if (body.length < 3) throw new Fail(400, 'Say what needs to change.');
   if (m.state !== 'in_review') throw new Fail(409, 'This milestone is not in review.');
   await sql`update portfolio.portal_milestones set state = 'changes_requested', updated_at = now() where id = ${id}`;
   await sql`insert into portfolio.portal_messages(project_id, milestone_id, kind, author, access_id, body) values (${m.project_id}, ${id}, 'changes', 'client', ${a.id}, ${body})`;
   await notify(m.project_id, 'owner', 'changes', `${a.label || 'Client'} requested changes: ${m.title}`, body.slice(0, 300));
   await log(a, op, id); return { ok: true };
  }
  case 'message': {
   need(a, 'client', 'owner');
   const pid = slug(b.project_id); canSee(a, pid);
   const body = str(b.body, 4000); if (!body) throw new Fail(400, 'Write a message first.');
   await sql`insert into portfolio.portal_messages(project_id, kind, author, access_id, body, read_at)
    values (${pid}, 'comment', ${a.role === 'client' ? 'client' : 'vyas'}, ${a.id}, ${body}, ${a.role === 'owner' ? new Date() : null})`;
   if (a.role === 'client') await notify(pid, 'owner', 'message', `Message from ${a.label || 'client'}`, body.slice(0, 300));
   else if (await isClientProject(pid)) await notify(pid, 'client', 'message', 'New message from Vyas', body.slice(0, 300));
   await log(a, op, pid); return { ok: true };
  }

  // ---- client actions on industry screens ----
  case 'estimate_pick': {
   need(a, 'client', 'owner');
   const r = await onModule(a, b, 'estimate', m => {
    if (m.authorized) throw new Fail(409, 'This estimate is already authorized.');
    const it = rowOf(m, b);
    if (b.pick === true || b.pick === false) it.pick = b.pick; else delete it.pick;
   });
   await log(a, op, r.m.id, { item: b.item_id, pick: b.pick }); return { ok: true };
  }
  case 'estimate_authorize': {
   need(a, 'client', 'owner');
   const r = await onModule(a, b, 'estimate', m => {
    if (m.authorized) throw new Fail(409, 'This estimate is already authorized.');
    const lines = ((m.items || []) as Row[]).filter(l => isObj(l) && !l.hidden && l.price && l.sev !== 'green');
    const yes = lines.filter(l => l.pick === true), no = lines.filter(l => l.pick === false);
    if (!yes.length) throw new Fail(400, 'Approve at least one line first.');
    const total = yes.reduce((s, l) => s + (Number(l.price) || 0), 0);
    Object.assign(m, { authorized: true, authorized_at: new Date().toISOString(), authorized_by: who(a), authorized_total: total });
    return { total, yes: yes.map(l => String(l.t)), no: no.map(l => String(l.t)) };
   });
   if (a.role === 'client') await notify(r.pid, 'owner', 'authorized', `${who(a)} authorized ${money(r.res.total)}: ${r.m.title || 'estimate'}`,
    [`Approved: ${r.res.yes.join(', ')}`, r.res.no.length ? `Declined: ${r.res.no.join(', ')}` : ''].filter(Boolean).join('. '));
   await log(a, op, r.m.id, r.res); return { ok: true, total: r.res.total };
  }
  case 'doc_upload_url': {
   need(a, 'client', 'owner');
   const pid = slug(b.project_id); canSee(a, pid);
   const size = Number(b.size);
   if (!(size > 0)) throw new Fail(400, 'Pick a file.');
   if (size > FILE_MAX) throw new Fail(413, 'That file is over 50 MB. Send a link to it instead.');
   const [p] = await sql`select modules from portfolio.portal_projects where id = ${pid}`;
   const m = ((p?.modules || []) as Mod[]).find(x => isObj(x) && x.id === str(b.module_id, 20) && x.type === 'docs' && !x.hidden);
   if (!m) throw new Fail(404, 'This screen changed. Reload and try again.');
   const it = rowOf(m, b);
   const name = (str(b.name, 120).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file').slice(-80);
   const path = `${pid}/${m.id}/${it.id}/${Date.now()}-${name}`;
   const j = await storage(`/object/upload/sign/${FILES}/${path}`, {});
   return { ok: true, path, upload_url: STORAGE + j.url };
  }
  case 'doc_received': {
   need(a, 'client', 'owner');
   const link = url(b.link);
   const path = str(b.path, 400);
   if (!link && !path) throw new Fail(400, 'Upload a file or paste a link.');
   const r = await onModule(a, b, 'docs', async m => {
    const it = rowOf(m, b);
    const now = new Date().toISOString();
    if (path) {
     if (!path.startsWith(`${slug(b.project_id)}/${m.id}/${it.id}/`)) throw new Fail(400, 'Bad file.');
     const [o] = await sql`select (metadata->>'size')::bigint size from storage.objects where bucket_id = ${FILES} and name = ${path}`;
     if (!o) throw new Fail(400, 'The upload did not finish. Try again.');
     it.file = { path, name: str(b.name, 160) || path.split('/').pop(), size: Number(o.size) || 0, at: now };
    }
    if (link) it.link = link;
    Object.assign(it, { state: 'received', sent_at: now, sent_by: who(a) });
    return String(it.t);
   });
   if (a.role === 'client') await notify(r.pid, 'owner', 'doc', `${who(a)} sent ${r.res}`, link || (path ? 'Open it in Studio.' : ''));
   await log(a, op, r.m.id, { item: b.item_id, file: !!path, link: !!link }); return { ok: true };
  }
  case 'doc_na': {
   need(a, 'client', 'owner');
   const note = str(b.note, 1000);
   const r = await onModule(a, b, 'docs', m => { const it = rowOf(m, b); Object.assign(it, { state: 'na', na_note: note, sent_at: new Date().toISOString(), sent_by: who(a) }); return String(it.t); });
   if (a.role === 'client') await notify(r.pid, 'owner', 'doc', `${who(a)} says this does not apply: ${r.res}`, note || 'Confirm it in Studio.');
   await log(a, op, r.m.id, { item: b.item_id }); return { ok: true };
  }
  case 'file_url': {
   need(a, 'client', 'owner');
   const pid = slug(b.project_id); canSee(a, pid);
   const [p] = await sql`select modules from portfolio.portal_projects where id = ${pid}`;
   const m = ((p?.modules || []) as Mod[]).find(x => isObj(x) && x.id === str(b.module_id, 20) && x.type === 'docs');
   if (!m || (a.role === 'client' && m.hidden)) throw new Fail(404, 'Not found.');
   const it = rowOf(m, b); const f = it.file as { path?: string } | undefined;
   if (!f?.path) throw new Fail(404, 'No file on this item.');
   const j = await storage(`/object/sign/${FILES}/${f.path}`, { expiresIn: 600 });
   return { ok: true, url: STORAGE + j.signedURL };
  }
  case 'sign_item': {
   need(a, 'client');
   const name = str(b.name, 120);
   if (name.length < 2) throw new Fail(400, 'Type your full name to sign.');
   const r = await onModule(a, b, 'sign', m => {
    const it = rowOf(m, b);
    if (it.signed) throw new Fail(409, 'This is already signed.');
    Object.assign(it, { signed: true, signed_name: name, signed_at: new Date().toISOString(), signed_by: who(a) });
    return String(it.t);
   });
   await notify(r.pid, 'owner', 'signed', `${who(a)} signed ${r.res}`, `Signed as ${name}`);
   await log(a, op, r.m.id, { item: b.item_id, name }); return { ok: true };
  }
  case 'proof_approve': {
   need(a, 'client', 'owner');
   const r = await onModule(a, b, 'proof', m => {
    if (m.approved) throw new Fail(409, 'This version is already approved.');
    Object.assign(m, { approved: true, approved_at: new Date().toISOString(), approved_by: who(a), approved_version: m.version });
   });
   if (a.role === 'client') await notify(r.pid, 'owner', 'approved', `${who(a)} approved ${r.m.title || 'the proof'}${r.m.version ? ' ' + r.m.version : ''}`, str(b.body, 300));
   await log(a, op, r.m.id, { version: r.m.version }); return { ok: true };
  }
  case 'proof_note': {
   need(a, 'client', 'owner');
   const body = str(b.body, 2000); if (body.length < 2) throw new Fail(400, 'Write what should change.');
   const at = str(b.at, 12);
   const r = await onModule(a, b, 'proof', m => {
    if (m.approved) throw new Fail(409, 'This version is already approved.');
    const list = (Array.isArray(m.comments) ? m.comments : []) as Row[];
    if (list.length >= 200) throw new Fail(400, 'Too many notes on this version.');
    list.push({ id: rid(), at, t: body, by: a.role === 'client' ? 'client' : 'vyas', created_at: new Date().toISOString() });
    m.comments = list;
   });
   if (a.role === 'client') await notify(r.pid, 'owner', 'changes', `${who(a)} noted a change on ${r.m.title || 'the proof'}${r.m.version ? ' ' + r.m.version : ''}`, `${at ? at + ' ' : ''}${body}`.slice(0, 300));
   await log(a, op, r.m.id); return { ok: true };
  }
  case 'gallery_pick': {
   need(a, 'client', 'owner');
   const key = str(b.key, 20); if (!/^[a-z0-9]{1,16}$/.test(key)) throw new Fail(400, 'Bad pick.');
   const r = await onModule(a, b, 'gallery', m => {
    if (m.sent) throw new Fail(409, 'Your picks are already sent.');
    const picks = (Array.isArray(m.picks) ? m.picks : []) as string[];
    const on = b.on === true, has = picks.includes(key);
    if (on && !has) { if (m.limit && picks.length >= Number(m.limit)) throw new Fail(409, `You can pick ${m.limit}.`); picks.push(key); }
    if (!on && has) picks.splice(picks.indexOf(key), 1);
    m.picks = picks; return picks.length;
   });
   return { ok: true, picked: r.res };
  }
  case 'gallery_send': {
   need(a, 'client', 'owner');
   const r = await onModule(a, b, 'gallery', m => {
    const n = Array.isArray(m.picks) ? m.picks.length : 0;
    if (!n) throw new Fail(400, 'Pick at least one first.');
    if (m.sent) throw new Fail(409, 'Your picks are already sent.');
    Object.assign(m, { sent: true, sent_at: new Date().toISOString(), sent_by: who(a) }); return n;
   });
   if (a.role === 'client') await notify(r.pid, 'owner', 'picked', `${who(a)} sent ${r.res} pick${r.res === 1 ? '' : 's'}: ${r.m.title || 'gallery'}`);
   await log(a, op, r.m.id, { n: r.res }); return { ok: true };
  }

  // ---- owner actions ----
  case 'save_modules': {
   need(a, 'owner');
   const pid = slug(b.project_id);
   const mods = normalizeModules(b.modules);
   const btype = typeof b.business_type === 'string' ? str(b.business_type, 80) : null;
   const r = await sql.begin(async tx => {
    const [p] = await tx`select modules, modules_rev from portfolio.portal_projects where id = ${pid} for update`;
    if (!p) throw new Fail(404, 'Project not found.');
    if (Number(b.rev) !== p.modules_rev) throw new Fail(409, 'These screens changed since you opened them (the client may have just acted). Reload, then make your edit again.');
    const [u] = await tx`update portfolio.portal_projects set modules = ${mods ? tx.json(mods as never) : null}, modules_rev = modules_rev + 1,
     business_type = coalesce(${btype}, business_type), updated_at = now() where id = ${pid} returning modules_rev`;
    return { before: p.modules, rev: u.modules_rev };
   });
   if (b.quiet !== true && await isClientProject(pid)) await announceModules(pid, r.before, mods);
   await log(a, op, pid, { n: mods?.length || 0 }); return { ok: true, rev: r.rev, modules: mods };
  }
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
    kind: m.kind === 'change' ? 'change' : 'milestone', visible: m.client_visible !== false, seq: m.seq === '' || m.seq == null || !Number.isFinite(Number(m.seq)) ? null : Math.round(Number(m.seq)) };
   if (!vals.title) throw new Fail(400, 'Give the milestone a title.');
   if (m.id) {
    const id = uuid(m.id);
    const before = await milestoneProject(id);
    await sql`update portfolio.portal_milestones set title = ${vals.title}, outcome = ${vals.outcome}, due_on = ${vals.due}, amount_cents = ${vals.amount},
     invoice_url = ${vals.invoice}, kind = ${vals.kind}, client_visible = ${vals.visible}, seq = coalesce(${vals.seq}, seq),
     pay_state = case when ${vals.invoice} <> '' and pay_state = 'none' then 'due' else pay_state end, updated_at = now() where id = ${id}`;
    if (vals.invoice && vals.invoice !== before.invoice_url && vals.visible && before.pay_state !== 'paid' && await isClientProject(before.project_id))
     await notify(before.project_id, 'client', 'invoice', `Invoice ready: ${vals.title}`, vals.amount != null ? `${money(vals.amount)} due` : '');
    await log(a, op, id); return { ok: true, id };
   }
   const r = await sql`insert into portfolio.portal_milestones(project_id, seq, kind, title, outcome, due_on, amount_cents, invoice_url, pay_state, client_visible)
    values (${pid}, coalesce(${vals.seq}, (select coalesce(max(seq), 0) + 1 from portfolio.portal_milestones where project_id = ${pid})), ${vals.kind}, ${vals.title},
     ${vals.outcome}, ${vals.due}, ${vals.amount}, ${vals.invoice}, ${vals.invoice ? 'due' : 'none'}, ${vals.visible}) returning id`;
   await log(a, op, r[0].id); return { ok: true, id: r[0].id };
  }
  case 'milestone_state': {
   need(a, 'owner'); const id = uuid(b.id); const to = str(b.to, 20); const cur = await milestoneProject(id);
   if (to === 'active') await sql`update portfolio.portal_milestones set state = 'active', review_opened_at = null, review_due_at = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
   else if (to === 'planned') await sql`update portfolio.portal_milestones set state = 'planned', review_opened_at = null, review_due_at = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
   else if (to === 'in_review') {
    const now = new Date(), due = addBusinessDays(now, REVIEW_BUSINESS_DAYS);
    await sql`update portfolio.portal_milestones set state = 'in_review', review_opened_at = ${now}, review_due_at = ${due}, reminded_at = null, accepted_at = null, accepted_by = null, updated_at = now() where id = ${id}`;
    if (cur.client_visible && await isClientProject(cur.project_id))
     await notify(cur.project_id, 'client', 'review', `Ready for your review: ${cur.title}`, `Approve it or request changes by ${due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}.`);
   }
   else if (to === 'accepted') await sql`update portfolio.portal_milestones set state = 'accepted', accepted_by = 'owner', accepted_at = now(), updated_at = now() where id = ${id}`;
   else if (to === 'paid') {
    await sql`update portfolio.portal_milestones set pay_state = 'paid', paid_at = now(), updated_at = now() where id = ${id}`;
    if (cur.client_visible && await isClientProject(cur.project_id)) await notify(cur.project_id, 'client', 'paid', `Payment received: ${cur.title}`, 'Thank you.');
   }
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
   if (v.visible && await isClientProject(pid)) {
    const first = (v.done || v.next || v.needs || v.decisions).split('\n')[0].replace(/^[-*]\s*/, '');
    await notify(pid, 'client', 'checkin', v.needs ? 'New check-in: something needs you' : 'New check-in', first.slice(0, 200));
   }
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

  // ---- devices, notices, decisions ----
  case 'subscribe': {
   need(a, 'owner', 'client');
   const sub = (b.subscription || {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
   const endpoint = str(sub.endpoint, 1000), p256dh = str(sub.keys?.p256dh, 200), auth = str(sub.keys?.auth, 100);
   if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) throw new Fail(400, 'This browser did not give a push address.');
   await sql`insert into portfolio.portal_push_subs(access_id, endpoint, p256dh, auth, device) values (${a.id}, ${endpoint}, ${p256dh}, ${auth}, ${str(b.device, 200)})
    on conflict (endpoint) do update set access_id = excluded.access_id, p256dh = excluded.p256dh, auth = excluded.auth, device = excluded.device, failures = 0`;
   if (b.test) {
    const home = a.role === 'owner' ? '/studio/' : '/portal/';
    const payload = JSON.stringify({ web_push: 8030, notification: { title: 'Updates are on', body: a.role === 'owner' ? 'Approvals, change requests, answers and messages will show up here.' : 'Check-ins, reviews and anything waiting on you will show up here.', navigate: SITE + home, tag: 'welcome' } });
    try { await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload, { TTL: 600, contentEncoding: 'aes128gcm' }); }
    catch (e) { console.error('welcome push failed', (e as { statusCode?: number }).statusCode, (e as Error).message); throw new Fail(502, 'Saved, but the test notification did not go through.'); }
   }
   await log(a, op, '', { device: str(b.device, 200) });
   return { ok: true };
  }
  case 'unsubscribe': {
   need(a, 'owner', 'client');
   await sql`delete from portfolio.portal_push_subs where endpoint = ${str(b.endpoint, 1000)} and access_id = ${a.id}`;
   return { ok: true };
  }
  case 'seen': {
   need(a, 'owner', 'client');
   await sql`update portfolio.portal_access set prev_seen_at = seen_at, seen_at = now() where id = ${a.id} and (seen_at is null or seen_at < now() - interval '20 minutes')`;
   return { ok: true };
  }
  case 'prefs': {
   need(a, 'owner', 'client');
   const prefs = { mute: b.mute === true };
   await sql`update portfolio.portal_access set prefs = ${sql.json(prefs)} where id = ${a.id}`;
   return { ok: true, prefs };
  }
  case 'save_ask': {
   need(a, 'owner'); const q = (b.ask || {}) as Record<string, unknown>;
   const pid = slug(q.project_id), question = str(q.question, 500); if (!question) throw new Fail(400, 'Write the question.');
   const choices = Array.isArray(q.choices) ? q.choices.map(c => str(c, 200)).filter(Boolean).slice(0, 8) : [];
   if (q.id) {
    const id = uuid(q.id);
    await sql`update portfolio.portal_asks set question = ${question}, detail = ${str(q.detail, 3000)}, choices = ${choices}, due_on = ${date(q.due_on)}, closed = ${q.closed === true} where id = ${id}`;
    await log(a, op, id); return { ok: true, id };
   }
   const r = await sql`insert into portfolio.portal_asks(project_id, question, detail, choices, due_on) values (${pid}, ${question}, ${str(q.detail, 3000)}, ${choices}, ${date(q.due_on)}) returning id`;
   if (await isClientProject(pid)) await notify(pid, 'client', 'ask', `Decision needed: ${question}`, choices.length ? choices.join(' / ') : str(q.detail, 300));
   await log(a, op, r[0].id); return { ok: true, id: r[0].id };
  }
  case 'answer_ask': {
   need(a, 'client', 'owner'); const id = uuid(b.id);
   const r = await sql`select project_id, question, choices, closed from portfolio.portal_asks where id = ${id}`;
   if (!r.length) throw new Fail(404, 'Not found.'); canSee(a, r[0].project_id);
   if (r[0].closed) throw new Fail(409, 'This question is closed.');
   const answer = str(b.answer, 500), note = str(b.note, 3000);
   if (!answer && !note) throw new Fail(400, 'Pick an answer or write one.');
   if (answer && r[0].choices.length && !r[0].choices.includes(answer)) throw new Fail(400, 'Pick one of the options.');
   await sql`update portfolio.portal_asks set answer = ${answer || null}, answer_note = ${note}, answered_at = now() where id = ${id}`;
   if (a.role === 'client') await notify(r[0].project_id, 'owner', 'answered', `${a.label || 'Client'} answered: ${r[0].question}`, [answer, note].filter(Boolean).join(' - ').slice(0, 300));
   await log(a, op, id); return { ok: true };
  }
  case 'delete_ask': { need(a, 'owner'); const id = uuid(b.id); await sql`delete from portfolio.portal_asks where id = ${id}`; await log(a, op, id); return { ok: true }; }
  case 'tick': { need(a, 'cron', 'owner'); return tick(); }

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
  if (access.role === 'cron' && body.op !== 'tick') return reply(403, { error: 'Not allowed.' });
  return reply(200, await handle(access, body));
 } catch (e) {
  if (e instanceof Fail) return reply(e.status, { error: e.message });
  console.error(e);
  return reply(500, { error: 'Something went wrong. Try again.' });
 }
});
