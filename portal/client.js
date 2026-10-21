// Client side of the portal: what changed since the last visit, the current milestone, decisions and
// anything waiting on the client, review and payment, milestones, check-ins, messages, phone updates.
(() => {
  const P = PORTAL, { esc, safeUrl, money, day, dayLong, daysSince, ago, chip, progress, meter } = P;
  const app = document.getElementById('app');
  const SLOT = 'vp-client-key';
  let data = null, pid = null, busy = false, seenSent = false, lastSeen = null;
  const owner = () => (data && data.owner_name) || 'Vyas';
  P.themeButton();
  P.registerWorker();

  if (!P.takeKey(SLOT)) P.gate(app, 'Project portal', 'Open the link you were sent, or paste it here.', load);
  else load();
  document.addEventListener('portal:refresh', () => load());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data && !busy) load(); });

  async function load() {
    try {
      data = await P.api('view');
      if (data.role !== 'client') { location.href = '../studio/'; return; }
      if (!data.projects.length) return P.gate(app, 'Project portal', 'There is no project on this link yet.', load);
      if (!pid || !data.projects.some(p => p.id === pid)) pid = data.projects[0].id;
      if (!seenSent) { lastSeen = data.seen_at; seenSent = true; P.api('seen').catch(() => {}); P.refreshSubscription(); }
      render();
    } catch (e) {
      if (e.status === 401) { P.forget(SLOT); return P.gate(app, 'Project portal', 'This link has been turned off. Ask for a new one, or paste a current link.', load); }
      P.gate(app, 'Project portal', e.message, load);
    }
  }

  const isNew = t => lastSeen && t && new Date(t) > new Date(lastSeen);

  function render() {
    const p = data.projects.find(x => x.id === pid);
    const ms = data.milestones.filter(m => m.project_id === pid).sort((a, b) => a.seq - b.seq);
    const cur = P.current(data.milestones, pid);
    const open = new Set([...app.querySelectorAll('details[open]')].map(d => d.dataset.k));
    const drafts = Object.fromEntries([...app.querySelectorAll('textarea[id]')].map(t => [t.id, t.value]));
    const tabs = data.projects.length > 1
      ? `<div class="tabs">${data.projects.map(x => `<button type="button" data-tab="${esc(x.id)}" aria-pressed="${x.id === pid}">${esc(x.title)}</button>`).join('')}</div>` : '';
    const links = [
      p.site_url && `<a class="btn" href="${safeUrl(p.site_url)}" target="_blank" rel="noopener">Open site</a>`,
      p.preview_url && `<a class="btn" href="${safeUrl(p.preview_url)}" target="_blank" rel="noopener">Latest preview</a>`,
      calendarEvents(p).length && `<button class="btn" type="button" data-ics>Add dates to calendar</button>`,
    ].filter(Boolean).join('');
    const asks = data.asks.filter(a => a.project_id === pid);
    const openAsks = asks.filter(a => !a.answered_at && !a.closed);

    // Projects with industry screens lead with them (what we need from you, then the screen that answers
    // this client's real question); milestones, money, check-ins and messages sit underneath.
    const mods = Array.isArray(p.modules) && p.modules.length && typeof PORTAL_MODULES !== 'undefined' ? p.modules : null;
    const rest = `${asks.length ? `<h2>Decisions</h2><div class="list">${asks.map(askRow).join('')}</div>` : ''}
      <h2>Milestones</h2>
      <div class="list">${ms.length ? ms.map(milestoneRow).join('') : '<p class="empty">Milestones will appear here.</p>'}</div>
      ${budgetBlock(ms)}
      <h2>Check-ins</h2>
      <div class="list">${checkins()}</div>
      <h2>Messages</h2>
      ${messages()}`;
    app.innerHTML = `${tabs}
      <div class="eyebrow">${esc(p.client_name || 'Your project')}</div>
      <h1>${esc(p.title)}</h1>
      ${p.summary ? `<p class="note">${esc(p.summary)}</p>` : ''}
      ${links ? `<div class="links">${links}</div>` : ''}
      ${mods ? (P.demo ? '' : sinceCard()) + PORTAL_MODULES.render(mods, { live: !P.demo }) + (!P.demo && (cur || openAsks.length) ? nowCard(p, cur, openAsks) : '')
          + `<details class="more-wrap" data-k="more"><summary>Milestones, payments and messages</summary>${rest}</details>`
        : `${sinceCard()}${nowCard(p, cur, openAsks)}${rest}`}
      <div class="card phone" id="phone" hidden style="margin-top:28px"></div>`;
    if (mods && !app._modsBound) {
      app._modsBound = true;
      PORTAL_MODULES.bind(app, () => (data.projects.find(x => x.id === pid) || {}).modules, render, P.toast,
        P.demo ? null : { api: P.api, act: (op, body, done) => act(() => P.api(op, body), done), projectId: () => pid });
    }
    app.querySelectorAll('details[data-k]').forEach(d => { if (open.has(d.dataset.k)) d.open = true; });
    for (const [id, v] of Object.entries(drafts)) { const t = app.querySelector('#' + CSS.escape(id)); if (t && v) t.value = v; }
    P.renderPhoneCard(app.querySelector('#phone'), {
      pushKey: data.push_key, muted: !!data.prefs?.mute, who: 'Check-ins, reviews and anything waiting on you.',
      onMute: async v => { await P.api('prefs', { mute: v }); data.prefs = { mute: v }; P.toast(v ? 'Paused' : 'Resumed'); },
    });
  }

  function sinceCard() {
    const fresh = data.notices.filter(n => n.project_id === pid && isNew(n.created_at)).slice(0, 6);
    if (!fresh.length) return '';
    return `<div class="card since"><p class="block-title">Since your last visit</p><ul class="plain">${fresh.map(n => `<li><span>${esc(n.title)}</span><span class="count">${ago(n.created_at)}</span></li>`).join('')}</ul></div>`;
  }

  function nowCard(p, m, openAsks) {
    const ms = data.milestones.filter(x => x.project_id === pid);
    const live = new Set(ms.filter(x => x.state !== 'planned' && x.state !== 'accepted').map(x => x.id));
    const waiting = data.items.filter(i => !i.done && i.waiting_on === 'client' && live.has(i.milestone_id));
    const yours = [
      ...openAsks.map(a => `<li><span>${esc(a.question)}</span><span class="chip wait">${a.due_on ? 'by ' + day(a.due_on) : 'decide'}</span></li>`),
      ...waiting.map(i => `<li><span>${esc(i.title)}</span><span class="chip wait">${daysSince(i.waiting_since) ? daysSince(i.waiting_since) + (daysSince(i.waiting_since) === 1 ? ' day' : ' days') : 'today'}</span></li>`),
    ];
    if (!m) {
      const all = ms.length && ms.every(x => x.state === 'accepted');
      return `<div class="card now"><h3>${all ? 'Every milestone is accepted' : 'Planning the first milestone'}</h3>${yours.length ? `<div class="block"><p class="block-title">Waiting on you</p><ul class="plain">${yours.join('')}</ul></div>` : ''}${dueBlock(ms)}</div>`;
    }
    const pr = progress(m, data.items);
    let review = '';
    if (m.state === 'in_review') {
      review = `<div class="block">
        <p class="block-title">Ready for your review</p>
        <p class="note" style="margin-top:0">Check it against "Done means". If nothing needs to change, approve it. With no reply by ${dayLong(m.review_due_at)} it counts as approved.</p>
        ${m.outcome ? `<div class="sec"><b>Done means</b><p>${esc(m.outcome)}</p></div>` : ''}
        <div class="actions"><button class="btn accent" data-approve="${m.id}">Approve</button><button class="btn" data-changes-open="${m.id}">Request changes</button></div>
        <div data-changes-form="${m.id}" hidden>
          <label class="f" for="ch-${m.id}">What needs to change?</label>
          <textarea id="ch-${m.id}" placeholder="List what does not match what was agreed."></textarea>
          <div class="actions"><button class="btn primary" data-changes-send="${m.id}">Send</button></div>
        </div></div>`;
    } else if (m.state === 'changes_requested') {
      review = `<p class="note">You asked for changes. ${esc(owner())} is working on them and will send it back for review.</p>`;
    }
    return `<div class="card now">
      <div class="row"><div><div class="eyebrow">Current milestone</div><h3>${esc(m.title)}</h3></div>${chip(m.state)}</div>
      ${meter(pr)}
      <div class="row"><span class="count">${pr.total ? `${pr.done} of ${pr.total} done` : 'Checklist coming'}</span>${m.due_on ? `<span class="count">Target ${day(m.due_on)}</span>` : ''}</div>
      ${review}
      ${yours.length ? `<div class="block"><p class="block-title">Waiting on you</p><ul class="plain">${yours.join('')}</ul></div>` : ''}
      ${dueBlock(ms)}
    </div>`;
  }

  function dueBlock(ms) {
    const due = ms.filter(m => m.pay_state === 'due' && m.invoice_url);
    if (!due.length) return '';
    return `<div class="block"><p class="block-title">Payment due</p><ul class="plain">${due.map(m => `<li><span>${esc(m.title)}${m.amount_cents != null ? ` &middot; ${money(m.amount_cents, m.currency)}` : ''}</span><a class="btn small primary" href="${safeUrl(m.invoice_url)}" target="_blank" rel="noopener">Pay</a></li>`).join('')}</ul></div>`;
  }

  function budgetBlock(ms) {
    const b = P.budget(ms); if (!b) return '';
    const cell = (label, v) => `<div><div class="count">${label}</div><div class="fig">${money(v, b.currency)}</div></div>`;
    return `<div class="budget">${cell('Project total', b.total)}${cell('Paid', b.paid)}${b.due ? cell('Due now', b.due) : ''}${cell('Billed later', b.later)}</div>`;
  }

  function askRow(a) {
    const done = a.answered_at || a.closed;
    return `<details data-k="a-${a.id}" ${!done ? 'open' : ''}><summary><div class="row"><span class="sum-title">${esc(a.question)}</span>${done ? `<span class="chip go">${a.closed && !a.answered_at ? 'Closed' : 'Answered'}</span>` : `<span class="chip wait">${a.due_on ? 'By ' + day(a.due_on) : 'Needs you'}</span>`}</div>
      ${a.answered_at ? `<div class="sum-meta">${esc(a.answer || a.answer_note)}</div>` : ''}</summary><div class="body">
      ${a.detail ? `<p class="note" style="margin-top:0;white-space:pre-wrap">${esc(a.detail)}</p>` : ''}
      ${done ? (a.answer_note && a.answer ? `<div class="sec"><b>Your note</b><p>${esc(a.answer_note)}</p></div>` : '') : `
        ${a.choices.length ? `<div class="choices">${a.choices.map(c => `<button class="choice" type="button" data-pick="${a.id}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
        <label class="f" for="an-${a.id}">${a.choices.length ? 'Add a note (optional)' : 'Your answer'}</label>
        <textarea id="an-${a.id}"></textarea>
        ${a.choices.length ? '' : `<div class="actions"><button class="btn primary" data-answer="${a.id}">Send answer</button></div>`}`}
    </div></details>`;
  }

  function milestoneRow(m) {
    const pr = progress(m, data.items);
    const pay = m.amount_cents != null ? `<span>${money(m.amount_cents, m.currency)}${m.pay_state === 'paid' ? ' paid' : m.pay_state === 'due' ? ' due' : ''}</span>` : '';
    return `<details data-k="m-${m.id}"><summary>
      <div class="row"><span class="sum-title">${esc(m.title)}${m.kind === 'change' ? ' <span class="chip">Change</span>' : ''}</span>${chip(m.state)}</div>
      ${meter(pr, true)}
      <div class="sum-meta"><span>${pr.total ? `${pr.done} of ${pr.total}` : 'No checklist yet'}</span>${m.due_on ? `<span>Target ${day(m.due_on)}</span>` : ''}${pay}${m.accepted_at ? `<span>Accepted ${day(m.accepted_at)}${m.accepted_by === 'auto' ? ' (review window ended)' : ''}</span>` : ''}</div>
    </summary><div class="body">
      ${m.outcome ? `<div class="sec"><b>Done means</b><p>${esc(m.outcome)}</p></div>` : ''}
      ${pr.items.length ? `<ul class="checks">${pr.items.map(i => `<li class="${i.done ? 'off' : ''}"><span class="tick ${i.done ? 'on' : ''}"></span><span>${esc(i.title)}${!i.done && i.waiting_on === 'client' && m.state !== 'planned' ? ' <span class="chip wait">Waiting on you</span>' : ''}</span></li>`).join('')}</ul>` : ''}
      ${m.pay_state === 'due' && m.invoice_url ? `<div class="actions"><a class="btn primary" href="${safeUrl(m.invoice_url)}" target="_blank" rel="noopener">Pay ${money(m.amount_cents, m.currency)}</a></div>` : ''}
    </div></details>`;
  }

  function checkins() {
    const ups = data.updates.filter(u => u.project_id === pid);
    if (!ups.length) return '<p class="empty">Check-ins will appear here.</p>';
    return ups.map((u, n) => {
      const first = (u.done || u.next || u.needs || u.decisions).split('\n')[0];
      return `<details data-k="u-${u.id}" ${n === 0 && isNew(u.created_at) ? 'open' : ''}><summary><div class="row"><span class="sum-title">${dayLong(u.created_at)}</span>${isNew(u.created_at) ? '<span class="chip go">New</span>' : ''}</div><div class="sum-meta"><span>${esc(first.slice(0, 120))}</span>${u.needs ? '<span class="chip wait">Needs you</span>' : ''}</div></summary><div class="body">
        ${u.done ? `<div class="sec"><b>Done</b><p>${esc(u.done)}</p></div>` : ''}
        ${u.next ? `<div class="sec"><b>Next</b><p>${esc(u.next)}</p></div>` : ''}
        ${u.needs ? `<div class="sec"><b>Waiting on you</b><p>${esc(u.needs)}</p></div>` : ''}
        ${u.decisions ? `<div class="sec"><b>Decisions needed</b><p>${esc(u.decisions)}</p></div>` : ''}
        ${u.preview_url || u.video_url ? `<div class="actions">${u.preview_url ? `<a class="btn small" href="${safeUrl(u.preview_url)}" target="_blank" rel="noopener">Preview</a>` : ''}${u.video_url ? `<a class="btn small" href="${safeUrl(u.video_url)}" target="_blank" rel="noopener">Walkthrough video</a>` : ''}</div>` : ''}
      </div></details>`;
    }).join('');
  }

  function messages() {
    const ms = data.messages.filter(m => m.project_id === pid).slice().reverse();
    const label = { approve: 'Approved', changes: 'Changes requested' };
    return `<div class="card">
      ${ms.length ? `<div class="thread">${ms.map(m => `<div class="msg ${m.author === 'client' ? 'me' : ''}"><small>${m.author === 'client' ? 'You' : esc(owner())} &middot; ${ago(m.created_at)}${label[m.kind] && m.body ? ' &middot; ' + label[m.kind] : ''}</small>${esc(m.body) || (label[m.kind] || '')}</div>`).join('')}</div>` : ''}
      <label class="f" for="msg" ${ms.length ? '' : 'style="margin-top:0"'}>Message </label>
      <textarea id="msg" placeholder="Questions, links to files, anything else."></textarea>
      <div class="actions"><button class="btn primary" data-send>Send</button></div>
    </div>`;
  }

  function calendarEvents(p) {
    const ev = [];
    for (const m of data.milestones.filter(x => x.project_id === pid && x.state !== 'accepted')) {
      if (m.due_on) ev.push({ uid: 'm-' + m.id, date: m.due_on, title: `${p.title}: ${m.title} (target)`, note: m.outcome });
      if (m.state === 'in_review' && m.review_due_at) ev.push({ uid: 'r-' + m.id, date: m.review_due_at, title: `${p.title}: review closes for ${m.title}`, note: 'Approve or request changes by today.' });
    }
    for (const a of data.asks.filter(x => x.project_id === pid && !x.answered_at && !x.closed && x.due_on)) ev.push({ uid: 'a-' + a.id, date: a.due_on, title: `${p.title}: decide ${a.question}`, note: a.detail });
    return ev;
  }

  async function act(fn, done) {
    if (busy) return; busy = true;
    try { await fn(); if (done) P.toast(done); data = await P.api('view'); render(); } catch (e) { P.toast(e.message); if (e.status === 409 || e.status === 404) { data = await P.api('view').catch(() => data); render(); } } finally { busy = false; }
  }

  app.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.tab) { pid = d.tab; render(); return; }
    if ('ics' in d) { const p = data.projects.find(x => x.id === pid); P.downloadIcs(p.title, calendarEvents(p)); return; }
    if (d.approve) {
      if (!confirm('Approve this milestone?')) return;
      return act(() => P.api('approve', { milestone_id: d.approve }), 'Approved. Thank you.');
    }
    if (d.changesOpen) { app.querySelector(`[data-changes-form="${d.changesOpen}"]`).hidden = false; app.querySelector(`#ch-${d.changesOpen}`).focus(); return; }
    if (d.changesSend) return act(() => P.api('request_changes', { milestone_id: d.changesSend, body: app.querySelector(`#ch-${d.changesSend}`).value }), 'Sent to ' + owner() + '.');
    if (d.pick) return act(() => P.api('answer_ask', { id: d.pick, answer: d.val, note: app.querySelector(`#an-${d.pick}`)?.value || '' }), 'Answer sent.');
    if (d.answer) return act(() => P.api('answer_ask', { id: d.answer, note: app.querySelector(`#an-${d.answer}`).value }), 'Answer sent.');
    if ('send' in d) return act(() => P.api('message', { project_id: pid, body: app.querySelector('#msg').value }), 'Sent.');
  });
})();
