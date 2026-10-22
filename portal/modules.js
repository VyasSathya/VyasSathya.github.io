// The screens a client actually opens, by kind of business (from docs/research/flows-*.md):
// needs (what we need from you), stages (where it is, including outside parties), estimate (line items
// with approve/decline), photos (progress timeline), proof (versions and revision rounds), gallery
// (favorites with a limit), docs (requests: upload / does not apply), sign, schedule (who is coming when),
// countdown (date, checklist, budget by vendor), sessions (used vs left, next, homework), tickets,
// itinerary, schools. A project carries `modules` as an ordered list of {id, type, ...data}.
// The demo runs them on sample data in the tab; a real project (live) saves every action to the server.
const PORTAL_MODULES = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const href = u => /^https:\/\//i.test(String(u || '')) ? esc(u) : '';
  const money = c => c == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
  const day = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const untilDays = d => Math.ceil((new Date(d + 'T12:00:00') - Date.now()) / 864e5);
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n ? n + ' B' : '';
  const head = (m, extra = '') => `<div class="mod-head"><h2>${esc(m.title)}</h2>${extra}</div>`;
  const key = (it, i) => esc(it && it.id ? it.id : i);
  const vis = list => (list || []).filter(x => !(x && x.hidden));
  const R = {};
  let live = false;

  // Live: what needs the client is read off the other screens (open requests, unsigned papers, a version
  // to review, an estimate to approve, picks to send), plus any line the owner added by hand.
  function derivedNeeds(mods) {
    const out = [];
    for (const m of mods) {
      if (m.type === 'proof' && !m.approved) out.push({ kind: 'Review', title: `${m.title || 'Proof'}${m.version ? ', ' + m.version : ''}`, go: 'proof' });
      if (m.type === 'estimate' && !m.authorized && vis(m.items).some(l => l.price && l.sev !== 'green')) out.push({ kind: 'Approve', title: m.title || 'Estimate', go: 'estimate' });
      if (m.type === 'docs') vis(m.items).filter(d => (d.state || 'needed') === 'needed').forEach(d => out.push({ kind: 'Send', title: d.t, go: 'docs', due: d.due }));
      if (m.type === 'sign') vis(m.items).filter(s => !s.signed).forEach(s => out.push({ kind: 'Sign', title: s.t, go: 'sign', due: s.by }));
      if (m.type === 'gallery' && !m.sent) out.push({ kind: 'Pick', title: m.title || 'Favorites', go: 'gallery' });
    }
    return out;
  }

  R.needs = (m, mods) => {
    const items = live ? [...derivedNeeds(mods), ...vis(m.items).filter(it => !it.go)] : m.items;
    if (!items || !items.length) return `<section class="mod needs done">${head({ title: m.title || 'Needs you' })}<p class="note">Nothing needs you right now.</p></section>`;
    return `<section class="mod needs" id="mod-needs">${head({ title: m.title || 'Needs you' }, `<span class="count">${items.length}</span>`)}
      <div class="need-list">${items.map((it, i) => `<button type="button" class="need" data-go="${esc(it.go || '')}" data-i="${i}">
        <span class="need-kind">${esc(it.kind)}</span><span class="need-t">${esc(it.title)}</span>
        <span class="need-meta">${[it.amount != null ? money(it.amount) : '', it.due ? 'by ' + day(it.due) : ''].filter(Boolean).join(' &middot; ')}</span></button>`).join('')}</div></section>`;
  };

  R.stages = m => `<section class="mod" id="mod-stages">${head(m)}
    <ol class="stages">${vis(m.steps).map(s => `<li class="st-${s.state}"><span class="dot"></span><div><b>${esc(s.t)}</b>${s.who ? `<span class="who">${esc(s.who)}</span>` : ''}${s.date ? `<span class="when">${esc(/^\d{4}-\d\d-\d\d$/.test(s.date) ? day(s.date) : s.date)}</span>` : ''}${s.state === 'now' && s.note ? `<p>${esc(s.note)}</p>` : ''}</div></li>`).join('')}</ol>
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;

  R.estimate = m => {
    const groups = [['red', m.redLabel || 'Needs attention now'], ['yellow', m.yellowLabel || 'Can wait'], ['green', m.greenLabel || 'Checked and fine']];
    const lines = vis(m.items).map((it, i) => ({ ...it, i, k: key(it, i) }));
    const total = m.authorized && m.authorized_total != null ? m.authorized_total : lines.filter(l => l.pick === true && l.price && l.sev !== 'green').reduce((s, l) => s + l.price, 0);
    const lock = m.authorized ? 'disabled' : '';
    return `<section class="mod" id="mod-estimate">${head(m, m.ref ? `<span class="count">${esc(m.ref)}</span>` : '')}
      ${m.intro ? `<p class="note" style="margin-top:0">${esc(m.intro)}</p>` : ''}
      ${groups.map(([sev, label]) => { const g = lines.filter(l => (l.sev || 'red') === sev); return g.length ? `<div class="est-group sev-${sev}"><p class="block-title">${esc(label)} <span class="count">${g.length}</span></p>
        ${g.map(l => `<div class="est-line"><div class="est-photo" aria-hidden="true">${href(l.img) ? `<img src="${href(l.img)}" alt="" loading="lazy">` : esc(l.photo || '')}</div><div class="est-body"><b>${esc(l.t)}</b>${l.note ? `<p>${esc(l.note)}</p>` : ''}</div>
          <div class="est-right">${l.price ? `<span class="est-price">${money(l.price)}</span>` : ''}${sev !== 'green' && l.price ? `<span class="est-pick"><button type="button" data-est="${l.k}" data-v="1" aria-pressed="${l.pick === true}" ${lock}>Approve</button><button type="button" data-est="${l.k}" data-v="0" aria-pressed="${l.pick === false}" ${lock}>Decline</button></span>` : ''}</div></div>`).join('')}</div>` : ''; }).join('')}
      <div class="est-total"><span>${esc(m.totalLabel || 'Approved total')}</span><b>${money(total)}</b></div>
      ${m.authorized ? `<p class="done-line"><span class="chip go">${esc(m.doneLabel || 'Authorized')}</span>${m.authorized_at ? ` <span class="count">${day(m.authorized_at)}${m.authorized_by ? ' by ' + esc(m.authorized_by) : ''}</span>` : ''}</p>`
        : `<button type="button" class="btn primary wide" data-authorize ${total ? '' : 'disabled'}>${m.actionLabel || 'Authorize'} ${money(total)}</button>`}</section>`;
  };

  R.photos = m => `<section class="mod" id="mod-photos">${head(m)}
    <div class="feed">${vis(m.posts).map(p => { const imgs = (p.imgs || []).filter(href); return `<article><div class="feed-meta"><b>${esc(p.who || '')}</b><span>${esc(/^\d{4}-\d\d-\d\d$/.test(p.date || '') ? day(p.date) : p.date)}</span></div><p>${esc(p.caption)}</p>
      <div class="tiles">${imgs.length ? imgs.slice(0, 8).map(u => `<a class="tile-ph" href="${href(u)}" target="_blank" rel="noopener"><img src="${href(u)}" alt="" loading="lazy"></a>`).join('')
        : Array.from({ length: Math.min(p.n || 3, 4) }, (_, k) => `<div class="tile-ph" aria-hidden="true"><span>${esc((p.tags || [])[k] || '')}</span></div>`).join('')}</div></article>`; }).join('')}</div></section>`;

  R.proof = m => {
    const notes = vis(m.comments);
    return `<section class="mod" id="mod-proof">${head(m, m.rounds ? `<span class="count">Round ${esc(m.round || 1)} of ${esc(m.rounds)}</span>` : '')}
    ${href(m.url) ? `<a class="proof-frame" href="${href(m.url)}" target="_blank" rel="noopener"><span>${esc(m.version)}</span><b>${esc(m.file || m.title)}</b><i>${m.length ? esc(m.length) + ' &middot; ' : ''}Open</i></a>`
      : `<div class="proof-frame" aria-hidden="true"><span>${esc(m.version)}</span><b>${esc(m.file)}</b>${m.length ? `<i>${esc(m.length)}</i>` : ''}</div>`}
    ${m.specs ? `<ul class="plain specs">${m.specs.map(s => `<li><span>${esc(s[0])}</span><span>${esc(s[1])}</span></li>`).join('')}</ul>` : ''}
    <div class="comments">${notes.map(c => `<p>${c.at ? `<span class="at">${esc(c.at)}</span>` : ''}${esc(c.t)}${c.done ? ' <span class="chip go">Fixed</span>' : ''}</p>`).join('')}</div>
    <div class="actions">${m.approved ? `<span class="chip go">Approved${m.approved_version && m.approved_version !== m.version ? '' : ' ' + esc(m.version || '')}</span>${m.approved_at ? `<span class="count">${day(m.approved_at)}</span>` : ''}` : `<button type="button" class="btn accent" data-proof="approve">Approve ${esc(m.version)}</button><button type="button" class="btn" data-proof="changes">Request changes</button>`}</div>
    ${live && !m.approved ? `<div class="inline-form" data-proof-form hidden>
      <div class="grid-at"><div><label class="f" for="pf-at">${esc(m.atLabel || 'Where (optional)')}</label><input type="text" id="pf-at" placeholder="${esc(m.atHint || '0:41')}" maxlength="12"></div>
      <div><label class="f" for="pf-t">What should change</label><input type="text" id="pf-t" maxlength="2000"></div></div>
      <div class="actions"><button type="button" class="btn primary small" data-proof="send">Send note</button></div></div>` : ''}
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;
  };

  R.gallery = m => {
    const items = vis(m.items);
    const picks = live ? (m.picks || []) : null;
    const n = live ? picks.length : m.picked;
    const tiles = items.length
      ? items.map((it, k) => ({ k: key(it, k), on: picks ? picks.includes(String(it.id || k)) : k < m.picked, img: href(it.url), label: it.t || k + 1 }))
      : Array.from({ length: m.show || 12 }, (_, k) => ({ k: String(k), on: picks ? picks.includes(String(k)) : k < m.picked, img: '', label: k + 1 }));
    return `<section class="mod" id="mod-gallery">${head(m, `<span class="count" data-picked>${n} of ${m.limit} picked</span>`)}
    <div class="gal">${tiles.map(t => `<button type="button" class="gal-ph${t.img ? ' has-img' : ''}" data-gpick="${t.k}" aria-pressed="${t.on}" ${live && m.sent ? 'disabled' : ''}>${t.img ? `<img src="${t.img}" alt="" loading="lazy">` : `<span>${esc(t.label)}</span>`}</button>`).join('')}</div>
    ${live ? (m.sent ? `<p class="done-line"><span class="chip go">Picks sent</span>${m.sent_at ? ` <span class="count">${day(m.sent_at)}</span>` : ''}</p>` : `<div class="actions"><button type="button" class="btn primary" data-gal-send ${n ? '' : 'disabled'}>Send my picks</button></div>`) : ''}
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;
  };

  R.docs = m => {
    const items = vis(m.items);
    const got = d => d.state === 'received' ? (d.file ? `Received: ${esc(d.file.name)}${d.file.size ? ' &middot; ' + size(d.file.size) : ''}` : d.link ? 'Link received' : 'Received') : { accepted: 'Accepted', na: 'Marked not applicable' }[d.state] || '';
    return `<section class="mod" id="mod-docs">${head(m, `<span class="count">${items.filter(d => (d.state || 'needed') !== 'needed').length} of ${items.length}</span>`)}
    <ul class="plain docs">${items.map((d, i) => `<li><span>${esc(d.t)}${d.why ? `<small>${esc(d.why)}</small>` : ''}${d.note ? `<small>${esc(d.note)}</small>` : ''}</span>${(d.state || 'needed') === 'needed'
      ? `<span class="doc-act"><button type="button" class="btn small" data-doc="${key(d, i)}">Upload</button>${live ? `<button type="button" class="btn ghost small" data-doclink="${key(d, i)}">Send a link</button>` : ''}<button type="button" class="btn ghost small" data-na="${key(d, i)}">Does not apply</button></span>`
      : `<span class="chip ${d.state === 'accepted' ? 'go' : ''}">${got(d)}</span>`}</li>
      ${live && (d.state || 'needed') === 'needed' ? `<li class="inline-form" data-docform="${key(d, i)}" hidden><span style="flex:1"><label class="f" for="dl-${key(d, i)}">Link to the file (Dropbox, Google Drive, WeTransfer)</label><input type="url" id="dl-${key(d, i)}" placeholder="https://"></span><button type="button" class="btn primary small" data-doclink-send="${key(d, i)}">Send</button></li>` : ''}`).join('')}</ul>
    ${live ? '<input type="file" data-doc-file hidden>' : ''}</section>`;
  };

  R.sign = m => `<section class="mod" id="mod-sign">${head(m)}
    <ul class="plain">${vis(m.items).map((s, i) => `<li><span>${esc(s.t)}${s.signed && s.signed_name ? `<small>Signed by ${esc(s.signed_name)}${s.signed_at ? ' on ' + day(s.signed_at) : ''}</small>` : s.by ? `<small>Sign by ${day(s.by)}</small>` : ''}</span>${s.signed ? '<span class="chip go">Signed</span>' : `<button type="button" class="btn small primary" data-sign="${key(s, i)}">Review and sign</button>`}</li>
      ${live && !s.signed ? `<li class="inline-form" data-signform="${key(s, i)}" hidden><span style="flex:1">${href(s.url) ? `<a class="btn small" href="${href(s.url)}" target="_blank" rel="noopener">Read ${esc(s.t)}</a>` : ''}
        <label class="f" for="sg-${key(s, i)}">Type your full name to sign</label><input type="text" id="sg-${key(s, i)}" autocomplete="name" maxlength="120"></span><button type="button" class="btn primary small" data-sign-send="${key(s, i)}">Sign</button></li>` : ''}`).join('')}</ul></section>`;

  R.schedule = m => `<section class="mod" id="mod-schedule">${head(m)}
    <ul class="plain sched">${vis(m.items).map(s => `<li><span class="sched-when">${esc(s.when)}</span><span class="sched-what"><b>${esc(s.what)}</b>${s.who ? `<small>${esc(s.who)}</small>` : ''}</span></li>`).join('')}</ul></section>`;

  R.countdown = m => {
    const n = untilDays(m.date);
    const budget = vis(m.budget);
    const spent = budget.reduce((s, b) => s + (b.paid || 0), 0), total = budget.reduce((s, b) => s + (b.total || 0), 0);
    return `<section class="mod" id="mod-countdown"><div class="cd"><b>${n}</b><span>days until ${esc(m.to)}</span><small>${day(m.date)}</small></div>
      ${m.checklist ? `<p class="block-title">Next on the checklist</p><ul class="plain">${vis(m.checklist).map(c => `<li><span>${esc(c.t)}</span><span class="count">${c.due ? day(c.due) : ''}</span></li>`).join('')}</ul>` : ''}
      ${budget.length ? `<p class="block-title" style="margin-top:1.4rem">Budget <span class="count">${money(spent)} paid of ${money(total)}</span></p><ul class="plain bud">${budget.map(b => `<li><span>${esc(b.vendor)}</span><span class="bud-bar"><i style="width:${b.total ? Math.round((b.paid || 0) / b.total * 100) : 0}%"></i></span><span class="count">${money((b.total || 0) - (b.paid || 0))} left${b.due ? ' &middot; next ' + day(b.due) : ''}</span></li>`).join('')}</ul>` : ''}</section>`;
  };

  R.sessions = m => `<section class="mod" id="mod-sessions">${head(m)}<div class="big-num"><b>${m.total - m.used}</b><span>of ${m.total} ${esc(m.unit || 'sessions')} left</span></div>
    ${m.next ? `<div class="row next-s"><span>Next: <b>${esc(m.next)}</b></span>${href(m.book_url) ? `<a class="btn small" href="${href(m.book_url)}" target="_blank" rel="noopener">${esc(m.cta || 'Book next')}</a>` : live ? '' : `<button type="button" class="btn small" data-book>${esc(m.cta || 'Book next')}</button>`}</div>` : ''}
    ${m.homework ? `<p class="block-title" style="margin-top:1.2rem">${esc(m.homeworkLabel || 'Your homework')}</p><ul class="checks">${vis(m.homework).map(h => `<li class="${h.done ? 'off' : ''}"><span class="tick ${h.done ? 'on' : ''}"></span><span>${esc(h.t)}</span></li>`).join('')}</ul>` : ''}
    ${m.notes ? `<div class="sec"><b>${esc(m.notesLabel || 'Notes from your last session')}</b><p>${esc(m.notes)}</p></div>` : ''}</section>`;

  R.tickets = m => `<section class="mod" id="mod-tickets">${head(m)}<ul class="plain">${vis(m.items).map(t => `<li><span><b>${esc(t.t)}</b><small>${esc(t.who || '')}</small></span><span class="chip ${t.state === 'Resolved' ? 'go' : 'wait'}">${esc(t.state)}</span></li>`).join('')}</ul></section>`;

  R.itinerary = m => `<section class="mod" id="mod-itinerary">${head(m)}${vis(m.days).map(d => `<div class="iti"><p class="block-title">${esc(d.d)}</p><ul class="plain">${(d.items || []).map(x => `<li><span>${esc(x[0])}</span><span class="count">${esc(x[1] || '')}</span></li>`).join('')}</ul></div>`).join('')}</section>`;

  R.schools = m => `<section class="mod" id="mod-schools">${head(m)}<ul class="plain">${vis(m.items).map(s => `<li><span><b>${esc(s.school)}</b><small>${esc(s.round)} &middot; due ${day(s.deadline)}</small></span><span class="chip ${/submitted|admitted/i.test(s.status) ? 'go' : 'wait'}">${esc(s.status)}</span></li>`).join('')}</ul></section>`;

  // opts.live: a real project (actions go to the server, needs are read off the other screens).
  function render(mods, opts = {}) {
    live = !!opts.live;
    const list = vis(mods);
    return list.map(m => (R[m.type] ? R[m.type](m, list) : '')).join('');
  }

  // Demo interactions stay in the tab. With `server` ({ act(op, body, done), projectId }) every action is
  // saved through the portal function and the page reloads its data afterwards.
  function bind(app, getMods, rerender, toast, server) {
    const rowIndex = (list, k) => vis(list).findIndex((x, i) => String(x && x.id ? x.id : i) === String(k));
    app.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !b.closest('.mod')) return;
      const mods = vis(getMods() || []);
      const find = t => mods.find(m => m.type === t);
      const sec = b.closest('.mod');
      if (b.dataset.go !== undefined && b.classList.contains('need')) { const el = app.querySelector('#mod-' + b.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }

      if (server) {
        const send = (op, type, body, done) => server.act(op, { project_id: server.projectId(), module_id: find(type).id, ...body }, done);
        const open = sel => { const f = sec.querySelector(sel); if (f) { f.hidden = !f.hidden; const i = f.querySelector('input'); if (i && !f.hidden) i.focus(); } };
        if (b.dataset.est !== undefined) { const m = find('estimate'), it = vis(m.items)[rowIndex(m.items, b.dataset.est)]; const v = b.dataset.v === '1'; return send('estimate_pick', 'estimate', { item_id: b.dataset.est, pick: it.pick === v ? null : v }); }
        if ('authorize' in b.dataset) { const m = find('estimate'); if (!confirm(`${m.actionLabel || 'Authorize'} the approved lines?`)) return; return send('estimate_authorize', 'estimate', {}, 'Authorized. They are notified.'); }
        if (b.dataset.proof === 'approve') { const m = find('proof'); if (!confirm(`Approve ${m.version || 'this version'}?`)) return; return send('proof_approve', 'proof', {}, 'Approved. They are notified.'); }
        if (b.dataset.proof === 'changes') return open('[data-proof-form]');
        if (b.dataset.proof === 'send') return send('proof_note', 'proof', { at: sec.querySelector('#pf-at').value, body: sec.querySelector('#pf-t').value }, 'Note sent.');
        if (b.dataset.gpick !== undefined) { const on = b.getAttribute('aria-pressed') !== 'true'; return send('gallery_pick', 'gallery', { key: b.dataset.gpick, on }); }
        if ('galSend' in b.dataset) { if (!confirm('Send your picks? You cannot change them after.')) return; return send('gallery_send', 'gallery', {}, 'Picks sent.'); }
        if (b.dataset.doclink !== undefined) return open(`[data-docform="${b.dataset.doclink}"]`);
        if (b.dataset.doclinkSend !== undefined) return send('doc_received', 'docs', { item_id: b.dataset.doclinkSend, link: sec.querySelector('#dl-' + CSS.escape(b.dataset.doclinkSend)).value }, 'Link sent.');
        if (b.dataset.na !== undefined) { const note = prompt('Why does it not apply? (optional)', ''); if (note === null) return; return send('doc_na', 'docs', { item_id: b.dataset.na, note }, 'Sent for them to confirm.'); }
        if (b.dataset.doc !== undefined) { const f = sec.querySelector('[data-doc-file]'); f.dataset.item = b.dataset.doc; f.value = ''; f.click(); return; }
        if (b.dataset.sign !== undefined) return open(`[data-signform="${b.dataset.sign}"]`);
        if (b.dataset.signSend !== undefined) return send('sign_item', 'sign', { item_id: b.dataset.signSend, name: sec.querySelector('#sg-' + CSS.escape(b.dataset.signSend)).value }, 'Signed.');
        return;
      }

      if (b.dataset.est !== undefined) { const m = find('estimate'); m.items[+b.dataset.est].pick = b.dataset.v === '1'; m.authorized = false; return rerender(); }
      if ('authorize' in b.dataset) { const m = find('estimate'); m.authorized = true; toast('Authorized. The shop is notified and starts the work.'); return rerender(); }
      if (b.dataset.proof) { const m = find('proof'); if (b.dataset.proof === 'approve') { m.approved = true; toast(`${m.version} approved.`); } else { toast(`Round ${m.round} of ${m.rounds}: add your notes in the comments.`); } return rerender(); }
      if (b.dataset.gpick !== undefined) { const m = find('gallery'); const on = b.getAttribute('aria-pressed') === 'true'; if (!on && m.picked >= m.limit) return toast(`You can pick ${m.limit}.`); m.picked += on ? -1 : 1; b.setAttribute('aria-pressed', String(!on)); app.querySelector('[data-picked]').textContent = `${m.picked} of ${m.limit} picked`; return; }
      if (b.dataset.doc !== undefined) { find('docs').items[+b.dataset.doc].state = 'received'; toast('Uploaded. They will check it and mark it accepted.'); return rerender(); }
      if (b.dataset.na !== undefined) { find('docs').items[+b.dataset.na].state = 'na'; toast('Sent for them to confirm.'); return rerender(); }
      if (b.dataset.sign !== undefined) { find('sign').items[+b.dataset.sign].signed = true; toast('Signed.'); return rerender(); }
      if ('book' in b.dataset) { toast('In a real portal this opens their booking calendar.'); }
    });

    if (!server) return;
    // Upload: ask the function for a one-time upload address, send the file straight to storage, then
    // record it on the request so the owner hears about it.
    app.addEventListener('change', async e => {
      const f = e.target.closest('[data-doc-file]'); if (!f || !f.files[0]) return;
      const file = f.files[0], item = f.dataset.item, m = vis(getMods() || []).find(x => x.type === 'docs');
      const base = { project_id: server.projectId(), module_id: m.id, item_id: item };
      const btn = app.querySelector(`[data-doc="${CSS.escape(item)}"]`); if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }
      try {
        const up = await server.api('doc_upload_url', { ...base, name: file.name, size: file.size });
        const res = await fetch(up.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file });
        if (!res.ok) throw new Error('The upload did not go through. Try again, or send a link.');
        await server.act('doc_received', { ...base, path: up.path, name: file.name }, 'Uploaded. They are notified.');
      } catch (err) { toast(err.message); if (btn) { btn.disabled = false; btn.textContent = 'Upload'; } }
    });
  }

  return { render, bind, derivedNeeds };
})();
