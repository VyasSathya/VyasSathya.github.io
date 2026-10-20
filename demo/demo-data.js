// /demo: the real client portal running on a fictional renovation project. Everything happens in
// this tab; nothing is sent anywhere and a reload starts over.
(() => {
  const now = Date.now();
  const at = days => new Date(now - days * 864e5).toISOString();
  const on = days => new Date(now + days * 864e5).toISOString().slice(0, 10);
  const id = (() => { let n = 0; return p => `${p}-${++n}`; })();
  const pid = 'alder-kitchen';

  const ms = [
    { id: 'm1', seq: 1, title: 'Design and selections', outcome: 'Layout, cabinets, counters and fixtures chosen and signed off.', due_on: on(-30), amount_cents: 450000, state: 'accepted', accepted_at: at(31), accepted_by: 'client', pay_state: 'paid', paid_at: at(30) },
    { id: 'm2', seq: 2, title: 'Demolition and rough-in', outcome: 'Old kitchen out; plumbing and electrical rough-in passed inspection.', due_on: on(-9), amount_cents: 1200000, state: 'accepted', accepted_at: at(9), accepted_by: 'client', pay_state: 'paid', paid_at: at(8) },
    { id: 'm3', seq: 3, title: 'Cabinets and counters', outcome: 'Cabinets installed and level; quartz counters templated, installed and sealed; sink set.', due_on: on(3), amount_cents: 1500000, state: 'in_review', review_opened_at: at(1), review_due_at: new Date(now + 6 * 864e5).toISOString(), pay_state: 'due', invoice_url: 'https://vyasapps.dev/demo/#pay' },
    { id: 'm4', seq: 4, title: 'Finishes and walkthrough', outcome: 'Backsplash, paint, lighting, appliances; final walkthrough and punch list closed.', due_on: on(18), amount_cents: 650000, state: 'planned', pay_state: 'none' },
  ].map(m => ({ project_id: pid, kind: 'milestone', currency: 'usd', invoice_url: '', review_opened_at: null, review_due_at: null, accepted_at: null, accepted_by: null, paid_at: null, ...m }));

  const items = [
    ['m1', 'Layout drawings', true], ['m1', 'Cabinet style and color', true], ['m1', 'Counter and sink', true], ['m1', 'Fixtures and lighting', true],
    ['m2', 'Demolition and haul-away', true], ['m2', 'Plumbing rough-in', true], ['m2', 'Electrical rough-in', true], ['m2', 'Inspection passed', true],
    ['m3', 'Base cabinets installed', true], ['m3', 'Wall cabinets installed', true], ['m3', 'Counters templated', true], ['m3', 'Counters installed', true], ['m3', 'Sink and faucet set', true],
    ['m4', 'Backsplash tile choice', false, 'client'], ['m4', 'Backsplash installed', false], ['m4', 'Paint', false], ['m4', 'Appliances installed', false], ['m4', 'Final walkthrough', false],
  ].map(([m, title, done, w], i) => ({ id: 'i' + i, milestone_id: m, title, done, done_at: done ? at(12 - i * 0.5) : null, waiting_on: w || 'none', waiting_since: w ? on(-2) : null, sort: i }));
  // Tile choice is asked now even though its milestone is next, so it shows as waiting.
  items.push({ id: 'i-tile', milestone_id: 'm3', title: 'Send a photo of the outlet you want moved', done: false, done_at: null, waiting_on: 'client', waiting_since: on(-2), sort: 99 });

  const data = {
    role: 'client', label: 'Maya Chen', seen_at: at(3), push_key: '', prefs: {},
    projects: [{ id: pid, title: 'Kitchen remodel, 1820 Alder St', client_name: 'Harbor & Pine Renovation', summary: 'Full kitchen remodel: new layout, cabinets, quartz counters and lighting.', site_url: '', preview_url: '', status: 'active', check_in_day: 'Friday' }],
    milestones: ms,
    items,
    updates: [
      { id: 'u1', project_id: pid, created_at: at(1), done: '- Counters installed and sealed\n- Sink and faucet set\n- Cabinet doors adjusted', next: '- Backsplash after your tile pick\n- Paint starts Monday', needs: '- Backsplash tile choice by Thursday, or paint and tile swap order\n- Photo of the outlet you want moved', decisions: '- Hardware finish (see Decisions)', preview_url: '', video_url: 'https://vyasapps.dev/demo/#video' },
      { id: 'u2', project_id: pid, created_at: at(8), done: '- Rough-in inspection passed\n- Drywall patched', next: '- Cabinets arrive Tuesday', needs: '', decisions: '', preview_url: '', video_url: '' },
      { id: 'u3', project_id: pid, created_at: at(15), done: '- Demolition finished\n- Old flooring removed', next: '- Plumbing and electrical rough-in', needs: '', decisions: '', preview_url: '', video_url: '' },
    ],
    messages: [
      { id: 'g1', project_id: pid, milestone_id: null, kind: 'comment', author: 'vyas', body: 'Counters are in. Have a look at the photos in today\'s check-in and approve when you are happy.', created_at: at(1) },
      { id: 'g2', project_id: pid, milestone_id: null, kind: 'comment', author: 'client', body: 'They look great. Can the outlet by the window move left a few inches?', created_at: at(0.6) },
      { id: 'g3', project_id: pid, milestone_id: null, kind: 'comment', author: 'vyas', body: 'Yes. Send me a photo marked where you want it and we will do it with the backsplash.', created_at: at(0.5) },
    ],
    asks: [
      { id: 'a1', project_id: pid, question: 'Cabinet hardware finish', detail: 'All three are on the sample board in the garage.', choices: ['Brushed brass', 'Matte black', 'Satin nickel'], due_on: on(2), answer: null, answer_note: '', answered_at: null, created_at: at(1), closed: false },
      { id: 'a2', project_id: pid, question: 'Counter edge profile', detail: '', choices: ['Eased', 'Mitered'], due_on: null, answer: 'Eased', answer_note: '', answered_at: at(20), created_at: at(22), closed: false },
    ],
    notices: [
      { id: 'n1', project_id: pid, kind: 'review', title: 'Ready for your review: Cabinets and counters', body: '', created_at: at(1) },
      { id: 'n2', project_id: pid, kind: 'checkin', title: 'New check-in: something needs you', body: '', created_at: at(1) },
      { id: 'n3', project_id: pid, kind: 'ask', title: 'Decision needed: Cabinet hardware finish', body: '', created_at: at(1) },
      { id: 'n4', project_id: pid, kind: 'invoice', title: 'Invoice ready: Cabinets and counters', body: '', created_at: at(1) },
    ],
    devices: 0,
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  const P = PORTAL;
  P.takeKey = () => 'demo';
  P.forget = () => {};
  P.registerWorker = async () => null;
  P.refreshSubscription = async () => {};
  P.renderPhoneCard = host => { host.hidden = true; };
  P.api = async (op, b = {}) => {
    await new Promise(r => setTimeout(r, 120));
    const m = b.milestone_id && data.milestones.find(x => x.id === b.milestone_id);
    switch (op) {
      case 'view': return clone(data);
      case 'seen': case 'prefs': return { ok: true };
      case 'approve':
        Object.assign(m, { state: 'accepted', accepted_by: 'client', accepted_at: new Date().toISOString() });
        data.messages.unshift({ id: id('g'), project_id: pid, kind: 'approve', author: 'client', body: '', created_at: new Date().toISOString() });
        data.milestones.find(x => x.id === 'm4').state = 'active';
        return { ok: true };
      case 'request_changes':
        if (!(b.body || '').trim()) throw new Error('Say what needs to change.');
        m.state = 'changes_requested';
        data.messages.unshift({ id: id('g'), project_id: pid, kind: 'changes', author: 'client', body: b.body, created_at: new Date().toISOString() });
        return { ok: true };
      case 'message':
        if (!(b.body || '').trim()) throw new Error('Write a message first.');
        data.messages.unshift({ id: id('g'), project_id: pid, kind: 'comment', author: 'client', body: b.body, created_at: new Date().toISOString() });
        setTimeout(() => {
          data.messages.unshift({ id: id('g'), project_id: pid, kind: 'comment', author: 'vyas', body: 'Got it. (In a real portal this reply comes from the business, and you get a notification on your phone.)', created_at: new Date().toISOString() });
          document.dispatchEvent(new Event('portal:refresh'));
        }, 1600);
        return { ok: true };
      case 'answer_ask': {
        const a = data.asks.find(x => x.id === b.id);
        Object.assign(a, { answer: b.answer || null, answer_note: b.note || '', answered_at: new Date().toISOString() });
        return { ok: true };
      }
    }
    throw new Error('Not available in the demo.');
  };

  // Pay and video links stay on the page in the demo.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="/demo/#"]'); if (!a) return;
    e.preventDefault();
    P.toast(a.href.endsWith('#pay') ? 'In a real portal this opens a secure Stripe invoice.' : 'In a real portal this plays the walkthrough video.');
  });
})();
