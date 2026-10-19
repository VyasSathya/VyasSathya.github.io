// Owner studio: every project's bar toward its next milestone, and everything the client side shows,
// edited from one place. Items fed by the sync script start hidden from clients.
(() => {
  const P = PORTAL, { esc, safeUrl, money, day, dayLong, daysSince, ago, chip, progress, meter } = P;
  const app = document.getElementById('app');
  const SLOT = 'vp-owner-key';
  let data = null, busy = false, fresh = null; // fresh = a just-created link, shown once
  let seenSent = false, lastSeen = null;
  P.themeButton();
  P.registerWorker();

  if (!P.takeKey(SLOT)) gate();
  else load();
  addEventListener('hashchange', render);
  document.getElementById('reload').addEventListener('click', () => load(true));
  document.addEventListener('portal:refresh', () => load());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data && !busy && !app.contains(document.activeElement)) load(); });
  setInterval(() => { if (document.visibilityState === 'visible' && !busy && !app.contains(document.activeElement)) load(); }, 120000);

  function gate(text = 'Open your owner link on this device, or paste it here.') { P.gate(app, 'Studio', text, load); }

  async function load(note) {
    try {
      data = await P.api('view');
      if (data.role !== 'owner') { location.href = '../portal/'; return; }
      if (!seenSent) { lastSeen = data.seen_at; seenSent = true; P.api('seen').catch(() => {}); P.refreshSubscription(); }
      render();
      if (note) P.toast('Up to date');
    } catch (e) {
      if (e.status === 401) { P.forget(SLOT); return gate('This owner key was turned off. Open or paste a current owner link.'); }
      gate(e.message);
    }
  }

  const isNew = t => lastSeen && t && new Date(t) > new Date(lastSeen);
  const route = () => { const m = location.hash.match(/^#\/p\/([a-z0-9-]+)/); return m ? m[1] : location.hash === '#/new' ? 'new' : null; };
  const unread = pid => data.messages.filter(m => m.project_id === pid && m.author === 'client' && !m.read_at).length;
  const msOf = pid => data.milestones.filter(m => m.project_id === pid).sort((a, b) => a.seq - b.seq);
  const itemsOf = mid => data.items.filter(i => i.milestone_id === mid).sort((a, b) => a.sort - b.sort);

  function lastMove(pid) {
    const ids = new Set(msOf(pid).map(m => m.id));
    const times = data.items.filter(i => ids.has(i.milestone_id)).map(i => i.done_at || i.created_at)
      .concat(msOf(pid).map(m => m.updated_at), data.updates.filter(u => u.project_id === pid).map(u => u.created_at));
    const s = data.projects.find(p => p.id === pid)?.signals || {};
    if (s.last_activity) times.push(s.last_activity);
    return times.filter(Boolean).sort().pop() || null;
  }

  function flags(p) {
    const out = [];
    const ms = msOf(p.id), ids = new Set(ms.filter(m => m.state !== 'planned' && m.state !== 'accepted').map(m => m.id));
    const waitC = data.items.filter(i => ids.has(i.milestone_id) && !i.done && i.waiting_on === 'client');
    if (waitC.length) { const n = Math.max(...waitC.map(i => daysSince(i.waiting_since))); out.push(`<span class="chip wait">Waiting on client${n ? ' ' + n + 'd' : ''}</span>`); }
    const waitMe = data.items.filter(i => ids.has(i.milestone_id) && !i.done && i.waiting_on === 'vyas').length;
    if (waitMe) out.push(`<span class="chip">On me ${waitMe}</span>`);
    const rev = ms.find(m => m.state === 'in_review'); if (rev) out.push(`<span class="chip wait">Review closes ${day(rev.review_due_at)}</span>`);
    if (ms.some(m => m.state === 'changes_requested')) out.push('<span class="chip wait">Changes requested</span>');
    const due = ms.filter(m => m.pay_state === 'due'); if (due.length) out.push(`<span class="chip">${money(due.reduce((s, m) => s + (+m.amount_cents || 0), 0)) || 'Invoice'} due</span>`);
    const n = unread(p.id); if (n) out.push(`<span class="chip go">${n} new message${n > 1 ? 's' : ''}</span>`);
    const fresh = data.asks.filter(a => a.project_id === p.id && a.answered_at && isNew(a.answered_at)).length;
    if (fresh) out.push(`<span class="chip go">${fresh} new answer${fresh > 1 ? 's' : ''}</span>`);
    const openQ = data.asks.filter(a => a.project_id === p.id && !a.answered_at && !a.closed).length;
    if (openQ) out.push(`<span class="chip wait">${openQ} decision${openQ > 1 ? 's' : ''} open</span>`);
    const lm = lastMove(p.id);
    if (p.status === 'active' && lm && daysSince(lm) >= 7) out.push(`<span class="chip bad">Still ${daysSince(lm)}d</span>`);
    return out.join('');
  }

  function syncLine() {
    const el = document.getElementById('sync');
    const runs = data.syncs || [];
    if (!runs.length) { el.textContent = 'Not synced yet'; el.className = 'sync stale'; return; }
    const latest = runs.map(r => r.ran_at).sort().pop();
    el.textContent = 'Synced ' + ago(latest);
    el.className = 'sync' + (Date.now() - new Date(latest) > 3 * 36e5 ? ' stale' : '');
    el.title = runs.map(r => `${r.source}: ${ago(r.ran_at)}`).join('\n');
  }

  function render() {
    if (!data) return;
    syncLine();
    const r = route();
    const open = new Set([...app.querySelectorAll('details[open]')].map(d => d.dataset.k));
    const drafts = [...app.querySelectorAll('form textarea, form input[type=text], form input[type=url]')].filter(x => x.value && x.closest('form').dataset.keep).map(x => [x.closest('form').dataset.keep, x.name, x.value]);
    if (r === 'new') app.innerHTML = projectForm(null);
    else if (r && data.projects.some(p => p.id === r)) app.innerHTML = detail(data.projects.find(p => p.id === r));
    else app.innerHTML = home();
    app.querySelectorAll('details[data-k]').forEach(d => { if (open.has(d.dataset.k)) d.open = true; });
    for (const [k, name, v] of drafts) { const f = app.querySelector(`form[data-keep="${k}"] [name="${name}"]`); if (f && !f.value) f.value = v; }
    const phone = app.querySelector('#phone');
    if (phone) P.renderPhoneCard(phone, {
      pushKey: data.push_key, muted: !!data.prefs?.mute, who: 'Approvals, change requests, answers and messages from clients.',
      onMute: async v => { await P.api('prefs', { mute: v }); data.prefs = { mute: v }; P.toast(v ? 'Paused' : 'Resumed'); },
    });
    if (r && r !== 'new' && unread(r)) P.api('mark_read', { project_id: r }).then(() => data.messages.forEach(m => { if (m.project_id === r) m.read_at = m.read_at || new Date().toISOString(); })).catch(() => {});
  }

  // ---------- home: every project's bar ----------
  function card(p) {
    const m = P.current(data.milestones, p.id);
    const pr = m ? progress(m, data.items) : { pct: msOf(p.id).length ? 100 : 0, done: 0, total: 0 };
    const sub = m ? esc(m.title) : msOf(p.id).length ? 'All milestones accepted' : 'No milestone yet';
    return `<button class="ov" type="button" data-go="${esc(p.id)}">
      <div class="t"><span>${esc(p.title)}</span>${p.kind === 'client' ? `<span class="chip">${esc(p.client_name || 'Client')}</span>` : ''}</div>
      <div class="m">${sub}</div>
      ${meter(pr)}
      <div class="row"><span class="count">${m && pr.total ? `${pr.done} of ${pr.total}` : ''}</span><span class="count">${m ? pr.pct + '%' : ''}</span></div>
      <div class="flags">${flags(p)}</div>
    </button>`;
  }

  function home() {
    const live = data.projects.filter(p => p.status === 'active');
    const client = live.filter(p => p.kind === 'client'), own = live.filter(p => p.kind !== 'client');
    const rest = data.projects.filter(p => p.status !== 'active');
    const section = (t, list) => list.length ? `<h2>${t}</h2><div class="overview">${list.map(card).join('')}</div>` : '';
    return `<div class="row"><h1>Projects</h1><a class="btn" href="#/new">New project</a></div>
      ${data.projects.length ? '' : '<p class="note">Add your first project.</p>'}
      ${activity()}
      ${section('Client work', client)}
      ${section('My projects', own)}
      ${rest.length ? `<details class="edit" data-k="rest"><summary>Paused, done and archived</summary><div class="overview" style="margin-top:10px">${rest.map(card).join('')}</div></details>` : ''}
      <h2>This device</h2><div class="card phone" id="phone" hidden></div>
      <h2>Access</h2>${accessList(null)}`;
  }

  // What clients did and what the server did for you, newest first.
  function activity() {
    const list = data.notices.filter(n => n.audience === 'owner').slice(0, 8);
    if (!list.length) return '';
    const name = pid => data.projects.find(p => p.id === pid)?.title || '';
    return `<h2>Activity</h2><div class="list">${list.map(n => `<button class="prow" type="button" ${n.project_id ? `data-go="${esc(n.project_id)}"` : ''}>
      <div class="t"><span>${isNew(n.created_at) ? '<span class="dot" style="margin:0 8px 1px 0"></span>' : ''}${esc(n.title)}</span><span class="count">${ago(n.created_at)}</span></div>
      <div class="m">${esc([name(n.project_id), n.body].filter(Boolean).join(' - '))}</div></button>`).join('')}</div>`;
  }

  // ---------- project detail ----------
  function detail(p) {
    const ms = msOf(p.id);
    const sig = p.signals || {};
    return `<a class="btn ghost small back" href="#/" style="margin-bottom:14px">Back</a>
      <div class="detail-head"><div>
        <div class="eyebrow">${p.kind === 'client' ? esc(p.client_name || 'Client') : 'My project'} &middot; ${esc(p.status)}</div>
        <h1>${esc(p.title)}</h1></div>
        <a class="btn ghost small allp" href="#/">All projects</a></div>
      <div class="links">
        ${p.site_url ? `<a class="btn small" href="${safeUrl(p.site_url)}" target="_blank" rel="noopener">Site</a>` : ''}
        ${p.preview_url ? `<a class="btn small" href="${safeUrl(p.preview_url)}" target="_blank" rel="noopener">Preview</a>` : ''}
        ${p.kind === 'client' ? `<button class="btn small" data-newlink="${esc(p.id)}">New client link</button>` : ''}
      </div>
      ${fresh && fresh.project === p.id ? freshBox() : ''}
      ${clientSeen(p)}
      ${sig.last_activity || sig.remaining ? `<p class="note">${sig.last_activity ? `Last activity ${ago(sig.last_activity)}` : ''}${sig.remaining ? ` &middot; Handoff: ${sig.remaining} remaining` : ''}${sig.last_commit ? ` &middot; Last commit ${ago(sig.last_commit)}` : ''}</p>` : ''}

      <h2>Milestones</h2>
      ${ms.map(m => milestoneCard(p, m)).join('') || '<p class="note">No milestones yet.</p>'}
      <details class="edit" data-k="addm"><summary>+ Add milestone or change order</summary>${milestoneForm(p, null)}</details>
      ${budgetLine(ms)}

      <h2>Decisions</h2>
      ${askList(p)}
      <details class="edit card" data-k="newask" style="margin-top:12px"><summary style="color:var(--fg);font-weight:500">Ask ${p.kind === 'client' ? 'the client' : ''} a question</summary>${askForm(p)}</details>

      <h2>Check-ins</h2>
      <details class="edit card" data-k="newci" style="margin-top:0"><summary style="color:var(--fg);font-weight:500">Write a check-in</summary>${checkinForm(p, null)}</details>
      <div class="list" style="margin-top:12px">${checkinList(p)}</div>

      <h2>Messages</h2>${thread(p)}

      ${p.kind === 'client' ? `<h2>Client links</h2>${accessList(p.id)}` : ''}
      <h2>Settings</h2>
      <details class="edit card" data-k="settings" style="margin-top:0"><summary style="color:var(--fg);font-weight:500">Project settings and feeds</summary>${projectForm(p)}</details>`;
  }

  function clientSeen(p) {
    if (p.kind !== 'client') return '';
    const ls = data.links.filter(l => l.role === 'client' && !l.revoked_at && l.project_ids.includes(p.id));
    if (!ls.length) return '<p class="note">No client link yet.</p>';
    const last = ls.map(l => l.last_used_at).filter(Boolean).sort().pop();
    const phones = ls.reduce((n, l) => n + (data.devices.find(d => d.access_id === l.id)?.n || 0), 0);
    return `<p class="note">${last ? `Client last opened ${ago(last)}` : 'Client has not opened it yet'}${phones ? ` &middot; updates on ${phones} device${phones > 1 ? 's' : ''}` : ''}</p>`;
  }

  function budgetLine(ms) {
    const b = P.budget(ms); if (!b) return '';
    const cell = (label, v) => `<div><div class="count">${label}</div><div class="fig">${money(v, b.currency)}</div></div>`;
    return `<div class="budget">${cell('Total', b.total)}${cell('Paid', b.paid)}${cell('Due', b.due)}${cell('Not billed', b.later)}</div>`;
  }

  function askList(p) {
    const asks = data.asks.filter(a => a.project_id === p.id);
    if (!asks.length) return '<p class="note" style="margin-top:0">No questions yet.</p>';
    return `<div class="list">${asks.map(a => `<details data-k="q-${a.id}"><summary><div class="row"><span class="sum-title">${esc(a.question)}</span>
        ${a.answered_at ? `<span class="chip go">${isNew(a.answered_at) ? 'New answer' : 'Answered'}</span>` : a.closed ? '<span class="chip">Closed</span>' : `<span class="chip wait">${a.due_on ? 'Due ' + day(a.due_on) : 'Open'}</span>`}</div>
        ${a.answered_at ? `<div class="sum-meta">${esc([a.answer, a.answer_note].filter(Boolean).join(' - '))}</div>` : a.choices.length ? `<div class="sum-meta">${esc(a.choices.join(' / '))}</div>` : ''}</summary>
      <div class="body">${a.detail ? `<p class="note" style="margin-top:0;white-space:pre-wrap">${esc(a.detail)}</p>` : ''}
        <div class="actions">${!a.answered_at && !a.closed ? `<button class="btn small" data-askclose="${a.id}">Close</button>` : ''}<button class="btn small ghost" data-askdel="${a.id}">Delete</button></div></div></details>`).join('')}</div>`;
  }

  function askForm(p) {
    return `<form data-askform="${esc(p.id)}" data-keep="ask-${esc(p.id)}">
      <label class="f">Question</label><input type="text" name="question" required placeholder="Which hero image should the homepage use?" />
      <label class="f">Options, one per line (leave empty for a written answer)</label><textarea name="choices" placeholder="Option A&#10;Option B"></textarea>
      <label class="f">Details</label><textarea name="detail" placeholder="What each option means, links to previews"></textarea>
      <div class="grid2"><div><label class="f">Decide by</label><input type="date" name="due_on" /></div></div>
      <div class="actions"><button class="btn primary" type="submit">${p.kind === 'client' ? 'Send to client' : 'Save'}</button></div>
    </form>`;
  }

  function milestoneCard(p, m) {
    const pr = progress(m, data.items);
    const its = itemsOf(m.id);
    const next = { planned: ['active', 'Start'], active: ['in_review', 'Send for review'], changes_requested: ['in_review', 'Send for review again'], in_review: ['accepted', 'Mark accepted'], accepted: ['active', 'Reopen'] }[m.state];
    const pay = m.amount_cents != null || m.invoice_url
      ? `${money(m.amount_cents, m.currency)} ${m.pay_state === 'paid' ? `paid ${day(m.paid_at)}` : m.pay_state === 'due' ? 'due' : 'not billed'}` : '';
    return `<div class="card mcard">
      <div class="row"><div><h3>${esc(m.title)}${m.kind === 'change' ? ' <span class="chip">Change</span>' : ''}${m.client_visible ? '' : ' <span class="chip">Hidden from client</span>'}</h3>
        <div class="sub">${[m.due_on && `Target ${day(m.due_on)}`, pay, m.state === 'in_review' && `auto-accepts ${dayLong(m.review_due_at)}`, m.accepted_at && `accepted ${day(m.accepted_at)} by ${m.accepted_by === 'auto' ? 'review window' : m.accepted_by}`].filter(Boolean).join(' &middot; ')}</div></div>
        ${chip(m.state)}</div>
      ${meter(pr)}
      <div class="row"><span class="count">${pr.total ? `${pr.done} of ${pr.total} &middot; ${pr.pct}%` : 'No checklist yet'}</span>
        <span class="actions" style="margin:0">
          ${next ? `<button class="btn small ${next[0] === 'in_review' ? 'accent' : ''}" data-mstate="${m.id}" data-to="${next[0]}">${next[1]}</button>` : ''}
          ${m.invoice_url && m.pay_state === 'due' ? `<button class="btn small" data-mstate="${m.id}" data-to="paid">Mark paid</button>` : ''}
          ${m.pay_state === 'paid' ? `<button class="btn small ghost" data-mstate="${m.id}" data-to="due">Unmark paid</button>` : ''}
        </span></div>
      <ul class="ilist">${its.map(itemRow).join('')}</ul>
      <div class="add"><input type="text" placeholder="Add a checklist item" data-additem="${m.id}" /><button class="btn small" data-additem-btn="${m.id}">Add</button></div>
      <details class="edit" data-k="me-${m.id}"><summary>Edit milestone</summary>${milestoneForm(p, m)}</details>
    </div>`;
  }

  function itemRow(i) {
    const w = i.waiting_on;
    return `<li>
      <input type="checkbox" data-done="${i.id}" ${i.done ? 'checked' : ''} aria-label="Done" />
      <span class="${i.done ? 'done-t' : ''}">${esc(i.title)}${i.source !== 'manual' ? `<span class="src">${esc(i.source)}</span>` : ''}${!i.done && w !== 'none' ? ` <span class="chip ${w === 'client' ? 'wait' : ''}">${w === 'client' ? 'client' : 'me'}${daysSince(i.waiting_since) ? ' ' + daysSince(i.waiting_since) + 'd' : ''}</span>` : ''}</span>
      <span class="ctl">
        <button class="mini ${w !== 'none' ? (w === 'client' ? 'warn' : 'on') : ''}" data-wait="${i.id}" title="Waiting on: nobody, client, me">${w === 'client' ? 'Client' : w === 'vyas' ? 'Me' : 'Wait'}</button>
        <button class="mini ${i.client_visible ? 'on' : ''}" data-vis="${i.id}" title="${i.client_visible ? 'Client sees this' : 'Hidden from client'}">${i.client_visible ? 'Shown' : 'Hidden'}</button>
        <button class="mini" data-del="${i.id}" title="Delete" aria-label="Delete">&times;</button>
      </span></li>`;
  }

  function milestoneForm(p, m) {
    const v = m || {};
    const k = m ? m.id : 'new';
    return `<form data-mform="${k}" data-project="${esc(p.id)}">
      <label class="f">Title</label><input type="text" name="title" value="${esc(v.title || '')}" required />
      <label class="f">Done means (what the client checks it against)</label><textarea name="outcome" placeholder="User can ... / Deployed to ... / Delivered as ...">${esc(v.outcome || '')}</textarea>
      <div class="grid2">
        <div><label class="f">Target date</label><input type="date" name="due_on" value="${esc(v.due_on || '')}" /></div>
        <div><label class="f">Amount (USD)</label><input type="number" name="amount" min="0" step="0.01" value="${v.amount_cents != null ? v.amount_cents / 100 : ''}" /></div>
      </div>
      <label class="f">Invoice link (Stripe hosted invoice)</label><input type="url" name="invoice_url" placeholder="https://invoice.stripe.com/..." value="${esc(v.invoice_url || '')}" />
      <div class="grid2">
        <label class="check"><input type="checkbox" name="change" ${v.kind === 'change' ? 'checked' : ''} /> Change order</label>
        <label class="check"><input type="checkbox" name="visible" ${v.client_visible === false ? '' : 'checked'} /> Client sees it</label>
      </div>
      <div class="actions"><button class="btn primary" type="submit">${m ? 'Save' : 'Add milestone'}</button>
        ${m && ['planned', 'active'].includes(m.state) && !itemsOf(m.id).length ? `<button class="btn ghost" type="button" data-mdel="${m.id}">Delete</button>` : ''}
        ${m && m.state !== 'planned' ? `<button class="btn ghost" type="button" data-mstate="${m.id}" data-to="planned">Back to planned</button>` : ''}
        ${m && m.pay_state !== 'none' ? `<button class="btn ghost" type="button" data-mstate="${m.id}" data-to="unbilled">Not billed</button>` : ''}</div>
    </form>`;
  }

  function checkinForm(p) {
    const ms = msOf(p.id), ids = new Set(ms.map(m => m.id));
    const recent = data.items.filter(i => ids.has(i.milestone_id) && i.done && i.client_visible && daysSince(i.done_at) <= 7).map(i => '- ' + i.title).join('\n');
    const waiting = data.items.filter(i => ids.has(i.milestone_id) && !i.done && i.waiting_on === 'client').map(i => `- ${i.title} (asked ${day(i.waiting_since)})`).join('\n');
    return `<form data-ciform="${esc(p.id)}" data-keep="ci-${esc(p.id)}">
      <label class="f">Done</label><textarea name="done">${esc(recent)}</textarea>
      <label class="f">Next</label><textarea name="next"></textarea>
      <label class="f">Waiting on you</label><textarea name="needs" placeholder="Item, date asked, date needed, what slips if late">${esc(waiting)}</textarea>
      <label class="f">Decisions needed</label><textarea name="decisions" placeholder="Question, options, decide by"></textarea>
      <div class="grid2">
        <div><label class="f">Preview link</label><input type="url" name="preview_url" value="${esc(p.preview_url || '')}" /></div>
        <div><label class="f">Walkthrough video</label><input type="url" name="video_url" placeholder="https://" /></div>
      </div>
      <label class="check"><input type="checkbox" name="visible" ${p.kind === 'client' ? 'checked' : ''} /> Client sees it</label>
      <div class="actions"><button class="btn primary" type="submit">Post check-in</button></div>
    </form>`;
  }

  function checkinList(p) {
    const ups = data.updates.filter(u => u.project_id === p.id);
    if (!ups.length) return '<p class="empty">No check-ins yet.</p>';
    return ups.map(u => `<details data-k="u-${u.id}"><summary><div class="row"><span class="sum-title">${dayLong(u.created_at)}</span>${u.client_visible ? '' : '<span class="chip">Private</span>'}</div>
      <div class="sum-meta">${esc((u.done || u.next || u.needs || u.decisions).split('\n')[0].slice(0, 120))}</div></summary><div class="body">
      ${['done', 'next', 'needs', 'decisions'].filter(k => u[k]).map(k => `<div class="sec"><b>${{ done: 'Done', next: 'Next', needs: 'Waiting on client', decisions: 'Decisions needed' }[k]}</b><p>${esc(u[k])}</p></div>`).join('')}
      ${u.preview_url || u.video_url ? `<div class="actions">${u.preview_url ? `<a class="btn small" href="${safeUrl(u.preview_url)}" target="_blank" rel="noopener">Preview</a>` : ''}${u.video_url ? `<a class="btn small" href="${safeUrl(u.video_url)}" target="_blank" rel="noopener">Video</a>` : ''}</div>` : ''}
    </div></details>`).join('');
  }

  function thread(p) {
    const ms = data.messages.filter(m => m.project_id === p.id).slice().reverse();
    const label = { approve: 'Approved', changes: 'Changes requested' };
    return `<div class="card">${ms.length ? `<div class="thread">${ms.map(m => `<div class="msg ${m.author === 'vyas' ? 'me' : ''}"><small>${m.author === 'vyas' ? 'You' : esc(p.client_name || 'Client')} &middot; ${ago(m.created_at)}${label[m.kind] && m.body ? ' &middot; ' + label[m.kind] : ''}</small>${esc(m.body) || label[m.kind] || ''}</div>`).join('')}</div>` : ''}
      <textarea data-reply="${esc(p.id)}" placeholder="${p.kind === 'client' ? 'Reply to the client' : 'Note to self'}"></textarea>
      <div class="actions"><button class="btn primary" data-reply-btn="${esc(p.id)}">Send</button></div></div>`;
  }

  function freshBox() {
    const url = `${location.origin}${fresh.role === 'owner' ? '/studio/' : '/portal/'}#k=${fresh.token}`;
    return `<div class="linkbox"><div class="sub" style="margin-bottom:6px">${fresh.role === 'owner' ? 'Owner link for a new device' : 'Client link'}. Copy it now; it is not shown again.</div>
      <div>${esc(url)}</div><div class="actions"><button class="btn small primary" data-copy="${esc(url)}">Copy link</button><button class="btn small ghost" data-dismiss>Done</button></div></div>`;
  }

  function accessList(pid) {
    const rows = data.links.filter(l => pid ? l.role === 'client' && l.project_ids.includes(pid) : true);
    const name = l => l.role === 'owner' ? 'Owner' : l.role === 'sync' ? 'Sync' : 'Client';
    return `<div class="list">${rows.length ? rows.map(l => `<div class="prow" style="cursor:default"><div class="t"><span>${esc(l.label || name(l))}</span>
        ${l.revoked_at ? '<span class="chip">Off</span>' : `<button class="btn small ghost" data-revoke="${l.id}">Turn off</button>`}</div>
        <div class="m">${name(l)}${l.role === 'client' && !pid ? ' &middot; ' + l.project_ids.map(esc).join(', ') : ''} &middot; made ${day(l.created_at)} &middot; last used ${ago(l.last_used_at)}${l.expires_at ? ' &middot; ends ' + day(l.expires_at) : ''}</div></div>`).join('') : '<p class="empty">No links yet.</p>'}</div>
      ${pid ? '' : `<div class="actions"><button class="btn small" data-newowner>Add a device</button></div>${fresh && !fresh.project ? freshBox() : ''}`}`;
  }

  function projectForm(p) {
    const v = p || { kind: 'own', status: 'active', sources: {} };
    const s = v.sources || {};
    return `${p ? '' : '<a class="btn ghost small" href="#/" style="margin-bottom:14px">Back</a><h1>New project</h1>'}
    <form data-pform="${p ? esc(p.id) : ''}">
      <div class="grid2">
        <div><label class="f">Name</label><input type="text" name="title" value="${esc(v.title || '')}" required /></div>
        <div><label class="f">Short id</label><input type="text" name="id" value="${esc(v.id || '')}" pattern="[a-z0-9][a-z0-9-]{1,60}" ${p ? 'readonly' : ''} placeholder="like-this" required /></div>
        <div><label class="f">Type</label><select name="kind"><option value="own" ${v.kind !== 'client' ? 'selected' : ''}>My project</option><option value="client" ${v.kind === 'client' ? 'selected' : ''}>Client project</option></select></div>
        <div><label class="f">Client name</label><input type="text" name="client_name" value="${esc(v.client_name || '')}" /></div>
        <div><label class="f">Their site</label><input type="url" name="site_url" value="${esc(v.site_url || '')}" placeholder="https://" /></div>
        <div><label class="f">Preview / staging</label><input type="url" name="preview_url" value="${esc(v.preview_url || '')}" placeholder="https://" /></div>
        <div><label class="f">Status</label><select name="status">${['active', 'paused', 'done', 'archived'].map(x => `<option ${v.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div><label class="f">Check-in day</label><input type="text" name="check_in_day" value="${esc(v.check_in_day || '')}" placeholder="Friday" /></div>
      </div>
      <label class="f">Summary (client sees this)</label><textarea name="summary">${esc(v.summary || '')}</textarea>
      <label class="f">Private notes</label><textarea name="owner_notes">${esc(v.owner_notes || '')}</textarea>
      <div class="grid2">
        <div><label class="f">Hub tasks fed in (ids, comma separated)</label><input type="text" name="hub" value="${esc((s.hub || []).join(', '))}" /></div>
        <div><label class="f">Brain project id</label><input type="text" name="brain" value="${esc(s.brain || '')}" /></div>
        <div><label class="f">GitHub repo (owner/name)</label><input type="text" name="github" value="${esc(s.github || '')}" /></div>
        <div><label class="f">Local repo folder</label><input type="text" name="repo" value="${esc(s.repo || '')}" placeholder="C:\\Dev\\..." /></div>
      </div>
      <div class="actions"><button class="btn primary" type="submit">${p ? 'Save' : 'Create project'}</button></div>
    </form>`;
  }

  // ---------- actions ----------
  async function act(fn, msg) {
    if (busy) return; busy = true;
    try { const r = await fn(); if (msg) P.toast(msg); data = await P.api('view'); render(); return r; }
    catch (e) { P.toast(e.message); } finally { busy = false; }
  }
  const item = id => data.items.find(i => i.id === id);
  const saveItem = (i, patch) => P.api('save_item', { item: { id: i.id, done: i.done, waiting_on: i.waiting_on, client_visible: i.client_visible, ...patch } });

  app.addEventListener('click', async e => {
    const t = e.target.closest('button, input[type=checkbox][data-done]'); if (!t) return;
    const d = t.dataset;
    if (d.go) { location.hash = '#/p/' + d.go; scrollTo(0, 0); return; }
    if (d.done) { const i = item(d.done); return act(() => saveItem(i, { done: t.checked })); }
    if (d.wait) { const i = item(d.wait); const nx = { none: 'client', client: 'vyas', vyas: 'none' }[i.waiting_on]; return act(() => saveItem(i, { waiting_on: nx })); }
    if (d.vis) { const i = item(d.vis); return act(() => saveItem(i, { client_visible: !i.client_visible })); }
    if (d.del) { if (!confirm('Delete this item?')) return; return act(() => P.api('delete_item', { id: d.del })); }
    if (d.mdel) { if (!confirm('Delete this milestone?')) return; return act(() => P.api('delete_milestone', { id: d.mdel })); }
    if (d.mstate) {
      if (d.to === 'in_review' && !confirm('Send to the client for review? It auto-accepts after 5 business days.')) return;
      return act(() => P.api('milestone_state', { id: d.mstate, to: d.to }), { in_review: 'Sent for review', accepted: 'Accepted', paid: 'Marked paid' }[d.to] || 'Saved');
    }
    if (d.additemBtn) return addItem(d.additemBtn);
    if (d.replyBtn) { const v = app.querySelector(`[data-reply="${d.replyBtn}"]`).value; return act(() => P.api('message', { project_id: d.replyBtn, body: v }), 'Sent'); }
    if (d.newlink) {
      const p = data.projects.find(x => x.id === d.newlink);
      const label = prompt('Who is this link for?', p.client_name || ''); if (label === null) return;
      const r = await act(() => P.api('create_link', { role: 'client', project_ids: [d.newlink], label }));
      if (r) { fresh = { ...r, project: d.newlink }; render(); }
      return;
    }
    if ('newowner' in d) {
      const label = prompt('Name this device', 'Vyas - phone'); if (label === null) return;
      const r = await act(() => P.api('create_link', { role: 'owner', label }));
      if (r) { fresh = { ...r, project: null }; render(); }
      return;
    }
    if (d.askclose) return act(() => { const a = data.asks.find(x => x.id === d.askclose); return P.api('save_ask', { ask: { ...a, closed: true } }); }, 'Closed');
    if (d.askdel) { if (!confirm('Delete this question?')) return; return act(() => P.api('delete_ask', { id: d.askdel }), 'Deleted'); }
    if (d.revoke) { if (!confirm('Turn this link off? Whoever has it loses access.')) return; return act(() => P.api('revoke_link', { id: d.revoke }), 'Turned off'); }
    if (d.copy) { try { await navigator.clipboard.writeText(d.copy); P.toast('Copied'); } catch (_) { prompt('Copy this link', d.copy); } return; }
    if ('dismiss' in d) { fresh = null; render(); }
  });

  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.additem) { e.preventDefault(); addItem(e.target.dataset.additem); } });
  function addItem(mid) {
    const input = app.querySelector(`[data-additem="${mid}"]`); const title = input.value.trim(); if (!title) return;
    const m = data.milestones.find(x => x.id === mid); const p = data.projects.find(x => x.id === m.project_id);
    return act(() => P.api('save_item', { item: { milestone_id: mid, title, client_visible: p.kind === 'client' } }));
  }

  app.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, v = Object.fromEntries(new FormData(f));
    if (f.dataset.pform !== undefined) {
      const sources = { hub: (v.hub || '').split(',').map(s => s.trim()).filter(Boolean), brain: v.brain.trim(), github: v.github.trim(), repo: v.repo.trim() };
      return act(async () => { const r = await P.api('save_project', { project: { ...v, sources } }); location.hash = '#/p/' + r.id; }, 'Saved');
    }
    if (f.dataset.mform) {
      const m = { project_id: f.dataset.project, title: v.title, outcome: v.outcome, due_on: v.due_on || null, invoice_url: v.invoice_url,
        amount_cents: v.amount === '' ? null : Math.round(parseFloat(v.amount) * 100), kind: v.change ? 'change' : 'milestone', client_visible: !!v.visible };
      if (f.dataset.mform !== 'new') m.id = f.dataset.mform;
      return act(() => P.api('save_milestone', { milestone: m }), 'Saved');
    }
    if (f.dataset.askform) {
      const choices = (v.choices || '').split('\n').map(x => x.trim()).filter(Boolean);
      return act(async () => { await P.api('save_ask', { ask: { project_id: f.dataset.askform, question: v.question, detail: v.detail, due_on: v.due_on || null, choices } }); f.reset(); }, 'Sent');
    }
    if (f.dataset.ciform) {
      return act(async () => { await P.api('save_update', { update: { project_id: f.dataset.ciform, ...v, client_visible: !!v.visible } }); f.reset(); }, 'Posted');
    }
  });
})();
