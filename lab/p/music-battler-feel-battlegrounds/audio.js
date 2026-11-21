/* Battlegrounds feel game: the sound. Web Audio in the way battler-baseline/src/battler.src.html does it (sample packs,
   nearest-note pitch shift, level by measured loudness, a compressor and a short room), playing Iron March
   (song.js) with each race's sound set (world-<race>.json card roles). Starts on the first tap; silent until then. */
(function () {
"use strict";
var SONG = window.IRON_MARCH, RS = window.RACE_SOUND;
var AC = window.AudioContext || window.webkitAudioContext;
var A = { ctx: null, on: true, RAW: {}, BUF: {}, voices: {} };
var PACKS = ["kit_bellforge_real", "kit_stormsong_real", "kar_wartuba_lp", "vsco_contrabass_lp", "vcsl_vibes", "vcsl_kalimba_t",
  "vcsl_handchimes_t", "vcsl_harp", "vcsl_organ_loud", "vsco_celloarco", "gtr_recto_ld", "gtr_doom_ld", "vsco_trumpet",
  "vsco_flute", "vsco_horns_t", "doom", "bellforge_toms", "stormsong_toms", "war_impacts", "sfx_shop"];
var FILE = { doom: "doom" };

window.__LAB = function (inst, files) { if (inst === "creature/doom") inst = "doom"; A.RAW[inst] = files; if (A.ctx) decodeInst(inst); };
function loadPacks() {
  PACKS.forEach(function (p, i) {
    setTimeout(function () { var s = document.createElement("script"); s.src = "sounds/" + (FILE[p] || p) + ".js"; s.async = true; document.head.appendChild(s); }, 30 * i);
  });
}
function b64(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function decode(ab) { return new Promise(function (res, rej) { try { var p = A.ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } }); }
function rmsOf(b) { var d = b.getChannelData(0), n = Math.min(d.length, Math.floor(b.sampleRate * 0.5)), s = 0; for (var i = 0; i < n; i++) s += d[i] * d[i]; return Math.sqrt(s / Math.max(1, n)); }
function decodeInst(inst) {
  var files = A.RAW[inst]; if (!files || A.BUF[inst] || files.__busy) return; files.__busy = true;
  var keys = Object.keys(files).filter(function (k) { return k !== "__busy"; }), out = { notes: {}, list: [], rms: 0.1 }, left = keys.length, rs = [];
  keys.forEach(function (k) {
    decode(b64(files[k])).then(function (b) { out.notes[k] = b; rs.push(rmsOf(b)); }).catch(function () {}).then(function () {
      if (--left === 0) {
        out.list = Object.keys(out.notes).map(Number).filter(function (x) { return x < 100 || inst.indexOf("kit") < 0; }).sort(function (a, b) { return a - b; });
        rs.sort(function (a, b) { return a - b; }); out.rms = rs.length ? rs[Math.floor(rs.length / 2)] : 0.1;
        A.BUF[inst] = out;
      }
    });
  });
}
function graph() {
  var c = A.ctx;
  A.comp = c.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 4; A.comp.attack.value = 0.004; A.comp.release.value = 0.2;
  A.out = c.createGain(); A.out.gain.value = 0.85; A.comp.connect(A.out); A.out.connect(c.destination);
  A.master = c.createGain(); A.master.connect(A.comp);
  A.verb = c.createConvolver(); A.verbGain = c.createGain(); A.verbGain.gain.value = 0.16; A.verb.connect(A.verbGain); A.verbGain.connect(A.comp);
  var len = Math.floor(c.sampleRate * 1.8), ir = c.createBuffer(2, len, c.sampleRate);
  for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  A.verb.buffer = ir;
  A.send = c.createGain(); A.send.gain.value = 1; A.send.connect(A.verb);
  A.you = c.createGain(); A.you.connect(A.master); A.you.connect(A.send);
  A.themIn = c.createGain(); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3600; lp.Q.value = 0.5;
  A.them = c.createGain(); A.them.gain.value = 0.8; A.themIn.connect(lp); lp.connect(A.them); A.them.connect(A.master); A.them.connect(A.send);
  A.fx = c.createGain(); A.fx.gain.value = 0.7; A.fx.connect(A.master);
}
function unlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
  if (!AC || window.__mute) return;
  if (!A.ctx) {
    try { A.ctx = new AC(); graph(); } catch (e) { A.ctx = null; return; }
    try { var b = A.ctx.createBuffer(1, 1, 22050), s = A.ctx.createBufferSource(); s.buffer = b; s.connect(A.ctx.destination); s.start(0); } catch (e) {}
    Object.keys(A.RAW).forEach(decodeInst);
  }
  if (A.ctx.state !== "running") { try { A.ctx.resume(); } catch (e) {} }
}
["pointerdown", "touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });

function live() { return !!(A.ctx && A.on && A.ctx.state === "running"); }
function now() { return live() ? A.ctx.currentTime : performance.now() / 1000; }
function db(x) { return Math.pow(10, (x || 0) / 20); }
function env(g, t, v, a, hold, r) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
  g.gain.setValueAtTime(Math.max(0.0002, v), t + Math.max(a, hold)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, hold) + r); }
function bus(side, pan) {
  var c = A.ctx, g = c.createGain(), dest = side === "them" ? A.themIn : side === "fx" ? A.fx : A.you;
  if (c.createStereoPanner && pan) { var p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(dest); } else g.connect(dest);
  return g;
}
function sample(inst, midi, t, dur, vol, out, o) {
  o = o || {};
  var B = A.BUF[inst]; if (!B || !B.list.length) return null;
  var best = B.list[0]; for (var i = 0; i < B.list.length; i++) if (Math.abs(B.list[i] - midi) < Math.abs(best - midi)) best = B.list[i];
  if (!o.exact && Math.abs(best - midi) > 7) return null;
  var key = String(best); if (!B.notes[key]) { for (var k in B.notes) if (Number(k) === best) { key = k; break; } }
  if (o.rr) { var alt = [String(100 + best), String(200 + best)].filter(function (x) { return B.notes[x]; }); var pickN = Math.floor(Math.random() * (alt.length + 1)); if (pickN > 0) key = alt[pickN - 1]; }
  var c = A.ctx, s = c.createBufferSource(); s.buffer = B.notes[key];
  s.playbackRate.value = o.exact ? 1 : Math.pow(2, (midi - best) / 12);
  var g = c.createGain(); s.connect(g); g.connect(out);
  var norm = Math.min(4, 0.12 / Math.max(0.008, B.rms)), v = vol * norm;
  var bufLen = s.buffer.duration / s.playbackRate.value;
  var hold = o.sus ? Math.min(bufLen - 0.1, dur) : Math.min(bufLen - 0.05, dur + (o.ring == null ? 0.25 : o.ring));
  var a = o.a != null ? o.a : (o.sus ? 0.05 : 0.004), r = o.sus ? 0.3 : 0.12; hold = Math.max(a + 0.01, hold);
  env(g, t, v, a, hold, r); s.start(t); s.stop(t + hold + r + 0.05);
  return { g: g, end: t + hold + r };
}
function synth(t, midi, dur, vol, out, type) {
  var c = A.ctx, o = c.createOscillator(); o.type = type || "triangle"; o.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), t);
  var g = c.createGain(); o.connect(g); g.connect(out); env(g, t, vol, 0.005, dur, 0.1); o.start(t); o.stop(t + dur + 0.2);
  return { g: g, end: t + dur + 0.1 };
}
function cutMono(key, t) { var v = A.voices[key]; if (v) { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0.0001, t, 0.02); } catch (e) {} } }

var ROLELV = { bass: 0.8, stab: 0.42, arp: 0.5, pad: 0.3, lead: 0.55, voice: 0.6, choir: 0.32 };
var SUS = { pad: 1, voice: 1, choir: 1 };
var TYPEROLE = { bass: "bass", lead: "lead", keys: "stab", strings: "pad", voice: "voice", arp: "arp", choir: "choir" };
function chordAt(bar) { var p = SONG.prog; return SONG.chords[p[((bar % p.length) + p.length) % p.length]]; }
function pitch(p, bar) {
  var c = chordAt(bar); if (!p) return null;
  if (p === "K") return { drum: "kick" }; if (p === "S") return { drum: "snare" }; if (p === "H") return { drum: "hat" }; if (p === "TOM") return { drum: "tom" };
  var m = /^(R|T0|T1|T2|CH)([+-]\d+)?$/.exec(p); if (!m) return null;
  var off = m[2] ? parseInt(m[2], 10) : 0;
  if (m[1] === "R") return { notes: [c.root + off] };
  if (m[1] === "CH") return { notes: c.tri.map(function (n) { return n + off; }) };
  return { notes: [c.tri[+m[1][1]] + off] };
}
function drum(race, kind, t, vol, out, n) {
  var spec = RS[race].drums[kind]; if (!spec) return;
  var note = Array.isArray(spec.n) ? spec.n[(n || 0) % spec.n.length] : spec.n;
  if (!sample(spec.i, note, t, 0.5, vol * db(spec.g) * (kind === "tom" ? 1.1 : 0.9), out, { ring: 0.6, rr: true, exact: true })) {
    if (kind === "kick") synth(t, 36, 0.12, 0.3 * vol, out, "sine"); else if (kind !== "hat") synth(t, 60, 0.05, 0.08 * vol, out, "square");
  }
}
function taiko(race, t, vol, out, n) {
  var inst = race === "bf" ? "bellforge_toms" : "stormsong_toms", ks = [38, 45, 52, 59];
  if (!sample(inst, ks[(n || 0) % 4], t, 0.8, vol * 1.1, out, { ring: 0.8, exact: true })) drum(race, "tom", t, vol, out, n);
}
function noteEv(race, type, ev, bar, t, sd, out, vol, key) {
  var p = pitch(ev.p, bar); if (!p || ev.silent) return;
  if (p.drum) { if (type === "taiko") taiko(race, t, vol, out, ev.s); else drum(race, p.drum, t, vol, out, ev.s); return; }
  var role = TYPEROLE[type] || "stab", R = RS[race].roles[role]; var dur = (ev.len || 1) * sd;
  if (ev.sound === "drop") { R = RS[race].roles.bass; }
  var lv = (ROLELV[role] || 0.5) * vol * db(R.g);
  if (R.mono) cutMono(key, t);
  p.notes.forEach(function (m) {
    var v = sample(R.i, m + (R.o || 0), t, dur, lv, out, { sus: !!SUS[role], ring: R.ring, a: R.a });
    if (!v) v = synth(t, m + (R.o || 0), Math.min(dur, 0.25), 0.05 * vol, out);
    if (R.mono && v) A.voices[key] = v;
  });
}
function expand(list) {
  var out = [];
  (list || []).forEach(function (ev) {
    if (ev.every) { var from = ev.from != null ? ev.from : ev.s, to = ev.to != null ? ev.to : 16, k = 0;
      for (var s = from; s < to; s += ev.every) { var e = Object.assign({}, ev); delete e.every; e.s = s; e.len = ev.len || 1; e.p = ev.seq ? ev.seq[k % ev.seq.length] : ev.p; out.push(e); k++; } }
    else { var e2 = Object.assign({}, ev); e2.len = ev.len || 1; out.push(e2); }
  });
  return out.sort(function (a, b) { return a.s - b.s; });
}
var PARTS = {};
Object.keys(SONG.types).forEach(function (t) { var T = SONG.types[t]; PARTS[t] = { 1: expand(T.parts["1"]), 2: expand(T.parts["2"]), 3: expand(T.parts["3"]), solo: expand(T.solo) }; });

var AU = {
  A: A, now: now, live: live, unlock: unlock, load: loadPacks, PARTS: PARTS, bpm: SONG.bpm, chordAt: chordAt,
  // the events of a part that fall in [from, from+len) of a bar; if that half is empty, the other half moved over
  window: function (type, level, from, len) {
    var list = (PARTS[type] || PARTS.drums)[level] || PARTS[type][1];
    var w = list.filter(function (e) { return e.s >= from && e.s < from + len; });
    if (!w.length && len < 16) { var o = from === 0 ? 8 : 0; w = list.filter(function (e) { return e.s >= o && e.s < o + len; }).map(function (e) { var x = Object.assign({}, e); x.s = e.s - o + from; return x; }); }
    return w;
  },
  // play a phrase: events in steps relative to the bar; barT = time of that bar's step 0
  phrase: function (race, type, level, bar, barT, from, len, sd, side, pan, vol, key) {
    if (!live()) return;
    var out = bus(side, pan), evs = AU.window(type, level, from, len);
    evs.forEach(function (ev) { noteEv(race, type, ev, bar, barT + ev.s * sd, sd, out, vol || 1, key || (race + type)); });
  },
  drum: function (race, kind, t, vol, side, n) { if (!live()) return; drum(race, kind, t, vol, bus(side || "you"), n); },
  click: function (race, t, accent) { if (!live()) return; var k = race === "bf" ? "kit_bellforge_real" : "kit_stormsong_real";
    if (!sample(k, 37, t, 0.2, accent ? 0.7 : 0.45, bus("fx"), { exact: true, ring: 0.1 })) synth(t, accent ? 84 : 79, 0.03, 0.08, bus("fx"), "square"); },
  pad: function (race, bar, t, dur, vol) {
    if (!live()) return; var R = RS[race].roles.pad, c = chordAt(bar), out = bus("you");
    c.tri.forEach(function (m) { sample(R.i, m + (R.o || 0), t, dur, 0.3 * vol * db(R.g), out, { sus: true }); });
  },
  bassRoot: function (race, bar, t, dur, vol) {
    if (!live()) return; var R = RS[race].roles.bass, c = chordAt(bar);
    sample(R.i, c.root + (R.o || 0), t, dur, 0.8 * vol * db(R.g), bus("you"), {});
  },
  impact: function (race, t, big, side) {
    if (!live()) return;
    var keys = race === "bf" ? (big ? [1, 2, 3, 4] : [11, 12, 13]) : (big ? [21, 22, 23] : [31, 32, 33]);
    var k = keys[Math.floor(Math.random() * keys.length)];
    sample("war_impacts", k, t, 0.6, big ? 0.55 : 0.4, bus(side === "them" ? "fx" : "fx", side === "them" ? 0.25 : -0.25), { exact: true, ring: 0.5 });
  },
  crash: function (race, t, vol) { if (!live()) return; var k = race === "bf" ? "kit_bellforge_real" : "kit_stormsong_real";
    sample(k, 49, t, 1.2, 0.5 * (vol || 1), bus("fx"), { exact: true, ring: 1.4 }); },
  chime: function (race, bar, t) { if (!live()) return; var R = RS[race].roles.arp, c = chordAt(bar);
    sample(R.i, c.tri[0] + 24 + (R.o || 0), t, 0.3, 0.35, bus("fx", 0), {}); },
  sfx: function (n, t, vol) { if (!live()) return; sample("sfx_shop", n, t == null ? now() : t, 1.2, vol || 0.5, bus("fx"), { exact: true, ring: 1 }); },
  ready: function () { return Object.keys(A.BUF).length; }
};
window.AU = AU;
})();
