// /demo/owner.html: the owner's studio for a sample business. Same template as the client demo, with
// four client projects at different stages. Everything happens in this tab; nothing is sent anywhere.
(() => {
  const P = PORTAL;
  const q = new URLSearchParams(location.search);
  if (q.get('embed')) document.documentElement.classList.add('embed');
  let data = null;
  const CLIENTS = ['The Garcias', 'Ben Alvarez', 'Nina Shah', 'Rosa Martin'];

  function build(type, bizName) {
    const t = demoTemplate(type) || demoTemplate('kitchen-bath-remodel');
    const biz = (bizName || '').trim().slice(0, 60) || (t.biz === '{biz}' ? 'Your business' : t.biz);
    const now = Date.now(), at = d => new Date(now - d * 864e5).toISOString(), on = d => new Date(now + d * 864e5).toISOString().slice(0, 10);
    const out = { role: 'owner', owner_name: biz, seen_at: at(1), push_key: '', me: 'me', prefs: {}, devices: [], syncs: [], projects: [], milestones: [], items: [], updates: [], messages: [], asks: [], notices: [], links: [] };
    // stage = index of the current milestone; review = that milestone is waiting on the client's review
    const plan = [
      { person: t.person, title: t.project, stage: 2, review: true },
      { person: CLIENTS[0], title: `${t.label}: ${CLIENTS[0]}`, stage: 0, review: false },
      { person: CLIENTS[1], title: `${t.label}: ${CLIENTS[1]}`, stage: 3, review: false },
      { person: CLIENTS[2], title: `${t.label}: ${CLIENTS[2]}`, stage: 1, review: false },
    ];
    plan.forEach((p, k) => {
      const pid = 'p' + k;
      out.projects.push({ id: pid, title: p.title, kind: 'client', client_name: p.person, summary: t.summary, site_url: '', preview_url: '', status: 'active', check_in_day: 'Friday', sources: {}, signals: {}, owner_notes: '', sort: k, created_at: at(40), updated_at: at(1) });
      t.ms.forEach(([title, outcome, amount, list], i) => {
        const mid = `${pid}m${i}`, past = i < p.stage, cur = i === p.stage;
        out.milestones.push({ id: mid, project_id: pid, seq: i + 1, kind: 'milestone', title, outcome, amount_cents: amount, currency: 'usd', due_on: on((i - p.stage) * 10 + 4), client_visible: true,
          state: past ? 'accepted' : cur ? (p.review ? 'in_review' : 'active') : 'planned', accepted_by: past ? 'client' : null, accepted_at: past ? at((p.stage - i) * 10) : null,
          review_opened_at: cur && p.review ? at(1) : null, review_due_at: cur && p.review ? new Date(now + 6 * 864e5).toISOString() : null,
          pay_state: past ? 'paid' : cur && p.review ? 'due' : 'none', invoice_url: cur && p.review ? 'https://vyasapps.dev/demo/#pay' : '', paid_at: past ? at((p.stage - i) * 10 - 1) : null, updated_at: at(1) });
        list.forEach((it, j) => {
          const done = past || (cur && (p.review || j < Math.ceil(list.length / 2)));
          out.items.push({ id: `${mid}i${j}`, milestone_id: mid, title: it, done, done_at: done ? at(12 - j) : null, waiting_on: 'none', waiting_since: null, client_visible: true, source: 'manual', sort: j, created_at: at(30) });
        });
      });
      if (k === 0) out.items.push({ id: 'p0w', milestone_id: 'p0m2', title: t.waiting, done: false, done_at: null, waiting_on: 'client', waiting_since: on(-2), client_visible: true, source: 'manual', sort: 99, created_at: at(2) });
      out.links.push({ id: 'l' + k, role: 'client', label: p.person, project_ids: [pid], created_at: at(40), expires_at: null, revoked_at: null, last_used_at: at(k + 0.2), use_count: 12 });
    });
    const [done, next, needs] = t.checkin;
    out.updates.push({ id: 'u1', project_id: 'p0', created_at: at(1), done, next, needs, decisions: '', preview_url: '', video_url: '', client_visible: true });
    out.asks.push({ id: 'a1', project_id: 'p0', question: t.ask[0], detail: t.ask[2] || '', choices: t.ask[1], due_on: on(2), answer: t.ask[1][0], answer_note: '', answered_at: at(0.1), created_at: at(1), closed: false });
    out.messages.push({ id: 'g1', project_id: 'p0', kind: 'comment', author: 'client', body: t.talk[1], created_at: at(0.3), read_at: null },
      { id: 'g0', project_id: 'p0', kind: 'comment', author: 'vyas', body: t.talk[0], created_at: at(1), read_at: at(1) });
    out.notices.push(
      { id: 'n1', project_id: 'p0', audience: 'owner', kind: 'answered', title: `${t.person} answered: ${t.ask[0]}`, body: t.ask[1][0], created_at: at(0.1) },
      { id: 'n2', project_id: 'p0', audience: 'owner', kind: 'message', title: `Message from ${t.person}`, body: t.talk[1], created_at: at(0.3) },
      { id: 'n3', project_id: 'p2', audience: 'owner', kind: 'approved', title: `${CLIENTS[1]} approved ${t.ms[2][0]}`, body: '', created_at: at(2) },
      { id: 'n4', project_id: 'p3', audience: 'owner', kind: 'waiting', title: `Nudged ${CLIENTS[2]} about 1 item`, body: t.waiting, created_at: at(3) });
    return out;
  }

  data = build(q.get('type') || 'kitchen-bath-remodel', q.get('biz'));
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || !e.data.demo) return;
    data = build(e.data.demo.type, e.data.demo.biz);
    location.hash = '#/';
    document.dispatchEvent(new Event('portal:refresh'));
    scrollTo(0, 0);
  });

  const clone = o => JSON.parse(JSON.stringify(o));
  const stamp = () => new Date().toISOString();
  P.takeKey = () => 'demo';
  P.forget = () => {};
  P.registerWorker = async () => null;
  P.refreshSubscription = async () => {};
  P.renderPhoneCard = host => { host.hidden = true; };
  P.api = async (op, b = {}) => {
    await new Promise(r => setTimeout(r, 100));
    switch (op) {
      case 'view': return clone(data);
      case 'seen': case 'prefs': return { ok: true };
      case 'mark_read': data.messages.forEach(m => { if (m.project_id === b.project_id) m.read_at = m.read_at || stamp(); }); return { ok: true };
      case 'save_item': {
        const it = b.item || {};
        if (it.id) { const x = data.items.find(i => i.id === it.id); Object.assign(x, { done: !!it.done, done_at: it.done ? (x.done_at || stamp()) : null, waiting_on: it.done ? 'none' : (it.waiting_on || 'none'), waiting_since: it.waiting_on && it.waiting_on !== 'none' ? (x.waiting_since || stamp().slice(0, 10)) : null, client_visible: it.client_visible !== false }); }
        else data.items.push({ id: 'n' + Math.random(), milestone_id: it.milestone_id, title: it.title, done: false, done_at: null, waiting_on: 'none', waiting_since: null, client_visible: true, source: 'manual', sort: 500, created_at: stamp() });
        return { ok: true };
      }
      case 'delete_item': data.items = data.items.filter(i => i.id !== b.id); return { ok: true };
      case 'milestone_state': {
        const m = data.milestones.find(x => x.id === b.id), to = b.to;
        if (to === 'in_review') Object.assign(m, { state: 'in_review', review_opened_at: stamp(), review_due_at: new Date(Date.now() + 7 * 864e5).toISOString() });
        else if (to === 'accepted') Object.assign(m, { state: 'accepted', accepted_by: 'owner', accepted_at: stamp() });
        else if (to === 'paid') Object.assign(m, { pay_state: 'paid', paid_at: stamp() });
        else if (to === 'due') Object.assign(m, { pay_state: 'due', paid_at: null });
        else if (to === 'active' || to === 'planned') Object.assign(m, { state: to, accepted_at: null, accepted_by: null });
        return { ok: true };
      }
      case 'message':
        data.messages.unshift({ id: 'g' + Math.random(), project_id: b.project_id, kind: 'comment', author: 'vyas', body: b.body, created_at: stamp(), read_at: stamp() });
        return { ok: true };
      case 'save_update':
        data.updates.unshift({ id: 'u' + Math.random(), created_at: stamp(), ...b.update });
        return { ok: true };
      case 'save_ask':
        data.asks.unshift({ id: 'a' + Math.random(), answer: null, answer_note: '', answered_at: null, created_at: stamp(), closed: false, choices: [], ...b.ask });
        return { ok: true };
      case 'create_link':
        return { ok: true, id: 'demo', role: b.role, token: 'demo-link-' + 'x'.repeat(34) };
    }
    P.toast('This part is turned off in the demo.');
    return { ok: true };
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="/demo/#"]'); if (!a) return;
    e.preventDefault(); P.toast('In a real portal this opens the invoice.');
  });
})();
