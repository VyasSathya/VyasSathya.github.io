// Shared by the client portal and the owner studio: key handling, API calls, phone app + push,
// progress math, calendar files and formatting.
const PORTAL = (() => {
  const ENDPOINT = 'https://ihmayqzxqyednchbezya.supabase.co/functions/v1/portfolio-portal';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWF5cXp4cXllZG5jaGJlenlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzcyOTgsImV4cCI6MjA4Mzc1MzI5OH0._xhGhkqoy7AMm7M5dxSHXM_yeP8zVAJG-BaGMICtHFo';
  const KEY_RE = /^[A-Za-z0-9_-]{40,60}$/;
  let memKey = '', slotName = '';

  // The link is the account. #k=<key> is saved on this device (localStorage and a first-party cookie,
  // because an iPhone Home Screen app starts with Safari's cookies but not its localStorage) and is
  // removed from the address bar.
  const cookiePath = () => location.pathname.replace(/[^/]*$/, '');
  function readCookie(slot) { const m = document.cookie.match(new RegExp('(?:^|; )' + slot + '=([^;]+)')); return m ? m[1] : ''; }
  function remember(slot, key) {
    try { localStorage.setItem(slot, key); } catch (e) {}
    document.cookie = `${slot}=${key}; path=${cookiePath()}; max-age=${60 * 60 * 24 * 400}; secure; samesite=strict`;
  }
  function takeKey(slot) {
    slotName = slot;
    const m = location.hash.match(/[#&]k=([A-Za-z0-9_-]{40,60})/);
    if (m) { memKey = m[1]; remember(slot, memKey); history.replaceState(null, '', location.pathname + location.search); }
    if (!memKey) { try { memKey = localStorage.getItem(slot) || ''; } catch (e) {} }
    if (!memKey) { memKey = readCookie(slot); if (memKey) remember(slot, memKey); }
    return KEY_RE.test(memKey) ? memKey : '';
  }
  // Fallback when a device arrives with nothing saved: paste the link that was sent.
  function useLink(text) {
    const m = String(text || '').match(/k=([A-Za-z0-9_-]{40,60})/) || String(text || '').trim().match(/^([A-Za-z0-9_-]{40,60})$/);
    if (!m) return false;
    memKey = m[1]; remember(slotName, memKey); return true;
  }
  function forget(slot) {
    memKey = '';
    try { localStorage.removeItem(slot); } catch (e) {}
    document.cookie = `${slot}=; path=${cookiePath()}; max-age=0; secure; samesite=strict`;
  }

  async function api(op, body = {}) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON, 'x-portal-key': memKey },
      body: JSON.stringify({ op, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Something went wrong. Try again.'); e.status = res.status; throw e; }
    return data;
  }

  // ---------- phone app and notifications ----------
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushCapable = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let installPrompt = null, swReg = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; document.dispatchEvent(new Event('portal:install')); });

  async function registerWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try { swReg = await navigator.serviceWorker.register('sw.js'); } catch (e) { swReg = null; }
    navigator.serviceWorker.addEventListener?.('message', m => { if (m.data?.type === 'refresh') { window.__lastPush = m.data.title; document.dispatchEvent(new Event('portal:refresh')); } });
    return swReg;
  }
  const b64ToBytes = s => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
  function deviceName() {
    if (isIOS) return /iPad/.test(ua) ? 'iPad' : 'iPhone';
    if (/Android/.test(ua)) return 'Android phone';
    if (/Mac/.test(ua)) return 'Mac'; if (/Windows/.test(ua)) return 'Windows PC';
    return 'This device';
  }
  // Where this device stands: 'on', 'off', 'blocked', 'install' (iPhone not added to Home Screen yet), 'none'.
  async function pushState() {
    if (isIOS && !standalone()) return 'install';
    if (!pushCapable()) return 'none';
    if (Notification.permission === 'denied') return 'blocked';
    const reg = swReg || await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  }
  async function turnOn(pushKey) {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for this site in your settings.' : 'Notifications were not allowed.');
    const reg = swReg || await registerWorker() || await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(pushKey) });
    await api('subscribe', { subscription: sub.toJSON(), device: deviceName(), test: true });
  }
  async function turnOff() {
    const reg = swReg || await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await api('unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  }
  // iOS has no subscription-change event, so re-save the subscription each time the app opens.
  async function refreshSubscription() {
    try {
      if (!pushCapable() || Notification.permission !== 'granted') return;
      const reg = swReg || await navigator.serviceWorker.getRegistration();
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) await api('subscribe', { subscription: sub.toJSON(), device: deviceName() });
    } catch (e) {}
  }
  async function promptInstall() { if (!installPrompt) return false; installPrompt.prompt(); const r = await installPrompt.userChoice; installPrompt = null; return r.outcome === 'accepted'; }
  const canPromptInstall = () => !!installPrompt;

  // The "updates on this phone" card, shared by both sides. host = element, ctx = {pushKey, muted, onMute, who}
  async function renderPhoneCard(host, ctx) {
    const state = await pushState();
    const share = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" style="vertical-align:-2px"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M5 10v6h10v-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const install = canPromptInstall() ? '<button class="btn small" data-ph="install">Install app</button>' : '';
    let html = '';
    if (state === 'install') {
      html = `<div class="row"><div><h3>Get updates on this iPhone</h3><p class="note" style="margin-top:4px">Add it to your Home Screen, open it from there, then turn updates on.</p></div></div>
        <details class="edit" data-k="ios-steps"><summary>How</summary><ol class="steps">
          <li>Tap ${share} Share at the bottom of Safari.</li><li>Tap Add to Home Screen, then Add.</li><li>Open the new icon and tap Turn on updates.</li></ol></details>`;
    } else if (state === 'on') {
      html = `<div class="row"><div><h3>Updates are on${ctx.muted ? ', paused' : ''}</h3><p class="note" style="margin-top:4px">${esc(ctx.who)}</p></div>
        <span class="actions" style="margin:0">${install}<button class="btn small" data-ph="mute">${ctx.muted ? 'Resume' : 'Pause'}</button><button class="btn small ghost" data-ph="off">Turn off</button></span></div>`;
    } else if (state === 'off') {
      html = `<div class="row"><div><h3>Get updates on this device</h3><p class="note" style="margin-top:4px">${esc(ctx.who)}</p></div>
        <span class="actions" style="margin:0">${install}<button class="btn small primary" data-ph="on">Turn on updates</button></span></div>`;
    } else if (state === 'blocked') {
      html = `<div><h3>Notifications are blocked</h3><p class="note" style="margin-top:4px">Allow notifications for vyasapps.dev in this browser's settings, then reload.</p></div>`;
    } else {
      host.hidden = true; return;
    }
    host.hidden = false;
    host.innerHTML = html;
    host.onclick = async e => {
      const b = e.target.closest('[data-ph]'); if (!b) return;
      b.disabled = true;
      try {
        if (b.dataset.ph === 'on') { await turnOn(ctx.pushKey); toast('Updates are on'); }
        else if (b.dataset.ph === 'off') { await turnOff(); toast('Updates are off on this device'); }
        else if (b.dataset.ph === 'mute') { await ctx.onMute(!ctx.muted); ctx.muted = !ctx.muted; }
        else if (b.dataset.ph === 'install') { await promptInstall(); }
      } catch (err) { toast(err.message); }
      renderPhoneCard(host, ctx);
    };
  }

  // ---------- calendar ----------
  // One .ics file with every dated thing; opens in Calendar on phone and desktop.
  function downloadIcs(name, events) {
    const fmt = d => d.replace(/-/g, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const clean = t => String(t).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//vyasapps.dev//portal//EN', 'CALSCALE:GREGORIAN'];
    for (const ev of events) {
      const d = ev.date.slice(0, 10), next = new Date(d + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
      lines.push('BEGIN:VEVENT', `UID:${ev.uid}@vyasapps.dev`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${fmt(d)}`, `DTEND;VALUE=DATE:${fmt(next.toISOString().slice(0, 10))}`,
        `SUMMARY:${clean(ev.title)}`, `DESCRIPTION:${clean(ev.note || '')}`, `URL:${location.origin}${location.pathname}`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name.replace(/[^\w-]+/g, '-') + '.ics';
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- formatting ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (/^https:\/\//i.test(u || '') ? esc(u) : '');
  const money = (c, cur = 'usd') => c == null || c === '' ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
  const parse = d => new Date(d.length === 10 ? d + 'T12:00:00' : d);
  const day = d => d ? parse(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const dayLong = d => d ? parse(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const daysSince = d => d ? Math.max(0, Math.floor((Date.now() - parse(d)) / 864e5)) : 0;
  const ago = d => {
    if (!d) return 'never';
    const m = Math.round((Date.now() - new Date(d)) / 6e4);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    const n = Math.round(h / 24); return n === 1 ? 'yesterday' : n + ' days ago';
  };

  const STATE = {
    planned: ['Planned', ''],
    active: ['In progress', ''],
    in_review: ['In review', 'wait'],
    changes_requested: ['Changes requested', 'wait'],
    accepted: ['Accepted', 'go'],
  };
  const chip = s => { const [t, c] = STATE[s] || [s, '']; return `<span class="chip ${c}">${t}</span>`; };

  // Progress toward a milestone = checklist items done / items. Only acceptance makes it 100%.
  function progress(m, items) {
    const own = items.filter(i => i.milestone_id === m.id);
    const done = own.filter(i => i.done).length;
    const total = own.length;
    const pct = m.state === 'accepted' ? 100 : total ? Math.min(Math.round((done / total) * 100), 99) : 0;
    return { done, total, pct, items: own };
  }
  const current = (ms, pid) => ms.filter(m => m.project_id === pid).sort((a, b) => a.seq - b.seq).find(m => m.state !== 'accepted') || null;
  const meter = (p, thin) => `<div class="meter${thin ? ' thin' : ''}${p.pct === 100 ? ' done' : ''}" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.pct}%"></i></div>`;
  // Paid, due and still-to-bill across a project's priced milestones (change orders included).
  function budget(ms) {
    const priced = ms.filter(m => m.amount_cents != null && m.amount_cents !== '');
    if (!priced.length) return null;
    const sum = f => priced.filter(f).reduce((s, m) => s + Number(m.amount_cents), 0);
    return { total: sum(() => true), paid: sum(m => m.pay_state === 'paid'), due: sum(m => m.pay_state === 'due'), later: sum(m => m.pay_state === 'none'), currency: priced[0].currency || 'usd' };
  }

  function toast(t) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function themeButton() {
    const b = document.querySelector('.theme');
    if (!b) return;
    b.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('theme', document.documentElement.dataset.theme); } catch (e) {}
    });
  }

  function gate(app, title, text, onKey) {
    app.innerHTML = `<div class="gate"><h1>${esc(title)}</h1><p>${esc(text)}</p>
      <form class="paste"><input type="text" name="link" placeholder="Paste your link" autocomplete="off" aria-label="Your link" /><button class="btn primary" type="submit">Open</button></form></div>`;
    app.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      if (useLink(e.target.link.value)) onKey(); else toast('That is not a portal link.');
    });
  }

  return { takeKey, forget, useLink, api, gate, registerWorker, refreshSubscription, renderPhoneCard, downloadIcs, budget,
    esc, safeUrl, money, day, dayLong, daysSince, ago, chip, progress, current, meter, toast, themeButton, STATE, standalone };
})();
