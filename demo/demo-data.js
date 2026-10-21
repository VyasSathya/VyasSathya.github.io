// /demo: the real client portal running on a sample project for any kind of business.
// ?type=<template key or free text>&biz=<business name>&embed=1. The offer page can also swap it live
// with postMessage({demo:{type, biz}}). Everything happens in this tab; nothing is sent anywhere.
(() => {
  const P = PORTAL;
  const q = new URLSearchParams(location.search);
  if (q.get('embed')) document.documentElement.classList.add('embed');
  let data = null;

  function build(type, bizName) {
    const t = demoTemplate(type) || demoTemplate('kitchen-bath-remodel');
    const biz = (bizName || '').trim().slice(0, 60) || (t.biz === '{biz}' ? 'Your business' : t.biz);
    const sub = s => String(s).replaceAll('{biz}', biz);
    const now = Date.now(), at = d => new Date(now - d * 864e5).toISOString(), on = d => new Date(now + d * 864e5).toISOString().slice(0, 10);
    const pid = 'demo';
    const states = [
      { state: 'accepted', accepted_by: 'client', accepted_at: at(31), pay_state: 'paid', paid_at: at(30), due_on: on(-30) },
      { state: 'accepted', accepted_by: 'client', accepted_at: at(9), pay_state: 'paid', paid_at: at(8), due_on: on(-9) },
      { state: 'in_review', review_opened_at: at(1), review_due_at: new Date(now + 6 * 864e5).toISOString(), pay_state: 'due', invoice_url: 'https://vyasapps.dev/demo/#pay', due_on: on(3) },
      { state: 'planned', pay_state: 'none', due_on: on(18) },
    ];
    const milestones = t.ms.map(([title, outcome, amount], i) => ({ id: 'm' + i, project_id: pid, seq: i + 1, kind: 'milestone', title, outcome, amount_cents: amount, currency: 'usd', invoice_url: '', review_opened_at: null, review_due_at: null, accepted_at: null, accepted_by: null, paid_at: null, ...states[i] }));
    let n = 0;
    const items = [];
    t.ms.forEach(([, , , list], i) => list.forEach(title => items.push({ id: 'i' + n, milestone_id: 'm' + i, title, done: i < 3, done_at: i < 3 ? at(20 - n) : null, waiting_on: 'none', waiting_since: null, sort: n++ })));
    items.push({ id: 'iw', milestone_id: 'm2', title: t.waiting, done: false, done_at: null, waiting_on: 'client', waiting_since: on(-2), sort: 999 });
    const [done, next, needs] = t.checkin;
    return {
      role: 'client', label: t.person, owner_name: biz, seen_at: at(3), push_key: '', prefs: {}, devices: 0,
      projects: [{ id: pid, title: sub(t.project), client_name: biz, summary: sub(t.summary), site_url: '', preview_url: '', status: 'active', check_in_day: 'Friday',
        modules: t.modules ? datesIn(JSON.parse(JSON.stringify(t.modules)), on) : null }],
      texts: (t.texts || []).map(x => ({ ...x, body: sub(x.body) })),
      milestones, items,
      updates: [
        { id: 'u1', project_id: pid, created_at: at(1), done, next, needs, decisions: `- ${t.ask[0]} (see Decisions)`, preview_url: '', video_url: 'https://vyasapps.dev/demo/#video' },
        { id: 'u2', project_id: pid, created_at: at(8), done: `- ${t.ms[1][0]} finished`, next: `- ${t.ms[2][0]}`, needs: '', decisions: '', preview_url: '', video_url: '' },
      ],
      messages: [
        { id: 'g3', project_id: pid, kind: 'comment', author: 'vyas', body: t.talk[2], created_at: at(0.5) },
        { id: 'g2', project_id: pid, kind: 'comment', author: 'client', body: t.talk[1], created_at: at(0.6) },
        { id: 'g1', project_id: pid, kind: 'comment', author: 'vyas', body: t.talk[0], created_at: at(1) },
      ],
      asks: [
        { id: 'a1', project_id: pid, question: t.ask[0], detail: t.ask[2] || '', choices: t.ask[1], due_on: on(2), answer: null, answer_note: '', answered_at: null, created_at: at(1), closed: false },
        { id: 'a2', project_id: pid, question: t.answered[0], detail: '', choices: [t.answered[1]], due_on: null, answer: t.answered[1], answer_note: '', answered_at: at(20), created_at: at(22), closed: false },
      ],
      notices: [
        { id: 'n1', project_id: pid, kind: 'review', title: `Ready for your review: ${t.ms[2][0]}`, body: '', created_at: at(1) },
        { id: 'n2', project_id: pid, kind: 'ask', title: `Decision needed: ${t.ask[0]}`, body: '', created_at: at(1) },
        { id: 'n3', project_id: pid, kind: 'invoice', title: `Invoice ready: ${t.ms[2][0]}`, body: '', created_at: at(1) },
      ],
    };
  }

  // Day offsets in screen data (due: 3) become real dates relative to today.
  function datesIn(o, on) {
    if (Array.isArray(o)) return o.map(x => datesIn(x, on));
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = ['due', 'by', 'date', 'deadline'].includes(k) && typeof o[k] === 'number' ? on(o[k]) : datesIn(o[k], on); }
    return o;
  }

  // The client's phone starts on the texts this business sends; tapping one opens the screen it is about.
  function lockScreen() {
    document.querySelector('.lock')?.remove();
    if (!data.texts || !data.texts.length || q.get('nolock')) return;
    const now = new Date();
    const el = document.createElement('div');
    el.className = 'lock';
    el.innerHTML = `<div class="clock">${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</div>
      <div class="date">${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      ${data.texts.map(x => `<button type="button" class="text" data-go="${x.go || ''}"><b>${esc(data.owner_name)}<span>${esc(x.ago || 'now')}</span></b><p>${esc(x.body)}</p></button>`).join('')}
      <p class="hint-tap">Tap a message</p>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('.text'); if (!b) return;
      el.remove();
      const target = document.querySelector('#mod-' + b.dataset.go);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    });
    document.body.append(el);
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const brand = () => { const el = document.querySelector('.mark span'); if (el && data) el.textContent = data.owner_name; };
  data = build(q.get('type') || 'kitchen-bath-remodel', q.get('biz'));
  document.addEventListener('DOMContentLoaded', () => { brand(); lockScreen(); });
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || !e.data.demo) return;
    data = build(e.data.demo.type, e.data.demo.biz);
    brand();
    lockScreen();
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
    await new Promise(r => setTimeout(r, 120));
    const pid = 'demo', m = b.milestone_id && data.milestones.find(x => x.id === b.milestone_id);
    switch (op) {
      case 'view': { const v = clone(data); v.projects[0].modules = data.projects[0].modules; return v; }
      case 'seen': case 'prefs': return { ok: true };
      case 'approve':
        Object.assign(m, { state: 'accepted', accepted_by: 'client', accepted_at: stamp(), pay_state: m.pay_state });
        data.messages.unshift({ id: 'g' + Math.random(), project_id: pid, kind: 'approve', author: 'client', body: '', created_at: stamp() });
        data.milestones[3].state = 'active';
        return { ok: true };
      case 'request_changes':
        if (!(b.body || '').trim()) throw new Error('Say what needs to change.');
        m.state = 'changes_requested';
        data.messages.unshift({ id: 'g' + Math.random(), project_id: pid, kind: 'changes', author: 'client', body: b.body, created_at: stamp() });
        return { ok: true };
      case 'message':
        if (!(b.body || '').trim()) throw new Error('Write a message first.');
        data.messages.unshift({ id: 'g' + Math.random(), project_id: pid, kind: 'comment', author: 'client', body: b.body, created_at: stamp() });
        setTimeout(() => {
          data.messages.unshift({ id: 'g' + Math.random(), project_id: pid, kind: 'comment', author: 'vyas', body: 'Got it, thanks. (In a real portal this reply comes from the business, and the client gets a notification on their phone.)', created_at: stamp() });
          document.dispatchEvent(new Event('portal:refresh'));
        }, 1500);
        return { ok: true };
      case 'answer_ask': {
        const a = data.asks.find(x => x.id === b.id);
        Object.assign(a, { answer: b.answer || null, answer_note: b.note || '', answered_at: stamp() });
        return { ok: true };
      }
    }
    throw new Error('Not available in the demo.');
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="/demo/#"]'); if (!a) return;
    e.preventDefault();
    P.toast(a.href.endsWith('#pay') ? 'In a real portal this opens a secure card payment.' : 'In a real portal this plays the walkthrough video.');
  });
})();
