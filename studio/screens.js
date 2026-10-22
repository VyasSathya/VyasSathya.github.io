// Studio: the industry screens a client sees on a project (portal/modules.js). Pick a business type to
// start from its template (demo/templates.js), then edit each screen: add a stage, a doc request, an
// estimate line, change who it is waiting on. Edits stay in a draft until Save; the save carries the rev
// the draft started from, so a client action that landed in between is never overwritten.
const STUDIO_SCREENS = (() => {
  const P = PORTAL, { esc, money, day } = P;
  const T = typeof DEMO_TEMPLATES !== 'undefined' ? DEMO_TEMPLATES : {};
  const clone = o => JSON.parse(JSON.stringify(o));
  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), x => (x % 36).toString(36)).join('');

  // field: [key, label, kind]; kind is text (default), area, number, money (cents), date, url, urls, bool, or a list of options
  const TITLE = ['title', 'Title'];
  const S = {
    needs: { name: 'Needs you', hint: 'Filled in from the other screens. Add a line only for something else.', fields: [TITLE], lists: { items: [['kind', 'Word'], ['title', 'What']] } },
    stages: { name: 'Stages', fields: [TITLE, ['note', 'Note under the stages', 'area']], lists: { steps: [['t', 'Stage'], ['state', 'State', [['done', 'Done'], ['now', 'Now'], ['next', 'Next']]], ['who', 'Who'], ['date', 'When'], ['note', 'Note on the current stage']] } },
    estimate: { name: 'Estimate', fields: [TITLE, ['ref', 'Reference'], ['intro', 'Intro', 'area'], ['actionLabel', 'Button word'], ['doneLabel', 'Done word'], ['totalLabel', 'Total label']],
      lists: { items: [['t', 'Line'], ['price', 'Price', 'money'], ['sev', 'Group', [['red', 'Needs attention now'], ['yellow', 'Can wait'], ['green', 'Checked, no charge']]], ['note', 'Detail'], ['img', 'Photo link', 'url']] } },
    photos: { name: 'Photo timeline', fields: [TITLE], lists: { posts: [['date', 'Date', 'date'], ['who', 'Who'], ['caption', 'Caption'], ['imgs', 'Photo links, one per line', 'urls']] } },
    proof: { name: 'Proof and revisions', fields: [TITLE, ['file', 'What it is'], ['version', 'Version'], ['round', 'Round', 'number'], ['rounds', 'Rounds included', 'number'], ['length', 'Length'], ['url', 'Link to watch or open', 'url'], ['atLabel', 'Note label (Where, Page, Time)'], ['atHint', 'Note hint (0:41, Home page)'], ['note', 'Note', 'area']],
      lists: { comments: [['at', 'At'], ['t', 'Note'], ['done', 'Fixed', 'bool']] } },
    gallery: { name: 'Gallery picks', fields: [TITLE, ['limit', 'How many they pick', 'number'], ['show', 'Tiles when there are no pictures', 'number'], ['note', 'Note', 'area']], lists: { items: [['t', 'Label'], ['url', 'Picture link', 'url']] } },
    docs: { name: 'Files and documents', fields: [TITLE], lists: { items: [['t', 'What we need'], ['why', 'Why or what format'], ['state', 'State', [['needed', 'Needed'], ['received', 'Received'], ['accepted', 'Accepted'], ['na', 'Does not apply']]]] } },
    sign: { name: 'Sign', fields: [TITLE], lists: { items: [['t', 'Document'], ['url', 'Link to read it', 'url'], ['by', 'Sign by', 'date']] } },
    schedule: { name: 'Schedule', fields: [TITLE], lists: { items: [['when', 'When'], ['what', 'What'], ['who', 'Who']] } },
    countdown: { name: 'Countdown', fields: [['to', 'Counting down to'], ['date', 'Date', 'date']], lists: { checklist: [['t', 'Checklist item'], ['due', 'Due', 'date']], budget: [['vendor', 'Vendor'], ['total', 'Total', 'money'], ['paid', 'Paid', 'money'], ['due', 'Next payment', 'date']] } },
    sessions: { name: 'Sessions', fields: [TITLE, ['total', 'Total', 'number'], ['used', 'Used', 'number'], ['unit', 'Unit'], ['next', 'Next'], ['cta', 'Button word'], ['book_url', 'Booking link', 'url'], ['homeworkLabel', 'Homework label'], ['notesLabel', 'Notes label'], ['notes', 'Notes', 'area']],
      lists: { homework: [['t', 'Task'], ['done', 'Done', 'bool']] } },
    tickets: { name: 'Requests', fields: [TITLE], lists: { items: [['t', 'Request'], ['who', 'Who'], ['state', 'State']] } },
    schools: { name: 'Schools', fields: [TITLE], lists: { items: [['school', 'School'], ['round', 'Round'], ['deadline', 'Deadline', 'date'], ['status', 'Status']] } },
    itinerary: { name: 'Itinerary', fields: [TITLE], lists: {} },
  };
  const ROW_NAME = { items: 'line', steps: 'stage', posts: 'post', comments: 'note', checklist: 'item', budget: 'vendor', homework: 'task' };

  let draft = null, draftFor = null, draftRev = null, dirty = false;

  function sync(p) {
    if (draftFor !== p.id || !dirty) { draft = clone(p.modules || []); draftFor = p.id; draftRev = p.modules_rev || 0; dirty = false; }
  }

  // ---------- seeding from a template ----------
  function seed(key, p) {
    const t = T[key]; if (!t || !t.modules) return [];
    const today = Date.now(), on = d => new Date(today + d * 864e5).toISOString().slice(0, 10);
    const dates = o => { if (Array.isArray(o)) return o.map(dates); if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = ['due', 'by', 'date', 'deadline'].includes(k) && typeof o[k] === 'number' ? on(o[k]) : dates(o[k]); } return o; };
    const biz = p.client_name || p.title;
    const mods = dates(JSON.parse(JSON.stringify(t.modules).replaceAll('{biz}', biz.replace(/["\\]/g, ''))));
    // Keep the structure of each screen; clear anything that would claim the client already did something.
    for (const m of mods) {
      m.id = rid();
      if (m.type === 'needs') m.items = (m.items || []).filter(x => !x.go);
      if (m.type === 'stages') m.steps = (m.steps || []).map((s, i) => ({ t: s.t, who: s.who || '', state: i ? 'next' : 'now' }));
      if (m.type === 'estimate') { delete m.authorized; m.items.forEach(l => delete l.pick); }
      if (m.type === 'docs') m.items.forEach(d => { d.state = 'needed'; });
      if (m.type === 'sign') m.items.forEach(s => { delete s.signed; });
      if (m.type === 'proof') { m.comments = []; m.approved = false; m.round = 1; m.version = 'v1'; }
      if (m.type === 'gallery') { delete m.picked; m.picks = []; m.sent = false; }
      if (m.type === 'photos' || m.type === 'tickets') { m.posts && (m.posts = []); m.items && (m.items = []); }
      if (m.type === 'sessions') m.used = 0;
      if (m.type === 'countdown') (m.budget || []).forEach(b => { b.paid = 0; });
      for (const k of Object.keys(ROW_NAME)) if (Array.isArray(m[k])) m[k].forEach(r => { if (r && typeof r === 'object' && !Array.isArray(r)) r.id = rid(); });
    }
    return mods;
  }

  // ---------- view ----------
  function typeSelect(cur) {
    const groups = {};
    for (const [k, t] of Object.entries(T)) (groups[t.group || 'Other'] = groups[t.group || 'Other'] || []).push([k, t.label]);
    return `<select name="btype"><option value="">Pick the kind of business</option>${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.sort((a, b) => a[1].localeCompare(b[1])).map(([k, l]) => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select>`;
  }

  function view(p) {
    sync(p);
    const t = T[p.business_type];
    if (!draft.length) return `<div class="card"><p class="note" style="margin-top:0">Start from the screens this kind of business's clients use, then change anything.</p>
      <form data-seed="${esc(p.id)}"><label class="f">Business type</label>${typeSelect(p.business_type)}
      <div class="actions"><button class="btn primary" type="submit">Set up screens</button></div></form></div>`;
    return `<p class="count" style="margin:-.4rem 0 1rem">${t ? esc(t.label) : 'Custom'} &middot; ${draft.filter(m => !m.hidden).length} of ${draft.length} screen${draft.length === 1 ? '' : 's'} shown${p.kind === 'client' ? ' to the client' : ''}</p>
      <div class="screens">${draft.map((m, i) => card(p, m, i)).join('')}</div>
      <div class="scr-save" data-scr-bar ${dirty ? '' : 'hidden'}><span class="chip wait">Not saved</span><span class="actions" style="margin:0"><button class="btn small ghost" type="button" data-scr-discard>Discard</button><button class="btn small primary" type="button" data-scr-save>Save screens</button></span></div>
      <div class="add scr-add"><select data-scr-newtype><option value="">Add a screen</option>${Object.entries(S).map(([k, s]) => `<option value="${k}">${esc(s.name)}</option>`).join('')}</select><button class="btn small" type="button" data-scr-addmod>Add</button></div>
      <details class="edit" data-k="scr-preview"><summary>See it as the client</summary><div class="scr-preview" inert>${typeof PORTAL_MODULES !== 'undefined' ? PORTAL_MODULES.render(draft, { live: true }) : ''}</div></details>
      <details class="edit" data-k="scr-retype"><summary>Start over from a business type</summary><form data-seed="${esc(p.id)}" data-replace="1">${typeSelect(p.business_type)}
        <div class="actions"><button class="btn" type="submit">Replace all screens</button></div></form></details>`;
  }

  // One line of what the client has done on this screen.
  function status(m) {
    const items = (m.items || []).filter(x => !x.hidden);
    if (m.type === 'docs') { const n = items.filter(d => (d.state || 'needed') !== 'needed').length; return n ? `${n} of ${items.length} in` : `${items.length} asked`; }
    if (m.type === 'sign') { const n = items.filter(s => s.signed).length; return `${n} of ${items.length} signed`; }
    if (m.type === 'estimate') return m.authorized ? `Authorized ${money(m.authorized_total)}${m.authorized_at ? ' ' + day(m.authorized_at) : ''}` : `${items.filter(l => l.pick === true).length} approved, ${items.filter(l => l.pick === false).length} declined`;
    if (m.type === 'proof') return m.approved ? `${esc(m.version || '')} approved${m.approved_at ? ' ' + day(m.approved_at) : ''}` : `${esc(m.version || '')} &middot; ${(m.comments || []).filter(c => !c.done).length} open notes`;
    if (m.type === 'gallery') return m.sent ? `${(m.picks || []).length} picks sent` : `${(m.picks || []).length} of ${m.limit || '?'} picked`;
    if (m.type === 'stages') { const now = (m.steps || []).find(s => s.state === 'now'); return now ? 'Now: ' + esc(now.t) : ''; }
    return '';
  }

  function card(p, m, i) {
    const s = S[m.type] || { name: m.type, fields: [TITLE], lists: {} };
    const st = status(m);
    const clientDid = (m.type === 'docs' || m.type === 'sign') && (m.items || []).some(x => x.state === 'received' || x.state === 'na' || x.signed);
    return `<details class="card scr" data-k="scr-${esc(m.id)}"><summary><div class="row"><span class="sum-title">${esc(m.title || m.to || s.name)}</span>
        <span>${m.hidden ? '<span class="chip">Hidden</span> ' : ''}${st ? `<span class="chip ${/approved|Authorized|sent|in$/.test(st) || clientDid ? 'go' : ''}">${st}</span>` : ''}</span></div>
        ${(m.title || m.to) && (m.title || m.to) !== s.name ? `<div class="sum-meta"><span>${esc(s.name)}</span></div>` : ''}</summary>
      <div class="body" data-mod="${esc(m.id)}">
        ${s.hint ? `<p class="note" style="margin-top:0">${esc(s.hint)}</p>` : ''}
        <div class="grid2">${s.fields.map(f => field(f, m[f[0]], `f:${f[0]}`)).join('')}</div>
        ${Object.entries(s.lists).map(([lk, cols]) => listEditor(m, lk, cols)).join('')}
        ${extras(m)}
        <details class="edit" data-k="scr-json-${esc(m.id)}"><summary>Edit as data</summary><textarea class="mono" data-scr-json rows="8">${esc(JSON.stringify(m, null, 1))}</textarea>
          <div class="actions"><button class="btn small" type="button" data-scr-applyjson>Apply</button></div></details>
        <div class="actions">
          <label class="check" style="margin:0"><input type="checkbox" data-scr-hide ${m.hidden ? 'checked' : ''}> Hidden from client</label>
          <button class="btn small ghost" type="button" data-scr-move="-1" ${i ? '' : 'disabled'}>Move up</button>
          <button class="btn small ghost" type="button" data-scr-move="1" ${i < draft.length - 1 ? '' : 'disabled'}>Move down</button>
          <button class="btn small ghost" type="button" data-scr-delmod>Delete screen</button>
        </div>
      </div></details>`;
  }

  function field([k, label, kind], v, name, compact) {
    const id = 'x' + rid();
    const lab = compact ? `aria-label="${esc(label)}" placeholder="${esc(label)}"` : `id="${id}"`;
    const wrap = h => compact ? h : `<div><label class="f" for="${id}">${esc(label)}</label>${h}</div>`;
    if (Array.isArray(kind)) {
      const opts = kind.map(o => Array.isArray(o) ? o : [o, o]), cur = String(v ?? opts[0][0]);
      return wrap(`<select name="${name}" ${lab}>${opts.map(([val, text]) => `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>`);
    }
    if (kind === 'bool') return `<label class="check" style="margin:0"><input type="checkbox" name="${name}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
    if (kind === 'area') return wrap(`<textarea name="${name}" ${lab}>${esc(v ?? '')}</textarea>`);
    if (kind === 'urls') return wrap(`<textarea name="${name}" ${lab} rows="2">${esc((v || []).join('\n'))}</textarea>`);
    const type = { number: 'number', money: 'number', date: 'date', url: 'url' }[kind] || 'text';
    const val = kind === 'money' ? (v != null && v !== '' ? v / 100 : '') : v ?? '';
    return wrap(`<input type="${type}" name="${name}" ${lab} value="${esc(val)}" ${kind === 'money' ? 'min="0" step="0.01"' : ''} ${kind === 'number' ? 'min="0"' : ''}>`);
  }

  function listEditor(m, lk, cols) {
    const rows = m[lk] || [];
    return `<p class="block-title" style="margin-top:1.4rem">${esc({ items: 'Lines', steps: 'Stages', posts: 'Posts', comments: 'Notes', checklist: 'Checklist', budget: 'Budget', homework: 'Homework' }[lk] || lk)}</p>
      <ul class="scr-rows">${rows.map(r => `<li data-row="${esc(r.id)}" data-list="${lk}" class="${r.hidden ? 'off' : ''}">
        <div class="scr-cells">${cols.map(c => field(c, r[c[0]], `r:${c[0]}`, true)).join('')}</div>
        ${clientState(m, r)}
        <span class="ctl"><button class="mini ${r.hidden ? '' : 'on'}" type="button" data-scr-rowvis>${r.hidden ? 'Hidden' : 'Shown'}</button><button class="mini" type="button" data-scr-rowdel aria-label="Delete">&times;</button></span>
      </li>`).join('')}</ul>
      <button class="btn small ghost" type="button" data-scr-addrow="${lk}">+ Add ${ROW_NAME[lk] || 'line'}</button>`;
  }

  // What the client did on a row: their file or link, their signature, their approve/decline.
  function clientState(m, r) {
    const bits = [];
    if (r.file) bits.push(`<button class="btn small" type="button" data-scr-file="${esc(r.id)}">Open ${esc(r.file.name)}</button>`);
    if (r.link) bits.push(`<a class="btn small" href="${P.safeUrl(r.link)}" target="_blank" rel="noopener">Open link</a>`);
    if (r.state === 'na' && r.na_note) bits.push(`<span class="count">Does not apply: ${esc(r.na_note)}</span>`);
    if (r.sent_at) bits.push(`<span class="count">${r.state === 'na' ? 'Marked not applicable' : 'Sent'} ${day(r.sent_at)}</span>`);
    if (r.signed) bits.push(`<span class="chip go">Signed by ${esc(r.signed_name || '')} ${day(r.signed_at)}</span> <button class="btn small ghost" type="button" data-scr-unsign>Ask again</button>`);
    if (m.type === 'estimate' && r.pick != null) bits.push(`<span class="chip ${r.pick ? 'go' : 'wait'}">Client ${r.pick ? 'approved' : 'declined'}</span>`);
    if (m.type === 'proof' && r.by === 'client') bits.push(`<span class="count">From the client ${day(r.created_at)}</span>`);
    return bits.length ? `<div class="scr-client">${bits.join(' ')}</div>` : '';
  }

  function extras(m) {
    if (m.type === 'proof') return `<div class="actions"><button class="btn small" type="button" data-scr-nextver>Send a new version</button>${m.approved ? `<button class="btn small ghost" type="button" data-scr-reopen>Reopen approval</button>` : ''}</div>`;
    if (m.type === 'estimate' && m.authorized) return `<div class="actions"><button class="btn small ghost" type="button" data-scr-reopen>Reopen for approval</button></div>`;
    if (m.type === 'gallery' && m.sent) return `<p class="count">Picks: ${(m.picks || []).map(esc).join(', ')}</p><div class="actions"><button class="btn small ghost" type="button" data-scr-reopen>Let them pick again</button></div>`;
    return '';
  }

  // ---------- editing the draft ----------
  const modOf = el => draft.find(m => m.id === el.closest('[data-mod]')?.dataset.mod);
  const rowOf = (m, el) => { const li = el.closest('[data-row]'); return li && (m[li.dataset.list] || []).find(r => r.id === li.dataset.row); };
  function kindOf(m, el, key, inRow) {
    const s = S[m.type]; if (!s) return 'text';
    const cols = inRow ? s.lists[el.closest('[data-row]').dataset.list] || [] : s.fields;
    return (cols.find(c => c[0] === key) || [])[2];
  }
  function read(el, kind) {
    if (el.type === 'checkbox') return el.checked;
    const v = el.value;
    if (kind === 'money') return v === '' ? null : Math.round(parseFloat(v) * 100);
    if (kind === 'number') return v === '' ? null : Number(v);
    if (kind === 'urls') return v.split('\n').map(x => x.trim()).filter(Boolean);
    return v;
  }
  function onInput(e) {
    const el = e.target; if (!el.name || !el.closest('[data-mod]')) return false;
    const m = modOf(el); if (!m) return false;
    const [scope, key] = el.name.split(':');
    if (scope === 'f') { const k = kindOf(m, el, key, false); m[key] = read(el, k); }
    else if (scope === 'r') { const r = rowOf(m, el); if (!r) return false; r[key] = read(el, kindOf(m, el, key, true)); }
    else return false;
    markDirty(); return true;
  }
  function markDirty() {
    if (dirty) return;
    dirty = true;
    document.querySelector('[data-scr-bar]')?.removeAttribute('hidden');
  }

  async function save(p, ctx, opts = {}) {
    const r = await ctx.act(() => P.api('save_modules', { project_id: p.id, modules: draft, rev: draftRev, ...opts }), opts.quiet ? 'Screens set up' : 'Saved');
    if (r && r.ok) { dirty = false; draftFor = null; ctx.render(); }
    return r;
  }

  // Returns true when the click was a screens control.
  function onClick(e, p, ctx) {
    const t = e.target.closest('button'); if (!t) return false;
    const d = t.dataset;
    const m = t.closest('[data-mod]') ? modOf(t) : null;
    const redraw = () => { markDirty(); ctx.render(); };
    if ('scrSave' in d) { save(p, ctx); return true; }
    if ('scrDiscard' in d) { dirty = false; draftFor = null; ctx.render(); return true; }
    if ('scrAddmod' in d) {
      const type = document.querySelector('[data-scr-newtype]').value; if (!type) return true;
      const base = { id: rid(), type, title: S[type].name };
      for (const lk of Object.keys(S[type].lists)) base[lk] = [];
      if (type === 'proof') Object.assign(base, { version: 'v1', round: 1, rounds: 2, comments: [] });
      if (type === 'gallery') Object.assign(base, { limit: 10, picks: [] });
      if (type === 'countdown') Object.assign(base, { to: 'the date', date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) });
      if (type === 'sessions') Object.assign(base, { total: 10, used: 0 });
      if (type === 'itinerary') base.days = [];
      draft.push(base); ctx.open('scr-' + base.id); redraw(); return true;
    }
    if (!m) return false;
    if (d.scrAddrow) { const row = { id: rid() }; if (d.scrAddrow === 'steps') row.state = 'next'; if (m.type === 'docs') row.state = 'needed'; if (m.type === 'estimate') row.sev = 'red'; (m[d.scrAddrow] = m[d.scrAddrow] || []).push(row); ctx.open('scr-' + m.id); redraw(); return true; }
    if ('scrRowdel' in d) { const li = t.closest('[data-row]'); m[li.dataset.list] = m[li.dataset.list].filter(r => r.id !== li.dataset.row); redraw(); return true; }
    if ('scrRowvis' in d) { const r = rowOf(m, t); r.hidden = !r.hidden; if (!r.hidden) delete r.hidden; redraw(); return true; }
    if ('scrUnsign' in d) { const r = rowOf(m, t); for (const k of ['signed', 'signed_name', 'signed_at', 'signed_by']) delete r[k]; redraw(); return true; }
    if ('scrDelmod' in d) { if (!confirm('Delete this screen? Whatever the client did on it goes too.')) return true; draft = draft.filter(x => x !== m); redraw(); return true; }
    if (d.scrMove) { const i = draft.indexOf(m), j = i + Number(d.scrMove); if (j < 0 || j >= draft.length) return true; [draft[i], draft[j]] = [draft[j], draft[i]]; redraw(); return true; }
    if ('scrNextver' in d) {
      const n = (parseInt(String(m.version || '').replace(/\D/g, ''), 10) || 0) + 1;
      Object.assign(m, { version: 'v' + n, round: (Number(m.round) || 1) + 1, approved: false });
      for (const k of ['approved_at', 'approved_by', 'approved_version']) delete m[k];
      redraw(); return true;
    }
    if ('scrReopen' in d) {
      for (const k of ['approved', 'approved_at', 'approved_by', 'approved_version', 'authorized', 'authorized_at', 'authorized_by', 'authorized_total', 'sent', 'sent_at', 'sent_by']) delete m[k];
      redraw(); return true;
    }
    if ('scrApplyjson' in d) {
      try { const v = JSON.parse(t.closest('details').querySelector('[data-scr-json]').value); if (!v || v.type !== m.type) throw new Error('Keep the same type.'); v.id = m.id; draft[draft.indexOf(m)] = v; redraw(); }
      catch (err) { P.toast('That is not valid: ' + err.message); }
      return true;
    }
    if (d.scrFile) {
      const w = window.open('', '_blank');
      P.api('file_url', { project_id: p.id, module_id: m.id, item_id: d.scrFile }).then(r => { if (w) w.location = r.url; else location.href = r.url; }).catch(err => { if (w) w.close(); P.toast(err.message); });
      return true;
    }
    return false;
  }

  function onChange(e) {
    const el = e.target;
    if (el.matches('[data-scr-hide]')) { const m = modOf(el); m.hidden = el.checked; if (!el.checked) delete m.hidden; markDirty(); return true; }
    return onInput(e);
  }

  function onSubmit(e, p, ctx) {
    const f = e.target; if (!f.dataset.seed) return false;
    const key = f.querySelector('[name=btype]').value;
    if (!key) { P.toast('Pick a business type.'); return true; }
    if (f.dataset.replace && !confirm('Replace every screen on this project with the template? What the client did on them is lost.')) return true;
    sync(p);
    draft = seed(key, p);
    save(p, ctx, { quiet: true, business_type: key });
    return true;
  }

  return { view, onClick, onChange, onSubmit, isDirty: () => dirty };
})();
