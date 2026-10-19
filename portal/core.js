// Shared by the client portal and the owner studio: key handling, API calls, progress math, formatting.
const PORTAL = (() => {
  const ENDPOINT = 'https://ihmayqzxqyednchbezya.supabase.co/functions/v1/portfolio-portal';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWF5cXp4cXllZG5jaGJlenlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzcyOTgsImV4cCI6MjA4Mzc1MzI5OH0._xhGhkqoy7AMm7M5dxSHXM_yeP8zVAJG-BaGMICtHFo';
  let memKey = '';

  // The link is the account: #k=<key> is saved on this device and removed from the address bar.
  function takeKey(slot) {
    const m = location.hash.match(/[#&]k=([A-Za-z0-9_-]{40,60})/);
    if (m) {
      memKey = m[1];
      try { localStorage.setItem(slot, m[1]); } catch (e) {}
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (!memKey) { try { memKey = localStorage.getItem(slot) || ''; } catch (e) {} }
    return memKey;
  }
  function forget(slot) { memKey = ''; try { localStorage.removeItem(slot); } catch (e) {} }

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

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (/^https:\/\//i.test(u || '') ? esc(u) : '');
  const money = (c, cur = 'usd') => c == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: c % 100 ? 2 : 0 }).format(c / 100);
  const day = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const dayLong = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const daysSince = d => d ? Math.max(0, Math.floor((Date.now() - new Date(d.length === 10 ? d + 'T12:00:00' : d)) / 864e5)) : 0;
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

  function toast(t) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
    el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
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

  return { takeKey, forget, api, esc, safeUrl, money, day, dayLong, daysSince, ago, chip, progress, current, meter, toast, themeButton, STATE };
})();
