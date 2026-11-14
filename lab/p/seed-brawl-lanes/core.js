// Seed Brawl Lanes: rules. No screen code in here, so the same file runs in the game (lanes/index.html)
// and in the headless sweeps (sim/run-lanes.js). Circles version rules stay in prototype/index.html, untouched.
// Units are the circles version's units (three seed kinds x five bodies, same base stats and ladder);
// hero numbers are Brawl Stars level (docs/research/brawl-stars-numbers.md, client 66.306.1).
(function (root) {
'use strict';
const W = 1000, H = 1600, T = W / 21, BLUE = 1, RED = 2;      // 21 x 33.6 tiles, the Brawl Stars 3v3 map size
const TCOL = ['#d3d1c7', '#378add', '#e24b4a'];
// circles version units, base numbers unchanged (prototype/index.html KINDS and sim/shipped.json ladder)
const KINDS = [
  { id: 'thorn', name: 'Thorn', col: '#d85a30', hp: 140, dmg: 30, range: 30, spd: 60 },
  { id: 'spitter', name: 'Spitter', col: '#1d9e75', hp: 80, dmg: 22, range: 170, spd: 55 },
  { id: 'runner', name: 'Runner', col: '#7f77dd', hp: 55, dmg: 12, range: 30, spd: 110 }];
const BODIES = ['', 'Grunt', 'Brute', 'Splasher', 'Flyer', 'Colossus'];
const CFG = Object.assign({
  time: 300,
  lanes: 3,                 // one number: how many lanes
  divW: 95,                 // width of the wall strip between two lanes (2 tiles)
  baseZone: 260,            // open ground in front of each base, no walls
  wallRows: [[0, 2], [6, 9], [15, 18], [21, 22]],   // wall stretches on a divider, in rows of 23; the rest is open
  baseHp: 60,
  cost: [0, 1, 2, 3, 5, 8], // seeds per body: Grunt, Brute, Splasher, Flyer, Colossus (circles ladder 1,2,3,5,8)
  TM: [0, 1, 2, 3, 5, 8],   // base damage when a body gets there
  // body ladder for bought units. The circles ladder (1, 1.7, 1.4, 1.2, 4.5) is tuned for plots that grow units
  // for free; here a body is paid for once, so each body is worth about its seed price.
  THP: [0, 1, 3, 2.4, 3.5, 8], TD: [0, 1, 1.2, 2, 3.5, 5], TR: [0, 9, 13, 12, 12, 19],
  unitHpMul: 20, unitDmgMul: 10,   // circles units scaled to Brawl Stars hero numbers
  heroUnitMul: 1,
  carry: 10, startSeeds: 4, seedEvery: 3,
  seedRamp: 0,              // seeds trickle in this much faster by the end of the match (1 = twice as fast), so late waves are bigger
  farmMid: { every: 2, cap: 5 }, farmHome: { every: 4, cap: 3 },
  respawn: 5, unitCap: 60,
  baseGun: { range: 260, every: 0.7, dmg: 500 },
  late: { at: 75, base: 2 },
  heroGrow: { every: 45, dmg: 0.2, hp: 0.15, max: 5 },
  unitGrow: { every: 45, hp: 0.4, max: 5 },           // each 45 s summoned units come out 40 percent tougher (of the starting toughness), up to 3x
  comeback: { under: 0.5 },
  supUnit: 0.35,            // share of damage done to units that charges the super
  regenWait: 3, regen: 0.13,
  botDefend: 0.5,           // how often a bot answers a lane that is being lost (per think)
  hb: {}                    // per hero balance multipliers {id:{hp,dmg}}
}, root.SBL_CFG || {});
const TM = CFG.TM, THP = CFG.THP, TD = CFG.TD, TR = CFG.TR;
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---- map: lanes, the wall strips between them and the open places in those strips
const NL = CFG.lanes, LW = (W - (NL - 1) * CFG.divW) / NL;
const laneX = i => i * (LW + CFG.divW) + LW / 2;
const laneL = i => i * (LW + CFG.divW), laneR = i => laneL(i) + LW;
const Y0 = CFG.baseZone, Y1 = H - CFG.baseZone, ROWS = 23, RH = (Y1 - Y0) / ROWS;
const WALLS = [], GAPS = [], FARMS = [], BUSHES = [];
for (let d = 0; d < NL - 1; d++) {
  const x0 = laneR(d), x1 = x0 + CFG.divW, rev = d % 2 === 1;
  const segs = CFG.wallRows.map(([a, b]) => rev ? [ROWS - 1 - b, ROWS - 1 - a] : [a, b]).sort((a, b) => a[0] - b[0]);
  let prev = 0;
  for (const [a, b] of segs) {
    if (a > prev) GAPS.push({ d, x: (x0 + x1) / 2, x0, x1, y0: Y0 + prev * RH, y1: Y0 + a * RH });
    WALLS.push({ d, x0, x1, y0: Y0 + a * RH, y1: Y0 + (b + 1) * RH, kind: (a + d) % 2 ? 'hedge' : 'rock' });
    prev = b + 1;
  }
  if (prev < ROWS) GAPS.push({ d, x: (x0 + x1) / 2, x0, x1, y0: Y0 + prev * RH, y1: Y1 });
}
for (const g of GAPS) { g.y = (g.y0 + g.y1) / 2; g.h = g.y1 - g.y0; }
// seed farms sit in the widest open place of each wall strip; smaller openings hold a bush
for (let d = 0; d < NL - 1; d++) {
  const gs = GAPS.filter(g => g.d === d).sort((a, b) => b.h - a.h);
  if (gs[0]) FARMS.push({ x: gs[0].x, y: gs[0].y, every: CFG.farmMid.every, cap: CFG.farmMid.cap, mid: true, t: 0, n: 0 });
  for (const g of gs.slice(1)) BUSHES.push({ x: g.x, y: g.y, r: 44 });
}
FARMS.push({ x: 110, y: H - 110, every: CFG.farmHome.every, cap: CFG.farmHome.cap, team: BLUE, t: 0, n: 0 },
  { x: W - 110, y: 110, every: CFG.farmHome.every, cap: CFG.farmHome.cap, team: RED, t: 0, n: 0 });
BUSHES.push({ x: 60, y: H / 2 + 70, r: 44 }, { x: W - 60, y: H / 2 - 70, r: 44 });
const BASEPOS = [null, { x: W / 2, y: H - 105 }, { x: W / 2, y: 105 }];
const spawnPt = (team, lane) => ({ x: laneX(lane), y: team === BLUE ? Y1 + 14 : Y0 - 14 });
const laneOf = x => clamp(Math.floor(x / (LW + CFG.divW)), 0, NL - 1);
const inSpan = y => y > Y0 - 4 && y < Y1 + 4;
// does the straight line a-b cross a wall
function blocked(ax, ay, bx, by) {
  for (const w of WALLS) {
    if (Math.max(ax, bx) < w.x0 || Math.min(ax, bx) > w.x1 || Math.max(ay, by) < w.y0 || Math.min(ay, by) > w.y1) continue;
    let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay; let ok = true;
    for (const [p, q] of [[-dx, ax - w.x0], [dx, w.x1 - ax], [-dy, ay - w.y0], [dy, w.y1 - ay]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } } else { const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } }
    }
    if (ok) return true;
  }
  return false;
}
function pushOut(e) {
  for (const w of WALLS) {
    const nx = clamp(e.x, w.x0, w.x1), ny = clamp(e.y, w.y0, w.y1); let dx = e.x - nx, dy = e.y - ny; const d = Math.hypot(dx, dy);
    if (d >= e.r) continue;
    if (d > 0.001) { e.x = nx + dx / d * e.r; e.y = ny + dy / d * e.r; continue; }
    const l = e.x - w.x0, r = w.x1 - e.x, u = e.y - w.y0, b = w.y1 - e.y, m = Math.min(l, r, u, b);
    if (m === l) e.x = w.x0 - e.r; else if (m === r) e.x = w.x1 + e.r; else if (m === u) e.y = w.y0 - e.r; else e.y = w.y1 + e.r;
  }
}
const inWall = (x, y, pad) => WALLS.some(w => x > w.x0 - pad && x < w.x1 + pad && y > w.y0 - pad && y < w.y1 + pad);

let G = null;
function snd(k, x, y) { if (root.SBL_SND && G && !G.mute) root.SBL_SND(k, x, y); }
function ent(o) { return Object.assign({ slowT: 0, slowV: 0, rootT: 0, hasteT: 0, hasteV: 1, invisT: 0, shield: 0, shieldT: 0, invuln: 0, shelterT: 0, dead: false }, o); }
function float(x, y, t, col) { G.fx.push({ k: 't', x, y, t: String(t), col: col || '#fff', life: 0.8 }); }
function ring(x, y, r, col, life) { G.fx.push({ k: 'r', x, y, r, col, life: life || 0.35, max: life || 0.35 }); }
function line(x1, y1, x2, y2, col) { G.fx.push({ k: 'l', x: x1, y: y1, x2, y2, col, life: 0.12, max: 0.12 }); }
function foes(team, x, y, r, unitsToo) { const o = []; for (const h of G.heroes) if (!h.dead && h.team !== team && Math.hypot(h.x - x, h.y - y) < r + h.r) o.push(h); if (unitsToo !== false) for (const u of G.units) if (!u.dead && u.team !== team && Math.hypot(u.x - x, u.y - y) < r + u.r) o.push(u); return o; }
function pals(team, x, y, r) { const o = []; for (const h of G.heroes) if (!h.dead && h.team === team && Math.hypot(h.x - x, h.y - y) < r + h.r) o.push(h); for (const u of G.units) if (!u.dead && u.team === team && Math.hypot(u.x - x, u.y - y) < r + u.r) o.push(u); return o; }
function hlv() { const g = CFG.heroGrow; return g ? Math.max(0, Math.min(g.max, Math.floor(G.t / g.every))) : 0; }
const bal = (h, k) => { const b = CFG.hb[h.def.id]; return b && b[k] !== undefined ? b[k] : 1; };
// what the pick screen shows: the real numbers after the balance multipliers, to the nearest 10
const say = (def, s) => s.replace(/\{(\d+)\}/g, (m, v) => Math.round(v * bal({ def }, 'dmg') / 10) * 10), hpOf = def => Math.round(def.hp * bal({ def }, 'hp') / 10) * 10;
// opts: quiet (no number), from (who to point the hit marker at), noCharge (super damage does not charge the super)
function hurt(e, d, src, o) {
  o = o || {}; if (e.dead || e.invuln > 0) return;
  if (e.isHero) { const f = o.from || src; if (f && f !== e) e.hitFrom = { x: f.x, y: f.y, t: G.t }; }
  if (src && src.isHero) { d *= bal(src, 'dmg'); if (!e.isHero) d *= CFG.heroUnitMul; }
  if (CFG.heroGrow) { if (src && src.isHero && e.isHero) d *= 1 + hlv() * CFG.heroGrow.dmg; if (e.isHero) d /= 1 + hlv() * CFG.heroGrow.hp; }
  if (e.shelterT > 0) d *= 0.6;
  if (e.shield > 0) { const a = Math.min(e.shield, d); e.shield -= a; d -= a; }
  if (d <= 0) return;
  const real = Math.min(d, e.hp); e.hp -= d;
  if (src && src.isHero) { G.stats.dmg[src.def.id] = (G.stats.dmg[src.def.id] || 0) + real; if (!o.noCharge && src.sup < 1) { src.sup = Math.min(1, src.sup + real / (src.def.sup.hits * src.def.atk.dmg * (src.def.atk.n || 1)) * (e.isHero ? 1 : CFG.supUnit)); if (src.sup >= 1 && src === G.me) snd('ready', src.x, src.y); } }
  if (e.isHero) { e.hitT = CFG.regenWait; if (e === G.me) snd('hurt', e.x, e.y); }
  let quiet = o.quiet;
  if (quiet && e.isHero) { e.qacc = (e.qacc || 0) + d; if (e.qacc >= 400) { d = e.qacc; e.qacc = 0; quiet = false; } }
  if (!quiet) float(e.x + rnd(-8, 8), e.y - e.r - 10, Math.round(d), e === G.me ? '#ff6b5e' : e.isHero ? '#fff' : '#fac775');
  if (e.hp <= 0) kill(e, src);
}
function heal(e, d, quiet) { if (e.dead) return; const b = e.hp; e.hp = Math.min(e.maxhp, e.hp + d); if (!quiet && e.hp - b > 40) float(e.x, e.y - e.r - 10, '+' + Math.round(e.hp - b), '#c0dd97'); }
function kill(e, src) {
  e.dead = true;
  if (!e.isHero) {
    snd(e.tier === 5 ? 'split' : 'die', e.x, e.y);
    if (e.tier === 5) for (let i = 0; i < 2; i++) spawnUnit(e.team, e.kind, 2, e.lane, e.x + rnd(-16, 16), e.y + rnd(-16, 16));
    if (src && src.isHero) { G.stats.heroUnitKills++; if (src.def.onUnitKill) src.def.onUnitKill(src, e); } else G.stats.unitUnitKills++;
  } else {
    G.stats.heroKills++; G.stats.deaths[e.def.id] = (G.stats.deaths[e.def.id] || 0) + 1;
    if (src && src.isHero) G.stats.kills[src.def.id] = (G.stats.kills[src.def.id] || 0) + 1;
    e.respawn = CFG.respawn;
    if (!(e.shelterT > 0)) { for (let i = 0; i < e.seeds; i++) dropSeed(e.x + rnd(-50, 50), e.y + rnd(-50, 50), e.x, e.y); e.seeds = 0; }
    snd('down', e.x, e.y);
  }
  ring(e.x, e.y, e.r * 2.2, TCOL[e.team]);
}
function slow(e, t, v) { e.slowT = Math.max(e.slowT, t); e.slowV = Math.max(e.slowV, v); }
function rootE(e, t) { e.rootT = Math.max(e.rootT, t); }
function haste(e, t, v) { e.hasteT = Math.max(e.hasteT, t); e.hasteV = v; }
function dropSeed(x, y, fx, fy) {
  x = clamp(x, 24, W - 24); y = clamp(y, 24, H - 24);
  for (const w of WALLS) if (x > w.x0 - 20 && x < w.x1 + 20 && y > w.y0 - 20 && y < w.y1 + 20) x = x < (w.x0 + w.x1) / 2 ? w.x0 - 22 : w.x1 + 22;   // never inside a wall
  G.seeds.push({ x: fx === undefined ? x : fx, y: fy === undefined ? y : fy, tx: x, ty: y, to: null });
}
function shoot(h, ang, o) { G.projs.push(Object.assign({ x: h.x + Math.cos(ang) * h.r, y: h.y + Math.sin(ang) * h.r, vx: Math.cos(ang) * o.speed, vy: Math.sin(ang) * o.speed, left: o.range, team: h.team, owner: h, hit: new Set(), r: 8, col: TCOL[h.team] }, o)); }
function lob(h, x, y, o) { G.lobs.push(Object.assign({ x, y, team: h.team, owner: h, t: o.delay, max: o.delay, sx: h.x, sy: h.y }, o)); }
function zone(h, x, y, o) { const z = Object.assign({ x, y, team: h.team, owner: h, acc: 0, every: 0.5, arm: 0, max: o.dur, seen: new Set() }, o); G.zones.push(z); return z; }
function angd(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function cone(h, a, range, half, dmg, col, onHit) {
  for (const e of foes(h.team, h.x, h.y, range)) if (Math.abs(angd(Math.atan2(e.y - h.y, e.x - h.x), a)) < half && !blocked(h.x, h.y, e.x, e.y)) { hurt(e, typeof dmg === 'function' ? dmg(e) : dmg, h); if (onHit && !e.dead) onHit(e); }
  G.fx.push({ k: 'c', x: h.x, y: h.y, a, half, r: range, col, life: 0.15, max: 0.15 });
}
const back = u => u.team === BLUE ? 1 : -1;         // y direction toward a unit's own base
function shove(u, d) { if (u.isHero) return; u.y = clamp(u.y + back(u) * d * (u.tier === 5 ? 0.5 : 1), 30, H - 30); }

// ---- heroes. hp, damage per hit, range (tiles x 47.6), reload, speed and hits-to-super follow the named Brawl Stars hero.
const LP = [0, 1, 2, 3, 3, 5];   // what each body costs a Lure
const HEROES = [
{ id: 'bramble', name: 'Bramble', col: '#639922', ref: 'El Primo', hp: 6000, spd: 122, atkRange: 135,
  adesc: 'Maul: short wide swipe, {1400}. Units it hits are knocked back down their lane.',
  atk: { dmg: 1400, reload: 0.9, gap: 0.35, shape: 'cone', range: 143, half: 0.8, fn(h, a) { cone(h, a, 143, 0.8, 1400, '#c0dd97', e => shove(e, 70)); } },
  sup: { name: 'Briar ring', hits: 3, shape: 'circle', range: 250, r: 140, bot: 'cluster', desc: 'Briar ring: thorns close a stretch of lane for 8 seconds. Units inside are slowed and cut; a hero who walks in is rooted.',
    fn(h, x, y) { zone(h, x, y, { r: 140, dur: 8, arm: 0.6, col: '#3b6d11', label: 'Briar ring', fn(z) { for (const e of foes(z.team, z.x, z.y, z.r)) { if (e.isHero) { if (!z.seen.has(e)) { z.seen.add(e); hurt(e, 600, h, { noCharge: true }); rootE(e, 0.6); } else { hurt(e, 150, h, { quiet: true, noCharge: true }); slow(e, 0.6, 0.3); } } else { hurt(e, 260, h, { quiet: true, noCharge: true }); slow(e, 0.6, 0.5); } } } }); } } },
{ id: 'sow', name: 'Sow', col: '#ef9f27', ref: 'Jessie', hp: 3300, spd: 114, atkRange: 400,
  adesc: 'Feed shot: long single shot, {1060}. It passes through her own units and heals them.',
  atk: { dmg: 1060, reload: 1.8, gap: 0.3, shape: 'line', range: 428, w: 8, fn(h, a) { shoot(h, a, { speed: 455, range: 428, dmg: 1060, healU: 350, col: '#fac775' }); } },
  sup: { name: 'Nursery', hits: 5, shape: 'circle', range: 450, r: 120, bot: 'ownUnits', desc: 'Nursery: a patch on a lane for 10 seconds. Her team\'s units that walk through come out one body bigger.',
    fn(h, x, y) { zone(h, x, y, { r: 120, dur: 10, arm: 0.4, every: 0.25, col: '#fac775', label: 'Nursery', fn(z) { for (const u of G.units) if (!u.dead && u.team === z.team && !u.grown && Math.hypot(u.x - z.x, u.y - z.y) < z.r) growUnit(u); } }); } } },
{ id: 'mower', name: 'Mower', col: '#888780', ref: 'Shelly', hp: 4200, spd: 122, atkRange: 185,
  adesc: 'Wide cut: hits everything in front of him, {1300}. Each unit he kills heals him.',
  atk: { dmg: 1300, reload: 1.4, gap: 0.3, shape: 'cone', range: 200, half: 0.5, fn(h, a) { cone(h, a, 200, 0.5, 1300, '#d3d1c7'); } },
  onUnitKill(h) { heal(h, 150, true); },
  sup: { name: 'Blade trap', hits: 3, shape: 'circle', range: 300, r: 90, bot: 'ahead', desc: 'Blade trap: spinning blades on a lane for 12 seconds. Ground units that walk in are cut down; every 5 it kills give him a seed. Flyers pass over.',
    fn(h, x, y) { zone(h, x, y, { r: 90, dur: 12, arm: 1, every: 0.25, col: '#b4b2a9', label: 'Blade trap', kills: 0, fn(z) { for (const e of foes(z.team, z.x, z.y, z.r)) { if (e.isHero) hurt(e, 250, h, { quiet: true, noCharge: true }); else if (!e.fly) { hurt(e, 700, null, { quiet: true }); if (e.dead) { G.stats.heroUnitKills++; z.kills++; if (z.kills % 5 === 0 && h.seeds < CFG.carry) { h.seeds++; float(h.x, h.y - 40, '+1 seed', '#fac775'); snd('seed', h.x, h.y); } } } } } }); } } },
{ id: 'magpie', name: 'Magpie', col: '#7f77dd', ref: 'Crow', hp: 3000, spd: 130, atkRange: 310,
  adesc: 'Darts: two quick darts, {520} each. A hit knocks a seed off an enemy hero.',
  atk: { dmg: 520, n: 2, reload: 1.4, gap: 0.25, shape: 'line', range: 333, w: 8, fn(h, a) { const st = { done: false }; for (const d of [-0.06, 0.06]) shoot(h, a + d, { speed: 620, range: 333, dmg: 520, r: 6, col: '#cecbf6', onHit(e) { if (e.isHero && e.seeds > 0 && !st.done) { st.done = true; e.seeds--; dropSeed(e.x + rnd(-70, 70), e.y + rnd(-70, 70), e.x, e.y); } } }); } },
  sup: { name: 'Heist', hits: 5, shape: 'line', range: 300, w: 16, bot: 'heist', desc: 'Heist: she dashes, and every seed on the ground and on enemy heroes where she lands flies to her. Enemies there take {900} and are slowed.',
    fn(h, x, y, a) { const st = 12; for (let i = 0; i < 300 / st; i++) { const nx = h.x + Math.cos(a) * st, ny = h.y + Math.sin(a) * st; if (inWall(nx, ny, h.r * 0.6) || nx < h.r || nx > W - h.r || ny < h.r || ny > H - h.r) break; h.x = nx; h.y = ny; } line(h.x - Math.cos(a) * 300, h.y - Math.sin(a) * 300, h.x, h.y, '#cecbf6'); ring(h.x, h.y, 220, '#cecbf6', 0.6); haste(h, 2, 1.4);
      for (const s of G.seeds) if (Math.hypot(s.x - h.x, s.y - h.y) < 220) s.to = h;
      for (const e of G.heroes) if (!e.dead && e.team !== h.team && dist(e, h) < 220 + e.r) { while (e.seeds > 0) { e.seeds--; G.seeds.push({ x: e.x, y: e.y, tx: e.x, ty: e.y, to: h }); } slow(e, 2, 0.5); hurt(e, 900, h, { noCharge: true }); } } } },
{ id: 'drover', name: 'Drover', col: '#1d9e75', ref: 'Pam', hp: 4800, spd: 114, atkRange: 350,
  adesc: 'Prod: three shots in a narrow fan, {420} each.',
  atk: { dmg: 420, n: 3, reload: 1.3, gap: 0.3, shape: 'line', range: 380, w: 14, fn(h, a) { for (const d of [-0.07, 0, 0.07]) shoot(h, a + d, { speed: 620, range: 380, dmg: 420, r: 7, col: '#9fe1cb' }); } },
  sup: { name: 'Rally post', hits: 4, shape: 'circle', range: 400, r: 130, bot: 'ownUnits', desc: 'Rally post: a post on a lane for 10 seconds. Her team\'s units that pass it run 60 percent faster and hit the base twice as hard.',
    fn(h, x, y) { zone(h, x, y, { r: 130, dur: 10, arm: 0.3, every: 0.25, col: '#9fe1cb', label: 'Rally post', fn(z) { for (const u of G.units) if (!u.dead && u.team === z.team && Math.hypot(u.x - z.x, u.y - z.y) < z.r) { haste(u, 6, 1.6); u.stampT = 6; } } }); } } },
{ id: 'thistle', name: 'Thistle', col: '#d4537e', ref: 'Dynamike', hp: 2800, spd: 114, atkRange: 330,
  adesc: 'Shell: lobbed over walls, lands after a moment, {1500} in a small blast.',
  atk: { dmg: 1500, reload: 1.7, gap: 0.35, shape: 'circle', range: 349, r: 60, fn(h, a, x, y) { lob(h, x, y, { r: 60, delay: 0.8, dmg: 1500 }); } },
  sup: { name: 'Seed charge', hits: 3, shape: 'circle', range: 350, r: 150, bot: 'bomb', desc: 'Seed charge: a bomb thrown over walls. It sits for 1.5 seconds, then blows for {2600} in a wide blast.',
    fn(h, x, y) { lob(h, x, y, { r: 150, delay: 1.5, dmg: 2600, big: true, noCharge: true }); } } },
{ id: 'shade', name: 'Nightshade', col: '#534ab7', ref: 'Leon', hp: 3600, spd: 130, atkRange: 118,
  adesc: 'Slash: fast short cut, {1150}. Double from a bush or while unseen, and more for each seed the target carries.',
  atk: { dmg: 1150, reload: 1.0, gap: 0.25, shape: 'cone', range: 128, half: 0.6, fn(h, a) { const b = h.invisT > 0 || h.ambT > 0 ? 2 : 1; h.ambT = 0; cone(h, a, 128, 0.6, e => 1150 * b * (e.isHero ? 1 + 0.1 * Math.min(6, e.seeds) : 1), '#afa9ec'); } },
  sup: { name: 'Vanish', hits: 4, shape: 'self', r: 90, bot: 'ambush', desc: 'Vanish: unseen and 45 percent faster for 4 seconds. Her next slash hits double.',
    fn(h) { h.invisT = 4; h.ambT = 5; haste(h, 4, 1.45); ring(h.x, h.y, 90, '#afa9ec', 0.4); } } },
{ id: 'foxglove', name: 'Foxglove', col: '#d85a30', ref: 'Nita', hp: 3800, spd: 122, atkRange: 335,
  adesc: 'Charm shot: {1000} and a slow. A unit it hits walks back the way it came for a second.',
  atk: { dmg: 1000, reload: 1.5, gap: 0.3, shape: 'line', range: 357, w: 8, fn(h, a) { shoot(h, a, { speed: 600, range: 357, dmg: 1000, col: '#f0997b', onHit(e) { if (e.isHero) slow(e, 1.2, 0.35); else e.backT = 1; } }); } },
  sup: { name: 'Lure', hits: 5, shape: 'circle', range: 400, r: 120, bot: 'ahead', desc: 'Lure: a patch on a lane for 10 seconds. Enemy units that stay in it 1.5 seconds switch to her team. It turns 6 points of bodies (Grunt 1, Brute 2, Splasher 3, Flyer 3, Colossus 5).',
    fn(h, x, y) { zone(h, x, y, { r: 120, dur: 10, arm: 1, every: 0.25, col: '#f0997b', label: 'Lure', pts: 6, fn(z) { for (const u of G.units) { if (u.dead || u.team === z.team || Math.hypot(u.x - z.x, u.y - z.y) > z.r) continue; u.lureT = (u.lureT || 0) + z.every; if (u.lureT >= 1.5 && z.pts >= LP[u.tier]) { z.pts -= LP[u.tier]; u.team = z.team; u.lureT = 0; u.backT = 0; G.stats.turned++; ring(u.x, u.y, 22, '#f0997b', 0.4); float(u.x, u.y - 20, 'turned', '#f0997b'); if (z.pts <= 0) z.dur = 0; } } } }); } } },
{ id: 'bamboo', name: 'Bamboo', col: '#5dcaa5', ref: 'Poco', hp: 5000, spd: 114, atkRange: 300,
  adesc: 'Gourd: lobbed over walls, {900} to enemies. It leaves a puddle for 3 seconds that heals his team and slows enemy units.',
  atk: { dmg: 900, reload: 1.6, gap: 0.3, shape: 'circle', range: 320, r: 70, fn(h, a, x, y) { lob(h, x, y, { r: 70, delay: 0.6, dmg: 900, onLand(l) { zone(h, l.x, l.y, { r: 70, dur: 3, col: '#5dcaa5', puddle: true, fn(z) { for (const e of pals(z.team, z.x, z.y, z.r)) heal(e, e.isHero ? 200 : 75, true); for (const e of foes(z.team, z.x, z.y, z.r, true)) if (!e.isHero) slow(e, 0.6, 0.3); } }); } }); } },
  sup: { name: 'Shelter', hits: 4, shape: 'circle', range: 400, r: 220, bot: 'ally', desc: 'Shelter: a dome for 6 seconds. His team inside takes 40 percent less damage and heals; a hero who dies inside keeps his seeds.',
    fn(h, x, y) { zone(h, x, y, { r: 220, dur: 6, every: 0.25, col: '#9fe1cb', label: 'Shelter', dome: true, fn(z) { for (const e of pals(z.team, z.x, z.y, z.r)) { e.shelterT = 0.3; if (e.isHero) heal(e, 75, true); } } }); } } }
];
function growUnit(u) { u.grown = true; if (u.tier >= 5) { u.hp = u.maxhp; return; } const f = u.hp / u.maxhp; u.tier++; u.fly = u.tier === 4; u.r = TR[u.tier]; u.maxhp *= THP[u.tier] / THP[u.tier - 1]; u.hp = u.maxhp * f; ring(u.x, u.y, 26, '#fac775', 0.4); G.stats.grown++; }

function mkHero(def, team, bot, idx) {
  const b = BASEPOS[team], hp = def.hp * (CFG.hb[def.id] && CFG.hb[def.id].hp || 1);
  return ent({ isHero: true, def, team, bot, idx, ammo: 3, sup: 0, x: b.x + (idx - 1) * 90, y: b.y + (team === BLUE ? -150 : 150), r: 16, hp, maxhp: hp, hitT: 0, botWait: 0, seeds: CFG.startSeeds, seedT: 0, atkCd: 0, aimA: team === BLUE ? -Math.PI / 2 : Math.PI / 2, lane: Math.min(NL - 1, idx), home: Math.min(NL - 1, idx), kind: Math.floor(rnd(0, 3)), think: rnd(0, 0.3), goal: null, plan: null, mx: 0, my: 0 });
}
function newGame(pi, auto, lineup) {
  for (const f of FARMS) { f.t = 0; f.n = 0; }
  G = { heroes: [], units: [], seeds: [], projs: [], lobs: [], zones: [], fx: [], base: [null, { team: BLUE, x: BASEPOS[1].x, y: BASEPOS[1].y, hp: CFG.baseHp, awake: false, gunT: 0 }, { team: RED, x: BASEPOS[2].x, y: BASEPOS[2].y, hp: CFG.baseHp, awake: false, gunT: 0 }],
    stats: { leadChanges: 0, lead: 0, lead60: null, heroUnitKills: 0, unitUnitKills: 0, heroKills: 0, arrived: 0, endBy: null, summoned: [0, 0, 0, 0, 0, 0], sumTeam: [0, 0, 0], arrTeam: [0, 0, 0], pick: {}, turned: 0, grown: 0, dmg: {}, kills: {}, deaths: {}, casts: {} },
    statT: 0, time: CFG.time, over: null, sel: 0, auto: !!auto, t: 0, lateOn: false };
  const o = lineup || [pi].concat(HEROES.map((_, i) => i).filter(i => i !== pi).sort(() => Math.random() - 0.5));
  // seats: the player (or first pick) takes the middle lane of Blue
  G.heroes.push(mkHero(HEROES[o[0]], BLUE, !!auto, 1), mkHero(HEROES[o[1]], BLUE, true, 0), mkHero(HEROES[o[2]], BLUE, true, 2), mkHero(HEROES[o[3]], RED, true, 0), mkHero(HEROES[o[4]], RED, true, 1), mkHero(HEROES[o[5]], RED, true, 2));
  G.me = G.heroes[0];
}
function spawnUnit(team, kind, tier, lane, x, y) {
  const ug = CFG.unitGrow, k = KINDS[kind], hp = k.hp * THP[tier] * CFG.unitHpMul * (ug ? 1 + ug.hp * Math.min(ug.max, Math.floor(G.t / ug.every)) : 1);   // later waves are tougher, so the match ends at a base
  const u = ent({ team, kind, tier, fly: tier === 4, lane, x, y, r: TR[tier], hp, maxhp: hp, atkCd: rnd(0, 1), ox: laneX(lane) + rnd(-LW * 0.3, LW * 0.3), stampT: 0, backT: 0 });
  G.units.push(u); return u;
}
const costOf = tier => CFG.cost[tier];
function canSummon(h, tier) { return !h.dead && h.seeds >= costOf(tier) && G.units.reduce((a, u) => a + (u.team === h.team && !u.dead ? 1 : 0), 0) < CFG.unitCap; }
function summon(h, tier, kind) {
  if (!canSummon(h, tier)) return false;
  h.seeds -= costOf(tier); const p = spawnPt(h.team, h.lane), kd = kind === undefined ? (h === G.me && !G.auto ? G.sel : h.kind) : kind;
  spawnUnit(h.team, kd, tier, h.lane, p.x + rnd(-LW * 0.3, LW * 0.3), p.y + rnd(-10, 10));
  G.stats.summoned[tier]++; G.stats.sumTeam[h.team] += costOf(tier); ring(p.x, p.y, 50, TCOL[h.team], 0.45); float(p.x, p.y - 30, BODIES[tier], '#fac775'); snd(tier >= 4 ? 'tier' : 'plant', p.x, p.y);
  return true;
}
function setLane(h, lane) { h.lane = ((lane % NL) + NL) % NL; if (h === G.me) snd('send', h.x, h.y); }
function castSuper(h, x, y) {
  const sp = h.def.sup; if (h.dead || h.sup < 1) return false;
  let a = Math.atan2(y - h.y, x - h.x);
  if (sp.shape === 'circle') { const d = Math.hypot(x - h.x, y - h.y); if (d > sp.range) { x = h.x + Math.cos(a) * sp.range; y = h.y + Math.sin(a) * sp.range; } }
  h.aimA = a; h.supT = 0.5; sp.fn(h, x, y, a); h.sup = 0; h.invisT = sp.name === 'Vanish' ? h.invisT : 0;
  G.stats.casts[h.def.id] = (G.stats.casts[h.def.id] || 0) + 1; float(h.x, h.y - 46, sp.name, '#fac775'); snd('spell', h.x, h.y); return true;
}
function attack(h, x, y) {
  if (h.dead || h.atkCd > 0 || h.ammo < 1) return false;
  const a = Math.atan2(y - h.y, x - h.x), at = h.def.atk;
  if (at.shape === 'circle') { const d = Math.hypot(x - h.x, y - h.y); if (d > at.range) { x = h.x + Math.cos(a) * at.range; y = h.y + Math.sin(a) * at.range; } }
  h.aimA = a; h.fireT = 0.15; at.fn(h, a, x, y); h.invisT = 0; h.revT = 0.8; h.atkCd = at.gap; h.ammo -= 1; h.hitT = Math.max(h.hitT, CFG.regenWait);
  snd(h.def.id === 'bramble' ? 'punch' : at.shape === 'circle' ? 'throw' : at.shape === 'cone' ? 'slash' : 'shoot', h.x, h.y); return true;
}

// ---- bots
function laneState(team, lane) { // what stands in a lane, seen from team's side
  let foe = 0, own = 0, front = null, ownFront = null;
  for (const u of G.units) { if (u.dead || u.lane !== lane) continue; const adv = team === BLUE ? H - u.y : u.y; // distance from own base end
    if (u.team === team) { own += TM[u.tier]; if (!ownFront || adv > ownFront.adv) ownFront = { u, adv }; } else { foe += TM[u.tier] * (1 + (H - adv) / H); if (!front || adv < front.adv) front = { u, adv }; } }
  return { foe, own, front: front && front.u, ownFront: ownFront && ownFront.u };
}
function waypoint(h, gx, gy) { // next point to walk to, around the wall strips
  if (!blocked(h.x, h.y, gx, gy)) return { x: gx, y: gy };
  const s = Math.sign(gx - h.x) || 1; let best = null, bc = 1e9;
  // the wall strip between the hero and the goal that is nearest to the hero
  let d = -1, dd = 1e9; for (let i = 0; i < NL - 1; i++) { const c = laneR(i) + CFG.divW / 2; if ((c - h.x) * s > -CFG.divW / 2 - 20 && (gx - c) * s > -CFG.divW / 2 - 20) { const q = Math.abs(c - h.x); if (q < dd) { dd = q; d = i; } } }
  if (d < 0) return { x: gx, y: gy };
  const c = laneR(d) + CFG.divW / 2, opts = GAPS.filter(g => g.d === d).map(g => ({ y: clamp(h.y, g.y0 + 28, g.y1 - 28), g })).concat([{ y: Y0 - 34 }, { y: Y1 + 34 }]);
  for (const o of opts) { const cst = Math.abs(o.y - h.y) * 1.001 + Math.abs(gy - o.y) + (o.g ? 0 : 10); /* equal detours: take the nearest opening, the same choice for both teams */ if (cst < bc) { bc = cst; best = o; } }
  const near = { x: c - s * (CFG.divW / 2 + 26), y: best.y }, far = { x: c + s * (CFG.divW / 2 + 26), y: best.y };
  if (Math.abs(h.y - best.y) < 16 && (h.x - near.x) * s > -18) return far;
  return near;
}
function sendWave(h, lane, kind, defend) { // spend what the hero carries on one lane; a defending wave skips Brutes (they walk past fights)
  h.lane = lane; let guard = 0;
  while (h.seeds > 0 && guard++ < 12) { let top = 5; while (top > 1 && h.seeds < costOf(top)) top--; let tier = Math.random() < 0.5 ? top : 1 + Math.floor(rnd(0, top)); if (defend && tier === 2) tier = 1; if (!summon(h, tier, Math.random() < 0.7 ? kind : Math.floor(rnd(0, 3)))) break; }
}
function botSummon(h) {
  if (h.dead) return;
  // a lane where the other team is winning near our base gets units first
  let worst = -1, wv = 0; for (let i = 0; i < NL; i++) { const s = laneState(h.team, i); const v = s.foe - s.own; if (v > wv && s.foe >= 4 && s.front && (h.team === BLUE ? s.front.y > H * 0.45 : s.front.y < H * 0.55)) { wv = v; worst = i; } }
  if (worst >= 0 && h.seeds >= 3 && Math.random() < CFG.botDefend) { const fl = G.units.some(u => !u.dead && u.team !== h.team && u.lane === worst && u.fly); sendWave(h, worst, fl ? 1 : Math.floor(rnd(0, 3)), true); h.plan = null; return; }
  // otherwise save up and send a wave down one lane: the home lane, or the lane where the other team is thinnest
  if (!h.plan) { let lane = h.home; if (Math.random() < 0.45) { let b = 1e9; for (let i = 0; i < NL; i++) { const s = laneState(h.team, i), v = s.foe - s.own * 0.5 + rnd(0, 2); if (v < b) { b = v; lane = i; } } } h.plan = { budget: [4, 5, 6, 8, 9, 10][Math.floor(rnd(0, 6))], lane }; }
  if (h.seeds >= Math.min(CFG.carry, h.plan.budget)) { sendWave(h, h.plan.lane, Math.floor(rnd(0, 3)), false); h.plan = null; }
}
function cluster(team, x, y, range, r, own) { // densest group of units within range; own=true counts the caster's team
  let best = null, bn = 0;
  for (const u of G.units) { if (u.dead || (u.team === team) !== !!own || Math.hypot(u.x - x, u.y - y) > range) continue; let n = 0, cx = 0, cy = 0; for (const v of G.units) if (!v.dead && (v.team === team) === !!own && Math.hypot(v.x - u.x, v.y - u.y) < r) { n += own && v.grown ? 0 : 1; cx += v.x; cy += v.y; } if (n > bn) { bn = n; best = { x: u.x, y: u.y, n }; } }
  return best;
}
function botSuper(h, foeH, fhd) {
  const sp = h.def.sup, b = sp.bot, dir = h.team === BLUE ? 1 : -1; let go = null;
  if (b === 'cluster') { const c = cluster(h.team, h.x, h.y, sp.range, sp.r, false); if (c && c.n >= 4) go = c; else if (foeH && fhd < sp.range && c && c.n >= 2) go = foeH; }
  else if (b === 'ahead') { const c = cluster(h.team, h.x, h.y, sp.range + 60, sp.r + 30, false); if (c && c.n >= (h.def.id === 'foxglove' ? 3 : 4)) go = { x: c.x, y: c.y + dir * 55 }; }
  else if (b === 'ownUnits') { const c = cluster(h.team, h.x, h.y, sp.range, sp.r + 40, true); if (c && c.n >= 3) go = { x: c.x, y: c.y - dir * 70 }; }
  else if (b === 'heist') { if (foeH && fhd < 290 && !blocked(h.x, h.y, foeH.x, foeH.y)) { const n = G.seeds.filter(s => dist(s, foeH) < 200).length + G.heroes.filter(e => e.team !== h.team && !e.dead && dist(e, foeH) < 200).reduce((a, e) => a + e.seeds, 0); if (n >= 3 && h.seeds < CFG.carry - 2 || foeH.hp < 1100) go = foeH; } }
  else if (b === 'bomb') { const c = cluster(h.team, h.x, h.y, sp.range, sp.r, false); if (c && c.n >= 4) go = { x: c.x, y: c.y + dir * 40 }; else if (foeH && fhd < sp.range && (foeH.rootT > 0 || foeH.slowT > 0 || fhd < 200)) go = foeH; }
  else if (b === 'ambush') { if (foeH && fhd < 380 && h.hp > h.maxhp * 0.5) go = h; }
  else if (b === 'ally') { const n = pals(h.team, h.x, h.y, sp.range); const hurtH = n.find(e => e.isHero && e.hp < e.maxhp * 0.55); if (hurtH && foes(h.team, hurtH.x, hurtH.y, 300).length >= 2) go = hurtH; else { const c = cluster(h.team, h.x, h.y, sp.range, sp.r, true); if (c && c.n >= 5 && foes(h.team, c.x, c.y, 260).length >= 3) go = c; } }
  if (go) castSuper(h, go.x, go.y);
}
function botThink(h, dt) {
  const at = h.def.atk, lobber = at.shape === 'circle', see = e => lobber || !blocked(h.x, h.y, e.x, e.y);
  let foeH = null, fhd = 1e9; for (const e of G.heroes) if (e.team !== h.team && !e.dead && e.invisT <= 0) { const d = dist(e, h); if (d < fhd) { fhd = d; foeH = e; } }
  let tgt = null, td = 1e9;
  if (foeH && fhd < h.def.atkRange + 150 && see(foeH)) { tgt = foeH; td = fhd; }
  if (!tgt || td > h.def.atkRange + 20) for (const u of G.units) if (!u.dead && u.team !== h.team) { const d = dist(u, h); if (d < h.def.atkRange + 60 && d < td && see(u)) { td = d; tgt = u; } }
  h.think -= dt;
  if (h.think <= 0) {
    h.think = 0.35; const home = BASEPOS[h.team], dir = h.team === BLUE ? 1 : -1;
    botSummon(h);
    if (h.hp < h.maxhp * 0.3 || (h.goal && h.goal.heal && h.hp < h.maxhp * 0.8)) h.goal = { x: home.x + (h.idx - 1) * 50, y: home.y - dir * 140, heal: true };
    else {
      let sd = null, sdd = h.seeds < 4 ? 520 : 300; if (h.seeds < CFG.carry) for (const s of G.seeds) { if (s.to || inWall(s.x, s.y, 10)) continue; const d0 = dist(s, h); if (G.heroes.some(e => e !== h && e.team === h.team && !e.dead && e.seeds < CFG.carry && dist(s, e) < d0)) continue; const d = d0 + (foes(h.team, s.x, s.y, 170, false).length ? 220 : 0); if (d < sdd) { sdd = d; sd = s; } }
      if (sd) h.goal = { x: sd.x, y: sd.y };
      else { const s = laneState(h.team, h.home), lx = laneX(h.home) + (h.idx - 1) * 30; let gy;
        if (s.front) gy = s.front.y + dir * Math.max(60, h.def.atkRange * 0.72);
        else if (s.ownFront) gy = s.ownFront.y + dir * 50;
        else gy = H / 2 + dir * 130;
        if (h.team === BLUE) gy = clamp(gy, Y0 + 120, H - 150); else gy = clamp(gy, 150, Y1 - 120);
        h.goal = { x: lx, y: gy }; }
    }
  }
  let mx = 0, my = 0;
  if (h.goal) { const w = waypoint(h, h.goal.x, h.goal.y), dx = w.x - h.x, dy = w.y - h.y, d = Math.hypot(dx, dy); if (d > 12) { mx = dx / d; my = dy / d; } }
  if (tgt && tgt.isHero && !(h.goal && h.goal.heal)) {
    const dx = tgt.x - h.x, dy = tgt.y - h.y;
    if (h.hp > h.maxhp * 0.4 && td > h.def.atkRange * 0.85 && see(tgt)) { mx = mx * 0.4 + dx / td * 0.6; my = my * 0.4 + dy / td * 0.6; }      // close in
    else if (h.def.atkRange > 250 && td < 150) { mx = mx * 0.3 - dx / td * 0.7; my = my * 0.3 - dy / td * 0.7; }                            // step back from melee
  }
  // do not stand in the other base's gun
  const eb = BASEPOS[3 - h.team]; if (dist(eb, h) < CFG.baseGun.range + 30) { const d = dist(eb, h) || 1; mx += (h.x - eb.x) / d; my += (h.y - eb.y) / d; }
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  h.mx = mx; h.my = my;
  if (tgt) { h.aimA = Math.atan2(tgt.y - h.y, tgt.x - h.x);
    if (td < h.def.atkRange + tgt.r && h.atkCd <= 0 && h.ammo >= 1) { if (!tgt.isHero) attack(h, tgt.x, tgt.y); else if (h.botWait > 0) h.botWait -= dt; else { const a = h.aimA + rnd(-0.2, 0.2); attack(h, h.x + Math.cos(a) * td, h.y + Math.sin(a) * td); h.botWait = rnd(0.3, 0.8); } } }
  if (h.sup >= 1) botSuper(h, foeH, fhd);
}

function moveHero(e, vx, vy, dt) { e.x += vx * dt; e.y += vy * dt; pushOut(e); e.x = clamp(e.x, e.r, W - e.r); e.y = clamp(e.y, e.r, H - e.r); }
function moveUnit(u, vx, vy, dt) { u.x += vx * dt; u.y += vy * dt; if (inSpan(u.y)) u.x = clamp(u.x, laneL(u.lane) + u.r, laneR(u.lane) - u.r); u.x = clamp(u.x, u.r, W - u.r); u.y = clamp(u.y, u.r, H - u.r); }
function spd(e, base) { return e.rootT > 0 ? 0 : base * (e.hasteT > 0 ? e.hasteV : 1) * (e.slowT > 0 ? 1 - e.slowV : 1); }
function tickStatus(e, dt) { for (const k of ['slowT', 'rootT', 'hasteT', 'invisT', 'shieldT', 'stampT', 'invuln', 'ambT', 'revT', 'shelterT', 'backT', 'supT']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt); if (e.slowT <= 0) e.slowV = 0; }

function update(dt) {
  if (!G || G.over) return; G.t += dt; G.time -= dt;
  if (G.time <= 0) { const b = G.base[1].hp, r = G.base[2].hp; G.over = b === r ? 'Draw' : b > r ? 'Blue wins' : 'Red wins'; G.stats.endBy = 'timer'; return; }
  G.statT += dt; if (G.statT >= 1) { G.statT -= 1; const st = G.stats, ld = Math.sign(G.base[1].hp - G.base[2].hp); if (ld && st.lead && ld !== st.lead) st.leadChanges++; if (ld) st.lead = ld; if (st.lead60 === null && CFG.time - G.time >= 60) st.lead60 = ld; }
  if (CFG.late && !G.lateOn && G.time <= CFG.late.at) { G.lateOn = true; for (const b of [G.base[1], G.base[2]]) { float(b.x, b.y - 90, 'base hits count double', '#fac775'); ring(b.x, b.y, 200, '#fac775', 1); } snd('awake', G.me.x, G.me.y); }
  const me = G.me, I = root.SBL_INPUT;
  if (!G.auto && !me.dead && I) { me.mx = I.mx; me.my = I.my; if (I.aimA !== null) me.aimA = I.aimA; if (I.fire) { attack(me, me.x + Math.cos(I.fireA) * I.fireD, me.y + Math.sin(I.fireA) * I.fireD); I.fire = I.hold; } }
  const lead = G.base[1].hp - G.base[2].hp;
  G.flip = !G.flip;                                   // heroes and units act in alternating order, so neither team always moves first
  for (const h of G.heroes) {
    if (h.dead) { h.respawn -= dt; if (h.respawn <= 0) { const b = BASEPOS[h.team]; Object.assign(h, { dead: false, hp: h.maxhp, ammo: 3, x: b.x + rnd(-80, 80), y: b.y + (h.team === BLUE ? -150 : 150), slowT: 0, rootT: 0, invuln: 1.5, goal: null }); } continue; }
    tickStatus(h, dt); h.atkCd = Math.max(0, h.atkCd - dt); h.ammo = Math.min(3, h.ammo + dt / h.def.atk.reload); if (h.fireT > 0) h.fireT -= dt;
    h.inBush = BUSHES.some(b => Math.hypot(h.x - b.x, h.y - b.y) < b.r); if (h.inBush && !(h.revT > 0) && !G.heroes.some(e => e.team !== h.team && !e.dead && dist(e, h) < 95)) h.invisT = Math.max(h.invisT, 0.08);
    if (h.hitT > 0) h.hitT -= dt; else h.hp = Math.min(h.maxhp, h.hp + h.maxhp * CFG.regen * dt);
    // seeds trickle in; the team whose base is behind gets them faster
    const behind = h.team === BLUE ? -lead : lead, cm = CFG.comeback && behind > 0 ? 1 + CFG.comeback.under * 2 * behind / CFG.baseHp : 1;
    h.seedT += dt * cm * (1 + CFG.seedRamp * G.t / CFG.time); if (h.seedT >= CFG.seedEvery) { h.seedT = 0; if (h.seeds < CFG.carry) h.seeds++; }
    if (h.bot) botThink(h, dt);
    const s = spd(h, h.def.spd); moveHero(h, h.mx * s, h.my * s, dt);
    for (let i = G.seeds.length - 1; i >= 0; i--) { const sd = G.seeds[i]; if (h.seeds < CFG.carry && Math.hypot(sd.x - h.x, sd.y - h.y) < 32 && (!sd.to || sd.to === h)) { G.seeds.splice(i, 1); h.seeds++; { const fi = FARMS.findIndex(f => Math.hypot(f.x - sd.tx, f.y - sd.ty) < 120), k = h.team + ':' + (fi < 0 ? 'drop' : fi); G.stats.pick[k] = (G.stats.pick[k] || 0) + 1; } if (h === me) snd('seed', h.x, h.y); } }
    if (CFG.heroGrow) { const l = hlv(); if (l !== (h.lv || 0)) { h.lv = l; float(h.x, h.y - h.r - 26, 'level ' + (l + 1), '#fac775'); ring(h.x, h.y, 60, '#fac775', 0.5); } }
    const ob = BASEPOS[h.team]; if (dist(ob, h) < 190) h.hp = Math.min(h.maxhp, h.hp + 800 * dt);
  }
  for (const f of FARMS) { f.t += dt; if (f.t >= f.every) { f.t = 0; if (G.seeds.filter(s => Math.hypot(s.tx - f.x, s.ty - f.y) < 110).length < f.cap) { const a = rnd(0, 6.28), d = rnd(42, 80); dropSeed(f.x + Math.cos(a) * d * (f.mid ? 0.45 : 1), f.y + Math.sin(a) * d, f.x, f.y); snd('sspawn', f.x, f.y); } } }
  for (const b of [G.base[1], G.base[2]]) {
    const bg = CFG.baseGun; b.gunT -= dt; let e = null, bd = bg.range;
    for (const u of G.units) if (!u.dead && u.team !== b.team) { const d = dist(u, b); if (d < bd) { bd = d; e = u; } }
    for (const h of G.heroes) if (!h.dead && h.team !== b.team && h.invisT <= 0) { const d = dist(h, b); if (d < bd) { bd = d; e = h; } }
    if (e && !b.awake) { b.awake = true; ring(b.x, b.y, bg.range, TCOL[b.team], 0.8); float(b.x, b.y - 70, 'base awake', TCOL[b.team]); snd('awake', b.x, b.y); }
    if (e && b.gunT <= 0) { b.gunT = bg.every; b.shotT = G.t; line(b.x, b.y, e.x, e.y, TCOL[b.team]); hurt(e, bg.dmg, null, { from: b }); snd('bshot', b.x, b.y); }
  }
  for (const u of G.units) {
    if (u.dead) continue; tickStatus(u, dt); u.atkCd -= dt; const k = KINDS[u.kind];
    let foe = null, fd = k.range + 60; const air = k.range > 60 || u.tier === 3 || u.fly;
    if (u.tier !== 2 && !(u.backT > 0)) {
      for (const e of G.units) if (!e.dead && e.team !== u.team && (air || !e.fly)) { const d = dist(e, u) - e.r; if (d < fd && (e.lane === u.lane || !blocked(u.x, u.y, e.x, e.y))) { fd = d; foe = e; } }
      for (const e of G.heroes) if (!e.dead && e.team !== u.team && e.invisT <= 0) { const d = dist(e, u) - e.r; if (d < fd && !blocked(u.x, u.y, e.x, e.y)) { fd = d; foe = e; } }
    }
    if (foe) {
      if (fd <= k.range) { if (u.atkCd <= 0) { u.atkCd = 1; hurt(foe, k.dmg * TD[u.tier] * CFG.unitDmgMul, null, { quiet: true, from: u }); snd(['', 'grunt', 'brute', 'splash', 'flyer', 'stomp'][u.tier], u.x, u.y);
          if (u.tier === 3) { ring(foe.x, foe.y, 46, k.col, 0.3); for (const e of G.units) if (e !== foe && !e.dead && e.team !== u.team && Math.hypot(e.x - foe.x, e.y - foe.y) < 46) hurt(e, k.dmg * TD[3] * CFG.unitDmgMul * 0.6, null, { quiet: true }); }
          if (k.range > 60) line(u.x, u.y, foe.x, foe.y, k.col); } }
      else { const d = dist(foe, u) || 1, s = spd(u, k.spd); moveUnit(u, (foe.x - u.x) / d * s, (foe.y - u.y) / d * s, dt); }
      continue;
    }
    const eb = G.base[3 - u.team], s = spd(u, k.spd), fwd = -back(u) * (u.backT > 0 ? -1 : 1);
    const past = u.team === BLUE ? u.y < Y0 + 6 : u.y > Y1 - 6;
    if (past && !(u.backT > 0)) {
      const d = dist(eb, u);
      if (d < 46) { u.dead = true; G.stats.arrived++; G.stats.arrTeam[u.team]++; const dm = TM[u.tier] * (u.stampT > 0 ? 2 : 1) * (CFG.late && G.time <= CFG.late.at ? CFG.late.base : 1); eb.hp -= dm; ring(eb.x, eb.y, 60, TCOL[u.team], 0.3); float(eb.x + rnd(-30, 30), eb.y - 60, '-' + dm, TCOL[u.team]); snd(u.tier === 2 ? 'brute' : u.tier === 5 ? 'stomp' : 'hit', eb.x, eb.y);
        if (eb.hp <= 0) { eb.hp = 0; G.over = u.team === BLUE ? 'Blue wins' : 'Red wins'; G.stats.endBy = 'base'; } continue; }
      moveUnit(u, (eb.x - u.x) / d * s, (eb.y - u.y) / d * s, dt);
    } else { const dx = clamp((u.ox - u.x) / 60, -0.5, 0.5); moveUnit(u, dx * s, fwd * s, dt); }
  }
  { const U = G.units; for (let i = 0; i < U.length; i++) { const a = U[i]; if (a.dead) continue; for (let j = i + 1; j < U.length; j++) { const b = U[j]; if (b.dead || a.fly !== b.fly) continue; let dx = b.x - a.x, dy = b.y - a.y; const m = (a.r + b.r) * 0.95; if (Math.abs(dx) > m || Math.abs(dy) > m) continue; let d = Math.hypot(dx, dy); if (d >= m) continue; if (d < 0.05) { dx = rnd(-1, 1); dy = rnd(-1, 1); d = Math.hypot(dx, dy) || 1; } const q = (m - d) * 0.3 / d; a.x -= dx * q; a.y -= dy * q; b.x += dx * q; b.y += dy * q; } } }
  for (const p of G.projs) {
    const st = Math.hypot(p.vx, p.vy) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.left -= st;
    if (inWall(p.x, p.y, 0) || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.left = 0; ring(p.x, p.y, 12, '#d3d1c7', 0.15); continue; }
    if (p.healU) for (const u of G.units) if (!u.dead && u.team === p.team && !p.hit.has(u) && Math.hypot(u.x - p.x, u.y - p.y) < p.r + u.r) { p.hit.add(u); heal(u, p.healU, true); ring(u.x, u.y, 16, '#c0dd97', 0.25); }
    for (const e of foes(p.team, p.x, p.y, p.r)) { if (p.hit.has(e)) continue; p.hit.add(e); hurt(e, p.dmg, p.owner); if (p.onHit && !e.dead) p.onHit(e); snd('hit', p.x, p.y); if (!p.pierce) { p.left = 0; break; } }
  }
  G.projs = G.projs.filter(p => p.left > 0);
  for (const l of G.lobs) { l.t -= dt; if (l.t <= 0) { for (const e of foes(l.team, l.x, l.y, l.r)) hurt(e, l.dmg, l.owner, { noCharge: l.noCharge }); if (l.onLand) l.onLand(l); ring(l.x, l.y, l.r, '#fff', l.big ? 0.5 : 0.3); snd('boom', l.x, l.y); } }
  G.lobs = G.lobs.filter(l => l.t > 0);
  for (const z of G.zones) { if (z.arm > 0) { z.arm -= dt; continue; } z.dur -= dt; z.acc += dt; while (z.acc >= z.every) { z.acc -= z.every; z.fn(z); } }
  G.zones = G.zones.filter(z => z.dur > 0);
  G.units = G.units.filter(u => !u.dead);
  for (const s of G.seeds) { if (s.to) { if (s.to.dead) s.to = null; else { const d = dist(s.to, s) || 1; s.x += (s.to.x - s.x) / d * 700 * dt; s.y += (s.to.y - s.y) / d * 700 * dt; continue; } } s.x += (s.tx - s.x) * Math.min(1, dt * 6); s.y += (s.ty - s.y) * Math.min(1, dt * 6); }
  for (const f of G.fx) f.life -= dt; G.fx = G.fx.filter(f => f.life > 0);
}

root.SBL = { get G() { return G; }, start: newGame, update, spawnUnit, HEROES, KINDS, BODIES, CFG, TM, castSuper, attack, summon, canSummon, setLane, costOf, laneX, laneL, laneR, laneOf, spawnPt, blocked, WALLS, GAPS, FARMS, BUSHES, BASEPOS, W, H, T, NL, LW, Y0, Y1, BLUE, RED, hlv, say, hpOf };
})(typeof window !== 'undefined' ? window : globalThis);
