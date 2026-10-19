// Client side of the portal: one project's current milestone, what is waiting on the client,
// review and payment, milestones, check-ins and messages.
(() => {
  const P = PORTAL, { esc, safeUrl, money, day, dayLong, daysSince, ago, chip, progress, meter } = P;
  const app = document.getElementById('app');
  let data = null, pid = null, busy = false;
  P.themeButton();

  if (!P.takeKey('vp-client-key')) return gate('Open the link Vyas sent you to see your project.');
  load();

  function gate(text) {
    app.innerHTML = `<div class="gate"><h1>Project portal</h1><p>${esc(text)}</p></div>`;
  }

  async function load() {
    try {
      data = await P.api('view');
      if (data.role !== 'client') { location.href = '../studio/'; return; }
      if (!data.projects.length) return gate('There is no project on this link yet.');
      if (!pid || !data.projects.some(p => p.id === pid)) pid = data.projects[0].id;
      render();
    } catch (e) {
      if (e.status === 401) { P.forget('vp-client-key'); return gate('This link has been turned off. Ask Vyas for a new one.'); }
      gate(e.message);
    }
  }

  function render() {
    const p = data.projects.find(x => x.id === pid);
    const ms = data.milestones.filter(m => m.project_id === pid).sort((a, b) => a.seq - b.seq);
    const cur = P.current(data.milestones, pid);
    const open = new Set([...app.querySelectorAll('details[open]')].map(d => d.dataset.k));
    const tabs = data.projects.length > 1
      ? `<div class="tabs">${data.projects.map(x => `<button type="button" data-tab="${esc(x.id)}" aria-pressed="${x.id === pid}">${esc(x.title)}</button>`).join('')}</div>` : '';
    const links = [
      p.site_url && `<a class="btn" href="${safeUrl(p.site_url)}" target="_blank" rel="noopener">Open site</a>`,
      p.preview_url && `<a class="btn" href="${safeUrl(p.preview_url)}" target="_blank" rel="noopener">Latest preview</a>`,
    ].filter(Boolean).join('');

    app.innerHTML = `${tabs}
      <div class="eyebrow">${esc(p.client_name || 'Your project')}</div>
      <h1>${esc(p.title)}</h1>
      ${links ? `<div class="links">${links}</div>` : ''}
      ${nowCard(p, cur)}
      <h2>Milestones</h2>
      <div class="list">${ms.length ? ms.map(milestoneRow).join('') : '<p class="empty">Milestones will appear here.</p>'}</div>
      <h2>Check-ins</h2>
      <div class="list">${checkins()}</div>
      <h2>Messages</h2>
      ${messages()}`;
    app.querySelectorAll('details').forEach(d => { if (open.has(d.dataset.k)) d.open = true; });
  }

  function nowCard(p, m) {
    const ms = data.milestones.filter(x => x.project_id === pid);
    if (!m) {
      const all = ms.length && ms.every(x => x.state === 'accepted');
      return `<div class="card now"><h3>${all ? 'Every milestone is accepted' : 'Planning the first milestone'}</h3>${dueBlock(ms)}</div>`;
    }
    const pr = progress(m, data.items);
    const waiting = data.items.filter(i => !i.done && i.waiting_on === 'client' && ms.some(x => x.id === i.milestone_id && x.state !== 'planned' && x.state !== 'accepted'));
    let review = '';
    if (m.state === 'in_review') {
      review = `<div class="block">
        <p class="block-title">Ready for your review</p>
        <p class="note" style="margin-top:0">Check it against "Done means" below. If nothing needs to change, approve it. With no reply by ${dayLong(m.review_due_at)} it counts as approved.</p>
        ${m.outcome ? `<div class="sec"><b>Done means</b><p>${esc(m.outcome)}</p></div>` : ''}
        <div class="actions"><button class="btn accent" data-approve="${m.id}">Approve</button><button class="btn" data-changes-open="${m.id}">Request changes</button></div>
        <div data-changes-form="${m.id}" hidden>
          <label class="f" for="ch-${m.id}">What needs to change?</label>
          <textarea id="ch-${m.id}" placeholder="List what does not match what was agreed."></textarea>
          <div class="actions"><button class="btn primary" data-changes-send="${m.id}">Send</button></div>
        </div></div>`;
    } else if (m.state === 'changes_requested') {
      review = `<p class="note">You asked for changes. Vyas is working on them and will send it back for review.</p>`;
    }
    return `<div class="card now">
      <div class="row"><div><div class="eyebrow">Current milestone</div><h3>${esc(m.title)}</h3></div>${chip(m.state)}</div>
      ${meter(pr)}
      <div class="row"><span class="count">${pr.total ? `${pr.done} of ${pr.total} done` : 'Checklist coming'}</span>${m.due_on ? `<span class="count">Target ${day(m.due_on)}</span>` : ''}</div>
      ${review}
      ${waiting.length ? `<div class="block"><p class="block-title">Waiting on you</p><ul class="plain">${waiting.map(i => `<li><span>${esc(i.title)}</span><span class="chip wait">${daysSince(i.waiting_since) ? daysSince(i.waiting_since) + ' days' : 'today'}</span></li>`).join('')}</ul></div>` : ''}
      ${dueBlock(ms)}
    </div>`;
  }

  function dueBlock(ms) {
    const due = ms.filter(m => m.pay_state === 'due' && m.invoice_url);
    if (!due.length) return '';
    return `<div class="block"><p class="block-title">Payment due</p><ul class="plain">${due.map(m => `<li><span>${esc(m.title)}${m.amount_cents != null ? ` &middot; ${money(m.amount_cents, m.currency)}` : ''}</span><a class="btn small primary" href="${safeUrl(m.invoice_url)}" target="_blank" rel="noopener">Pay</a></li>`).join('')}</ul></div>`;
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
      ${pr.items.length ? `<ul class="checks">${pr.items.map(i => `<li class="${i.done ? 'off' : ''}"><span class="tick ${i.done ? 'on' : ''}"></span><span>${esc(i.title)}${!i.done && i.waiting_on === 'client' ? ' <span class="chip wait">Waiting on you</span>' : ''}</span></li>`).join('')}</ul>` : ''}
      ${m.pay_state === 'due' && m.invoice_url ? `<div class="actions"><a class="btn primary" href="${safeUrl(m.invoice_url)}" target="_blank" rel="noopener">Pay ${money(m.amount_cents, m.currency)}</a></div>` : ''}
    </div></details>`;
  }

  function checkins() {
    const ups = data.updates.filter(u => u.project_id === pid);
    if (!ups.length) return '<p class="empty">Check-ins will appear here.</p>';
    return ups.map(u => {
      const first = (u.done || u.next || u.needs || u.decisions).split('\n')[0];
      return `<details data-k="u-${u.id}"><summary><div class="sum-title">${dayLong(u.created_at)}</div><div class="sum-meta"><span>${esc(first.slice(0, 120))}</span>${u.needs ? '<span class="chip wait">Needs you</span>' : ''}</div></summary><div class="body">
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
      ${ms.length ? `<div class="thread">${ms.map(m => `<div class="msg ${m.author === 'client' ? 'me' : ''}"><small>${m.author === 'client' ? 'You' : 'Vyas'} &middot; ${ago(m.created_at)}${label[m.kind] && m.body ? ' &middot; ' + label[m.kind] : ''}</small>${esc(m.body) || (label[m.kind] || '')}</div>`).join('')}</div>` : ''}
      <label class="f" for="msg" ${ms.length ? '' : 'style="margin-top:0"'}>Message Vyas</label>
      <textarea id="msg" placeholder="Questions, files you are sending, anything else."></textarea>
      <div class="actions"><button class="btn primary" data-send>Send</button></div>
    </div>`;
  }

  async function act(fn, done) {
    if (busy) return; busy = true;
    try { await fn(); P.toast(done); await load(); } catch (e) { P.toast(e.message); } finally { busy = false; }
  }

  app.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) { pid = t.dataset.tab; render(); return; }
    if (t.dataset.approve) {
      if (!confirm('Approve this milestone?')) return;
      return act(() => P.api('approve', { milestone_id: t.dataset.approve }), 'Approved. Thank you.');
    }
    if (t.dataset.changesOpen) { app.querySelector(`[data-changes-form="${t.dataset.changesOpen}"]`).hidden = false; app.querySelector(`#ch-${t.dataset.changesOpen}`).focus(); return; }
    if (t.dataset.changesSend) {
      const body = app.querySelector(`#ch-${t.dataset.changesSend}`).value;
      return act(() => P.api('request_changes', { milestone_id: t.dataset.changesSend, body }), 'Sent to Vyas.');
    }
    if ('send' in t.dataset) {
      const body = app.querySelector('#msg').value;
      return act(() => P.api('message', { project_id: pid, body }), 'Sent.');
    }
  });
})();
