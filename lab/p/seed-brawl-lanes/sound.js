// Seed Brawl Lanes: the one sound player. Every sound in the game goes through it (game-audio skill, "The mix").
// - Cues, tiers and mix numbers come from sfx/cues.json (made by work/sound/make_set.py); files are mono 32 kHz WAV.
// - Tiers: 1 must hear (threats to you, deaths, round events), 2 your own actions, 3 others near you, 4 bodies and
//   world, 5 music and ambience. A full pool steals the quietest voice of the lowest tier; tier 1 and 2 are never dropped.
// - Tier 1 ducks tiers 3 to 5 by 6 dB for 0.4 s. The spam guard is per actor and id. My own sounds are 2D; others fade
//   with distance from the camera focus and are silent before the screen edge. Creep sounds vary a little in pitch and level.
// - Web Audio with decoded buffers; unlocks on the first touch (iOS WKWebView in the Capacitor app resumes the context
//   inside that touch); loads in the background, so the match never waits for sound.
// The Mixer (decisions only, no audio) is shared with tools/lanes-mixlog.js, which runs the same rules headless in node.
(function (root) {
'use strict';
const TOTAL = 14, HARD = 22;                         // voice budget, and the ceiling tier 1 and 2 may push it to
const TIER_CAP = [0, 99, 6, 6, 5, 2];                // voices per tier
const DUCK = { gain: 0.5, hold: 0.4, release: 0.3, tiers: [3, 4, 5] };
const FADE_NEAR = 0.6, FADE_EDGE = 0.95;             // share of the half screen where a sound starts to fade, and where it is gone
const FADE4 = [0.3, 0.75];                           // tier 4 (bodies and world) is heard only around the middle of the view
const MASTER = 0.7;                                  // headroom: a busy moment sums under full scale; a limiter catches the rest
const MAX_SAME = 2;                                  // no cue id more than twice at once
// bodies in a group share a cap: the fight of many creeps is a few clear hits, not a wash (tier 4, so these may drop)
// near: a body this close to my hero (rules units) is the fight I am looking at. It is never dropped: it takes the place
// of whatever creep attack is sounding, unless another near attack started under nearEvery ago, which it merges into
// (the same fight, already heard). Farther ones are spaced every s apart and only play when the group is free.
const GROUPS = { creep_atk: { every: 0.7, max: 1, near: 200, nearEvery: 0.35 }, creep_die: { every: 0.1, max: 3 }, unit_hit: { every: 0.1, max: 2 } };

function Mixer(cues, backend, now) {
  this.cues = cues; this.backend = backend; this.now = now;
  this.voices = []; this.last = new Map(); this.ids = new WeakMap(); this.nextId = 1; this.stats = {}; this.duckUntil = -1;
}
Mixer.prototype.stat = function (id) { return this.stats[id] || (this.stats[id] = { plays: 0, guarded: 0, offscreen: 0, dropped: 0, stolen: 0, restarted: 0, notReady: 0, most: 0 }); };
Mixer.prototype.actorKey = function (a) { if (!a || typeof a !== 'object') return a === undefined ? '-' : String(a); let k = this.ids.get(a); if (!k) { k = this.nextId++; this.ids.set(a, k); } return k; };
Mixer.prototype.sweep = function (t) { this.voices = this.voices.filter(v => v.end > t && !v.gone); };
// o: { x, y, actor, me, at: {x, y, hw, hh} listener (camera focus, half width and half height of the view, rules units), ui }
Mixer.prototype.play = function (id, o) {
  o = o || {}; const c = this.cues[id], t = this.now();
  if (!c) { this.stat(id).unknown = (this.stat(id).unknown || 0) + 1; return 'unknown'; }
  const s = this.stat(id), p = c.play || {};
  const own = !!(o.actor && o.me && o.actor === o.me);
  const tier = own && p.own && c.tier > 2 ? 2 : c.tier;
  // where it is: my own and global sounds are 2D; others fade toward the screen edge and stop before it
  let att = 1, pan = 0;
  if (!own && !p.glob && !o.ui && o.at && o.x !== undefined) {
    const dx = (o.x - o.at.x) / o.at.hw, dy = (o.y - o.at.y) / o.at.hh, n = Math.max(Math.abs(dx), Math.abs(dy));
    const near = tier >= 4 ? FADE4[0] : FADE_NEAR, edge = tier >= 4 ? FADE4[1] : FADE_EDGE;
    if (n >= edge) { s.offscreen++; return 'offscreen'; }
    if (n > near) { const k = (edge - n) / (edge - near); att = k * k; }
    pan = Math.max(-1, Math.min(1, dx)) * 0.5;
  }
  // spam guard per actor and id
  const key = id + '|' + this.actorKey(o.actor), gap = p.gap === undefined ? 0.05 : p.gap, lt = this.last.get(key);
  if (lt !== undefined && t - lt < gap) { s.guarded++; return 'guarded'; }
  // a UI tap that the same touch already answered with a game sound stays quiet (one event, one cue)
  if (o.ui && p.quietAfterOwn && this.voices.some(v => v.own && t - v.start < p.quietAfterOwn)) { s.guarded++; return 'guarded'; }
  this.sweep(t);
  const grp = p.group && GROUPS[p.group];
  let near = false;
  if (grp) { near = !!(grp.near && o.me && !o.me.dead && o.x !== undefined && Math.hypot(o.x - o.me.x, o.y - o.me.y) < grp.near);
    const gl = this.last.get('group|' + p.group), inG = this.voices.filter(v => v.group === p.group);
    if (near) { const recent = inG.find(v => v.near && t - v.start < grp.nearEvery); if (recent) { s.guarded++; s.merged = (s.merged || 0) + 1; return 'merged'; }
      while (inG.length >= grp.max) { const v = inG.sort((a, b) => (a.near - b.near) || (a.att - b.att))[0]; this.stopVoice(v, t); this.stat(v.id).stolen++; inG.splice(inG.indexOf(v), 1); } }
    else if ((gl !== undefined && t - gl < grp.every) || inG.length >= grp.max) { s.dropped++; s.capped = (s.capped || 0) + 1; return 'capped'; } }
  const vary = p.vary || [0, 0], cents = (Math.random() * 2 - 1) * vary[0], db = (Math.random() * 2 - 1) * vary[1];
  const rate = (p.rate || 1) * Math.pow(2, cents / 1200), gain = (p.gain === undefined ? 1 : p.gain) * Math.pow(10, db / 20) * att;
  const dur = (this.backend.duration(c) || c.length_s || 0.5) / rate;
  if (!this.backend.ready(c)) { s.notReady++; return 'notReady'; }
  // no id more than MAX_SAME at once: the oldest copy fades out
  const same = this.voices.filter(v => v.id === id);
  if (same.length >= (p.max || MAX_SAME)) { const v = same.sort((a, b) => a.start - b.start)[0]; this.stopVoice(v, t); if (tier <= 2) s.restarted++; else this.stat(id).stolen++; }
  // the budget: steal the quietest voice of the lowest tier that is no more important than this one
  const count = tt => this.voices.reduce((a, v) => a + (v.tier === tt ? 1 : 0), 0);
  const full = () => this.voices.length >= TOTAL || count(tier) >= TIER_CAP[tier];
  if (full()) {
    const pool = this.voices.filter(v => v.tier >= 3 && v.tier >= tier && (this.voices.length >= TOTAL || v.tier === tier));
    if (pool.length) {
      const lvl = v => v.gain * Math.max(0.05, (v.end - t) / Math.max(0.01, v.end - v.start));
      pool.sort((a, b) => b.tier - a.tier || lvl(a) - lvl(b));
      const v = pool[0]; this.stopVoice(v, t); this.stat(v.id).stolen++;
    } else if (tier >= 3 || this.voices.length >= HARD) { if (tier <= 2) { const v = this.voices.filter(w => w.tier >= 2).sort((a, b) => a.start - b.start)[0]; if (v) { this.stopVoice(v, t); this.stat(v.id).stolen++; } } else { s.dropped++; return 'dropped'; } }
  }
  this.last.set(key, t); if (grp) this.last.set('group|' + p.group, t);
  const v = { id, tier, own, start: t, end: t + dur, gain, att, pan, rate, group: p.group, near };
  v.h = this.backend.start(c, v);
  this.voices.push(v); s.plays++;
  const n = this.voices.filter(w => w.id === id).length; if (n > s.most) s.most = n;
  if (this.voices.length > (this.mostAll || 0)) this.mostAll = this.voices.length;
  if (tier === 1) { this.duckUntil = t + DUCK.hold; this.backend.duck(DUCK, t); }
  return 'played';
};
Mixer.prototype.stopVoice = function (v, t) { v.gone = true; v.end = Math.min(v.end, t + 0.03); this.backend.stop(v, t); this.voices = this.voices.filter(w => w !== v); };

// ---- the browser player: Web Audio, decoded buffers, buses per tier
function create(opt) {
  opt = opt || {};
  const base = opt.base || 'sfx/', AC = root.AudioContext || root.webkitAudioContext, qs = root.location ? root.location.search : '';
  const ua = (root.navigator && root.navigator.userAgent) || '';
  // agents never play sound on his speakers: muted by ?mute, a driven browser, or the Claude app's browser pane
  const muted = /[?&]mute\b/.test(qs) || !!(root.navigator && root.navigator.webdriver) || /\bClaude\//.test(ua);
  const P = { ready: false, unlocked: false, muted, cues: {}, buffers: {}, log: [], errors: [], decoded: 0, files: 0 };
  if (!AC) { P.play = () => 'nosound'; P.stats = () => ({}); return P; }
  const ctx = new AC(), master = ctx.createGain(), buses = [];
  master.gain.value = muted ? 0 : MASTER;
  let out = ctx.destination; if (ctx.createDynamicsCompressor) { const l = ctx.createDynamicsCompressor(); l.threshold.value = -2; l.knee.value = 0; l.ratio.value = 20; l.attack.value = 0.002; l.release.value = 0.1; l.connect(ctx.destination); out = l; }
  master.connect(out);
  for (let i = 0; i <= 5; i++) { const g = ctx.createGain(); g.connect(master); buses.push(g); }
  const backend = {
    ready: c => !!P.buffers[c.file],
    duration: c => P.buffers[c.file] ? P.buffers[c.file].duration : 0,
    start(c, v) {
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = P.buffers[c.file]; src.playbackRate.value = v.rate; g.gain.value = v.gain;
      let node = g; if (v.pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = v.pan; g.connect(pn); node = pn; }
      src.connect(g); node.connect(buses[v.tier]); src.start(); return { src, g };
    },
    stop(v) { if (!v.h) return; const t = ctx.currentTime; try { v.h.g.gain.setTargetAtTime(0, t, 0.01); v.h.src.stop(t + 0.05); } catch (e) { } },
    duck(d) { const t = ctx.currentTime; for (const i of d.tiers) { const g = buses[i].gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(d.gain, t + 0.02); g.setValueAtTime(d.gain, t + d.hold); g.linearRampToValueAtTime(1, t + d.hold + d.release); } },
  };
  const mixer = new Mixer(P.cues, backend, () => ctx.currentTime);
  P.mixer = mixer; P.ctx = ctx;
  P.play = (id, o) => { const r = mixer.play(id, o); if (P.log.length < 400) P.log.push([Math.round(ctx.currentTime * 100) / 100, id, r]); return r; };
  P.stats = () => mixer.stats;
  // unlock on the first touch, click or key, inside that event (iOS needs the resume and one played buffer there)
  const unlock = () => {
    if (ctx.state !== 'running') ctx.resume().catch(() => { });
    if (!P.unlocked) { try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { } P.unlocked = true; }
  };
  for (const ev of ['pointerdown', 'touchend', 'mousedown', 'keydown']) root.addEventListener(ev, unlock, { capture: true, passive: true });
  // a hidden page is silent; iOS can also leave the context 'interrupted' after a call, so the next touch resumes it
  if (root.document) root.document.addEventListener('visibilitychange', () => { if (root.document.hidden) ctx.suspend().catch(() => { }); else if (P.unlocked) ctx.resume().catch(() => { }); });
  const decode = ab => new Promise((ok, bad) => { const p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); });
  P.loading = fetch(base + 'cues.json').then(r => r.json()).then(doc => {
    const files = new Set();
    for (const c of doc.cues) { if (!c.file || c.status !== 'made') continue; const f = c.file.split('/').pop(); P.cues[c.id] = { id: c.id, tier: c.tier, file: f, length_s: c.length_s, play: c.play || {} }; files.add(f); }
    P.files = files.size; const list = [...files]; let i = 0;
    const next = () => { if (i >= list.length) return Promise.resolve(); const f = list[i++];
      return fetch(base + f).then(r => { if (!r.ok) throw new Error(r.status + ' ' + f); return r.arrayBuffer(); }).then(decode).then(b => { P.buffers[f] = b; P.decoded++; }, e => { P.errors.push(f + ': ' + (e && e.message || e)); }).then(next); };
    return Promise.all([0, 1, 2, 3, 4, 5].map(next));
  }).then(() => { P.ready = true; }, e => { P.errors.push('cues.json: ' + (e && e.message || e)); });
  return P;
}

const api = { Mixer, create, TOTAL, HARD, TIER_CAP, DUCK, FADE_NEAR, FADE_EDGE, FADE4, MAX_SAME, GROUPS, MASTER };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SBL_SOUND = api;
})(typeof window !== 'undefined' ? window : globalThis);
