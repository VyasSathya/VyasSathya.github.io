// The screens a client actually opens, by kind of business (from docs/research/flows-*.md):
// needs (what we need from you), stages (where it is, including outside parties), estimate (line items
// with approve/decline), photos (progress timeline), proof (versions and revision rounds), gallery
// (favorites with a limit), docs (requests: upload / does not apply), sign, schedule (who is coming when),
// countdown (date, checklist, budget by vendor), sessions (used vs left, next, homework), tickets,
// itinerary, schools. A project carries `modules` as an ordered list of {type, ...data}.
const PORTAL_MODULES = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = c => c == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
  const day = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const untilDays = d => Math.ceil((new Date(d + 'T12:00:00') - Date.now()) / 864e5);
  const head = (m, extra = '') => `<div class="mod-head"><h2>${esc(m.title)}</h2>${extra}</div>`;
  const R = {};

  R.needs = m => {
    if (!m.items || !m.items.length) return `<section class="mod needs done">${head(m)}<p class="note">Nothing needs you right now.</p></section>`;
    return `<section class="mod needs" id="mod-needs">${head({ title: m.title || 'Needs you' }, `<span class="count">${m.items.length}</span>`)}
      <div class="need-list">${m.items.map((it, i) => `<button type="button" class="need" data-go="${esc(it.go || '')}" data-i="${i}">
        <span class="need-kind">${esc(it.kind)}</span><span class="need-t">${esc(it.title)}</span>
        <span class="need-meta">${[it.amount != null ? money(it.amount) : '', it.due ? 'by ' + day(it.due) : ''].filter(Boolean).join(' &middot; ')}</span></button>`).join('')}</div></section>`;
  };

  R.stages = m => `<section class="mod" id="mod-stages">${head(m)}
    <ol class="stages">${m.steps.map(s => `<li class="st-${s.state}"><span class="dot"></span><div><b>${esc(s.t)}</b>${s.who ? `<span class="who">${esc(s.who)}</span>` : ''}${s.date ? `<span class="when">${esc(s.date)}</span>` : ''}${s.state === 'now' && s.note ? `<p>${esc(s.note)}</p>` : ''}</div></li>`).join('')}</ol>
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;

  R.estimate = m => {
    const groups = [['red', m.redLabel || 'Needs attention now'], ['yellow', m.yellowLabel || 'Can wait'], ['green', m.greenLabel || 'Checked and fine']];
    const lines = m.items.map((it, i) => ({ ...it, i }));
    const total = lines.filter(l => l.pick !== false && l.price && l.sev !== 'green').reduce((s, l) => s + (l.pick ? l.price : 0), 0);
    return `<section class="mod" id="mod-estimate">${head(m, m.ref ? `<span class="count">${esc(m.ref)}</span>` : '')}
      ${m.intro ? `<p class="note" style="margin-top:0">${esc(m.intro)}</p>` : ''}
      ${groups.map(([sev, label]) => { const g = lines.filter(l => (l.sev || 'red') === sev); return g.length ? `<div class="est-group sev-${sev}"><p class="block-title">${esc(label)} <span class="count">${g.length}</span></p>
        ${g.map(l => `<div class="est-line"><div class="est-photo" aria-hidden="true">${esc(l.photo || '')}</div><div class="est-body"><b>${esc(l.t)}</b>${l.note ? `<p>${esc(l.note)}</p>` : ''}</div>
          <div class="est-right">${l.price ? `<span class="est-price">${money(l.price)}</span>` : ''}${sev !== 'green' && l.price ? `<span class="est-pick"><button type="button" data-est="${l.i}" data-v="1" aria-pressed="${l.pick === true}">Approve</button><button type="button" data-est="${l.i}" data-v="0" aria-pressed="${l.pick === false}">Decline</button></span>` : ''}</div></div>`).join('')}</div>` : ''; }).join('')}
      <div class="est-total"><span>${esc(m.totalLabel || 'Approved total')}</span><b>${money(total)}</b></div>
      <button type="button" class="btn primary wide" data-authorize ${total ? '' : 'disabled'}>${m.authorized ? (m.doneLabel || 'Authorized') : `${m.actionLabel || 'Authorize'} ${money(total)}`}</button></section>`;
  };

  R.photos = m => `<section class="mod" id="mod-photos">${head(m)}
    <div class="feed">${m.posts.map(p => `<article><div class="feed-meta"><b>${esc(p.who || '')}</b><span>${esc(p.date)}</span></div><p>${esc(p.caption)}</p>
      <div class="tiles">${Array.from({ length: Math.min(p.n || 3, 4) }, (_, k) => `<div class="tile-ph" aria-hidden="true"><span>${esc((p.tags || [])[k] || '')}</span></div>`).join('')}</div></article>`).join('')}</div></section>`;

  R.proof = m => `<section class="mod" id="mod-proof">${head(m, `<span class="count">Round ${m.round} of ${m.rounds}</span>`)}
    <div class="proof-frame" aria-hidden="true"><span>${esc(m.version)}</span><b>${esc(m.file)}</b>${m.length ? `<i>${esc(m.length)}</i>` : ''}</div>
    ${m.specs ? `<ul class="plain specs">${m.specs.map(s => `<li><span>${esc(s[0])}</span><span>${esc(s[1])}</span></li>`).join('')}</ul>` : ''}
    <div class="comments">${(m.comments || []).map(c => `<p><span class="at">${esc(c.at)}</span>${esc(c.t)}${c.done ? ' <span class="chip go">Fixed</span>' : ''}</p>`).join('')}</div>
    <div class="actions">${m.approved ? '<span class="chip go">Approved</span>' : `<button type="button" class="btn accent" data-proof="approve">Approve ${esc(m.version)}</button><button type="button" class="btn" data-proof="changes">Request changes</button>`}</div>
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;

  R.gallery = m => `<section class="mod" id="mod-gallery">${head(m, `<span class="count" data-picked>${m.picked} of ${m.limit} picked</span>`)}
    <div class="gal">${Array.from({ length: m.show || 12 }, (_, k) => `<button type="button" class="gal-ph" data-pick="${k}" aria-pressed="${k < m.picked}"><span>${k + 1}</span></button>`).join('')}</div>
    ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</section>`;

  R.docs = m => `<section class="mod" id="mod-docs">${head(m, `<span class="count">${m.items.filter(d => d.state !== 'needed').length} of ${m.items.length}</span>`)}
    <ul class="plain docs">${m.items.map((d, i) => `<li><span>${esc(d.t)}${d.why ? `<small>${esc(d.why)}</small>` : ''}</span>${d.state === 'needed' ? `<span class="doc-act"><button type="button" class="btn small" data-doc="${i}">Upload</button><button type="button" class="btn ghost small" data-na="${i}">Does not apply</button></span>` : `<span class="chip ${d.state === 'accepted' ? 'go' : ''}">${{ received: 'Received', accepted: 'Accepted', na: 'Marked not applicable' }[d.state]}</span>`}</li>`).join('')}</ul></section>`;

  R.sign = m => `<section class="mod" id="mod-sign">${head(m)}
    <ul class="plain">${m.items.map((s, i) => `<li><span>${esc(s.t)}${s.by ? `<small>Sign by ${day(s.by)}</small>` : ''}</span>${s.signed ? '<span class="chip go">Signed</span>' : `<button type="button" class="btn small primary" data-sign="${i}">Review and sign</button>`}</li>`).join('')}</ul></section>`;

  R.schedule = m => `<section class="mod" id="mod-schedule">${head(m)}
    <ul class="plain sched">${m.items.map(s => `<li><span class="sched-when">${esc(s.when)}</span><span class="sched-what"><b>${esc(s.what)}</b>${s.who ? `<small>${esc(s.who)}</small>` : ''}</span></li>`).join('')}</ul></section>`;

  R.countdown = m => {
    const n = untilDays(m.date);
    const spent = (m.budget || []).reduce((s, b) => s + b.paid, 0), total = (m.budget || []).reduce((s, b) => s + b.total, 0);
    return `<section class="mod" id="mod-countdown"><div class="cd"><b>${n}</b><span>days until ${esc(m.to)}</span><small>${day(m.date)}</small></div>
      ${m.checklist ? `<p class="block-title">Next on the checklist</p><ul class="plain">${m.checklist.map(c => `<li><span>${esc(c.t)}</span><span class="count">${c.due ? day(c.due) : ''}</span></li>`).join('')}</ul>` : ''}
      ${m.budget ? `<p class="block-title" style="margin-top:1.4rem">Budget <span class="count">${money(spent)} paid of ${money(total)}</span></p><ul class="plain bud">${m.budget.map(b => `<li><span>${esc(b.vendor)}</span><span class="bud-bar"><i style="width:${Math.round(b.paid / b.total * 100)}%"></i></span><span class="count">${money(b.total - b.paid)} left${b.due ? ' &middot; next ' + day(b.due) : ''}</span></li>`).join('')}</ul>` : ''}</section>`;
  };

  R.sessions = m => `<section class="mod" id="mod-sessions">${head(m)}<div class="big-num"><b>${m.total - m.used}</b><span>of ${m.total} ${esc(m.unit || 'sessions')} left</span></div>
    ${m.next ? `<div class="row next-s"><span>Next: <b>${esc(m.next)}</b></span><button type="button" class="btn small" data-book>${esc(m.cta || 'Book next')}</button></div>` : ''}
    ${m.homework ? `<p class="block-title" style="margin-top:1.2rem">${esc(m.homeworkLabel || 'Your homework')}</p><ul class="checks">${m.homework.map(h => `<li class="${h.done ? 'off' : ''}"><span class="tick ${h.done ? 'on' : ''}"></span><span>${esc(h.t)}</span></li>`).join('')}</ul>` : ''}
    ${m.notes ? `<div class="sec"><b>${esc(m.notesLabel || 'Notes from your last session')}</b><p>${esc(m.notes)}</p></div>` : ''}</section>`;

  R.tickets = m => `<section class="mod" id="mod-tickets">${head(m)}<ul class="plain">${m.items.map(t => `<li><span><b>${esc(t.t)}</b><small>${esc(t.who || '')}</small></span><span class="chip ${t.state === 'Resolved' ? 'go' : 'wait'}">${esc(t.state)}</span></li>`).join('')}</ul></section>`;

  R.itinerary = m => `<section class="mod" id="mod-itinerary">${head(m)}${m.days.map(d => `<div class="iti"><p class="block-title">${esc(d.d)}</p><ul class="plain">${d.items.map(x => `<li><span>${esc(x[0])}</span><span class="count">${esc(x[1] || '')}</span></li>`).join('')}</ul></div>`).join('')}</section>`;

  R.schools = m => `<section class="mod" id="mod-schools">${head(m)}<ul class="plain">${m.items.map(s => `<li><span><b>${esc(s.school)}</b><small>${esc(s.round)} &middot; due ${day(s.deadline)}</small></span><span class="chip ${/submitted|admitted/i.test(s.status) ? 'go' : 'wait'}">${esc(s.status)}</span></li>`).join('')}</ul></section>`;

  function render(mods) { return (mods || []).map(m => (R[m.type] ? R[m.type](m) : '')).join(''); }

  // Demo interactions; a real portal would send these to the server.
  function bind(app, getMods, rerender, toast) {
    app.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const mods = getMods() || [];
      const find = t => mods.find(m => m.type === t);
      if (b.dataset.go !== undefined && b.classList.contains('need')) { const el = app.querySelector('#mod-' + b.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (b.dataset.est !== undefined) { const m = find('estimate'); m.items[+b.dataset.est].pick = b.dataset.v === '1'; m.authorized = false; return rerender(); }
      if ('authorize' in b.dataset) { const m = find('estimate'); m.authorized = true; toast('Authorized. The shop is notified and starts the work.'); return rerender(); }
      if (b.dataset.proof) { const m = find('proof'); if (b.dataset.proof === 'approve') { m.approved = true; toast(`${m.version} approved.`); } else { toast(`Round ${m.round} of ${m.rounds}: add your notes in the comments.`); } return rerender(); }
      if (b.dataset.pick !== undefined) { const m = find('gallery'); const on = b.getAttribute('aria-pressed') === 'true'; if (!on && m.picked >= m.limit) return toast(`You can pick ${m.limit}.`); m.picked += on ? -1 : 1; b.setAttribute('aria-pressed', String(!on)); app.querySelector('[data-picked]').textContent = `${m.picked} of ${m.limit} picked`; return; }
      if (b.dataset.doc !== undefined) { find('docs').items[+b.dataset.doc].state = 'received'; toast('Uploaded. They will check it and mark it accepted.'); return rerender(); }
      if (b.dataset.na !== undefined) { find('docs').items[+b.dataset.na].state = 'na'; toast('Sent for them to confirm.'); return rerender(); }
      if (b.dataset.sign !== undefined) { find('sign').items[+b.dataset.sign].signed = true; toast('Signed.'); return rerender(); }
      if ('book' in b.dataset) { toast('In a real portal this opens their booking calendar.'); }
    });
  }

  return { render, bind };
})();
