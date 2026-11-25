// Band Survivors balance check: runs the game's own code (index.html) with no sound and no drawing, on every level,
// with two bots: "kite" (looks in 16 directions and walks the emptiest, fights bosses at mid range, picks up notes, takes
// new members) and "idle" (stands still, takes the first card). Each level gets the tour perks a player would have by
// then. A level is "beatable but not trivial" when kite wins at least 60% of the seeds, its median lowest health is
// under 75%, and idle loses.
// --calibrate [--sweep 0.9,1.05,1.2]: per level, try each "hard" (enemy health) with --seeds runs and write the one whose
// kite win rate is nearest 75% (median low health under 75%) into levels/<id>/level.json.
//   node tools/sim.mjs [levelId ...] [--calibrate] [--seeds 3] [--tune '{"hpG":1.27}'] [--perks '{"loud":1}'] [--json out.json]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const GAME = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2); const opt = { seeds: 3, tune: {}, perks: {}, json: null, ids: [], bots: ['kite', 'idle'] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--seeds') opt.seeds = +args[++i]; else if (a === '--tune') opt.tune = JSON.parse(args[++i]);
  else if (a === '--perks') { opt.perks = JSON.parse(args[++i]); opt.perksGiven = true; } else if (a === '--json') opt.json = args[++i];
  else if (a === '--trace') opt.trace = true; else if (a === '--calibrate') opt.calibrate = true; else if (a === '--tier') opt.tier = +args[++i]; else if (a === '--sweep') opt.sweep = args[++i].split(',').map(Number); else if (a === '--bots') opt.bots = args[++i].split(','); else opt.ids.push(a);
}
const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
function stub() {
  const noop = () => {}; const el = { style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, setPointerCapture: noop, appendChild: noop, prepend: noop, animate: noop, children: [], firstChild: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }), querySelector: () => el, querySelectorAll: () => [],
    set innerHTML(v) {}, get innerHTML() { return ''; }, textContent: '', disabled: false, width: 0, height: 0 };
  el.getContext = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  el.firstChild = el; return el;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ctx = {
  __BS_SIM: true, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, console,
  document: { querySelector: () => stub(), createElement: () => stub(), createElementNS: () => stub(), addEventListener: () => {}, documentElement: stub(), hidden: false },
  addEventListener: () => {}, requestAnimationFrame: () => {}, setTimeout: (f) => 0, location: { search: '' },
  localStorage: { getItem: () => null, setItem: () => {} }, performance: { now: () => 0 }, Image: function () {},
  fetch: async (u) => { const p = path.join(GAME, u); return { json: async () => JSON.parse(fs.readFileSync(p, 'utf8')), arrayBuffer: async () => fs.readFileSync(p).buffer }; },
  Math: Object.create(Math)
};
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(script, ctx);
const bs = ctx.__bs; await bs.loadLevels();
const levels = bs.levels().filter(l => !opt.ids.length || opt.ids.includes(l.id));
const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const TOUR = ['loud', 'lungs', 'magnet', 'skin', 'loud', 'feet', 'snack', 'lungs', 'loud'];
function tourPerks(order) { const p = {}; for (const k of TOUR.slice(0, Math.max(0, Math.round(order) - 1))) p[k] = (p[k] || 0) + 1; return p; }
const rows = [];
async function batch(lv, bot, n) {
  const out = [];
  for (let s = 1; s <= n; s++) {
    ctx.Math.random = mulberry(s * 7919 + lv.order);
    const r = await bs.simRun(lv.id, { bot, tune: opt.tune, tier: opt.tier, perks: opt.perksGiven ? opt.perks : tourPerks(lv.order) }); r.seed = s; out.push(r);
  }
  return out;
}
if (opt.calibrate) { // try each "hard" with the given seeds; keep the one whose win rate is nearest 75% with a median low under 75% health
  const tries = opt.sweep || [0.9, 1.05, 1.2];
  for (const lv of levels) {
    let best = null;
    for (const hard of tries) {
      lv.hard = hard; const k = await batch(lv, 'kite', opt.seeds);
      const rate = k.filter(r => r.result === 'win').length / k.length, low = med(k.map(r => r.minHp));
      const score = Math.abs(rate - .75) + (low >= 75 ? .3 : 0) + (rate < .6 ? .5 : 0);
      console.log(lv.id.padEnd(14), 'hard ' + hard.toFixed(2), 'wins ' + Math.round(rate * k.length) + '/' + k.length, 'median low ' + low + '%');
      if (!best || score < best.score) best = { hard, score };
    }
    const f = path.join(GAME, 'levels', lv.id, 'level.json'); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.hard = best.hard; fs.writeFileSync(f, JSON.stringify(j, null, 1)); lv.hard = j.hard; console.log(lv.id.padEnd(14), 'keeps hard ' + j.hard);
  }
}
for (const lv of levels) {
  for (const bot of opt.bots) {
    const n = bot === 'idle' ? 1 : opt.seeds;
    for (let s = 1; s <= n; s++) {
      ctx.Math.random = mulberry(s * 7919 + lv.order);
      const t0 = Date.now(); const perks = opt.perksGiven ? opt.perks : tourPerks(lv.order); // the perks a player has picked by this stop of the tour
      const r = await bs.simRun(lv.id, { bot, tune: opt.tune, perks, trace: opt.trace, tier: opt.tier }); r.seed = s; r.ms = Date.now() - t0; rows.push(r);
      console.log([r.level.padEnd(14), bot.padEnd(5), 'seed ' + s, r.result.padEnd(7), 't ' + r.t + '/' + r.run, 'boss@' + r.bossAt, 'killed@' + r.bossKillT, 'minHP ' + r.minHp + '%', 'band ' + r.band, 'lv ' + r.lvl, 'kills ' + r.kills, r.combos || '-', r.dmgLog, r.ms + 'ms'].join('  '));
    }
  }
}
const verdict = levels.map(lv => {
  const k = rows.filter(r => r.level === lv.id && r.bot === 'kite'), i = rows.filter(r => r.level === lv.id && r.bot === 'idle');
  const wins = k.filter(r => r.result === 'win').length, rate = k.length ? wins / k.length : 0, low = med(k.map(r => r.minHp));
  const beat = rate >= .6, idleLoses = !i.length || i.every(r => r.result !== 'win'), notTrivial = low < 75 && idleLoses;
  return { level: lv.id, kiteWins: wins + '/' + k.length, kiteMedianLowHp: low, idle: i.map(r => r.result + '@' + r.t), beatable: beat, notTrivial, ok: beat && notTrivial };
});
console.log('\n' + verdict.map(v => (v.ok ? 'OK   ' : 'FAIL ') + v.level.padEnd(14) + ' kite wins ' + v.kiteWins + ', median low ' + v.kiteMedianLowHp + '% health, idle ' + v.idle.join(' ')).join('\n'));
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ tune: opt.tune, perks: opt.perks, rows, verdict }, null, 1));
