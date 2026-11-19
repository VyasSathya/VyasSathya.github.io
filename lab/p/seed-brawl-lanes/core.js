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
  // defending is cheaper than attacking (Clash Royale's answer to a losing side), each off unless set:
  homeGround: null,         // {third, dmg, take}: creeps in the part of the map nearest their own base (third of its length) hit dmg x harder and take take x damage
  gunRage: null,            // {dmg, every}: the base gun hits harder and fires faster as its base loses health (x(1 + dmg * lost share), every / (1 + every * lost share))
  behindRespawn: null,      // {min, at}: heroes of the team whose base is behind come back sooner, down to min x the respawn time when behind by at least at
  supChargeBase: false,     // true: damage on units charges the super as if the hero-vs-homie boost (heroVsUnit, build 16) were not there
  supUnit: 0.35,            // share of damage done to units that charges the super
  regenWait: 3, regen: 0.13,
  botDefend: 0.5,           // how often a bot answers a lane that is being lost (per think)
  // 2026-11-14 polish (every number picked by Claude, not ruled by the owner; work/polish/rules.md has the measurements). null turns one off.
  space: { mul: 2.1, push: 0.5, side: 0.3, own: true },   // creeps of one team keep apart by mul x their rules radius (about the width they are drawn), mostly across the lane (side), so a group reads as single creeps; creeps of the two teams keep the old 0.95; hit sizes are unchanged
  respawnGuard: null,       // {r, shove, root}: coming back to life pushes enemy creeps within r of the base back down their lane by shove and holds them root seconds
  deadPlay: true,           // (shipped: off) a dead hero still earns seeds and can play cards (they come out at his lane's end as always)
  deathKeep: 0,             // share of the seeds he carries that a hero keeps when he dies (the rest drop where he fell)
  respawnInvuln: 3,         // (shipped 1.5) seconds a hero who comes back to life cannot be hurt
  handCheap: 2,             // cost: the hand always holds a card of this cost or less while one waits in the line
  respawnBack: true,        // come back to life behind the base (between it and the map edge) instead of in front of it
  // 2026-11-18 (ff-flow, Claude's pick, not his): the back spot is x +-80 of the base centre, inside the base's 3 tile width, so the base
  // covered the hero. respawnSide puts him beside the base instead, dx from its centre on the side he died on, dy toward the map edge;
  // the spot is chosen when he dies (h.spawnAt) so the camera can be there first. ?respawn=back is the build 20 spot; null = respawnBack.
  respawnSide: { dx: [125, 150], dy: [0, 30] },
  handDear: null,           // cost: the hand holds at most one card of this cost or more while a cheaper card waits in the line, so something is always playable soon
  creep: {},                // per creep multipliers on the kind x body numbers {'<kind id>_<tier>': {hp, dmg, spd, range}} (work/balance/creeps.md)
  hb: {}                    // per hero balance multipliers {id:{hp,dmg}}
}, root.SBL_CFG || {});
const TM = CFG.TM, THP = CFG.THP, TD = CFG.TD, TR = CFG.TR;
// ---- homies (2026-11-15, work/homies-rules): each hero brings five units of his own, tiers 1 to 5. The tier is cost, size and
// base damage; the type is what it does. Every number is data (CFG.homies in sim/lanes-shipped.json). ?homies=0 plays the shared
// 15 creeps exactly as build 7/8 did; ?homies=1 forces the homies on.
const HOM = CFG.homies && CFG.homies.units ? CFG.homies : null;
const QS = (root.location && root.location.search) || '';
const HON = !!HOM && (/[?&]homies=1/.test(QS) || (HOM.on !== false && !/[?&]homies=0/.test(QS)));
// the seven types, each implemented once: air = can hit flyers, noAtk = never stops to fight, fly = only air hitters reach it,
// splash = hits a group, siege = stops outside the base gun and throws at the base, aggro = how far past its reach it picks a fight
const TYPES = {
  M: { name: 'Melee', air: false, aggro: 60 }, R: { name: 'Ranged', air: true, aggro: 60 }, F: { name: 'Runner', air: false, aggro: 15 },
  T: { name: 'Tank', noAtk: true }, S: { name: 'Splash', air: true, splash: true, aggro: 60 }, A: { name: 'Flyer', air: true, fly: true, aggro: 60 },
  G: { name: 'Siege', noAtk: true, siege: true } };
// which shared creep kind and body a type sounds and splashes like (sound cues and effects only; the model is lanes/homie-models.js)
const TBODY = { M: [0, 1], R: [1, 1], F: [2, 1], T: [0, 2], S: [0, 3], A: [1, 4], G: [1, 3] };
const HD = {}; if (HOM) for (const id in HOM.units) { const d = HOM.units[id]; HD[id] = Object.assign({ id, crash: 1, atk: 1, splashR: 46 }, d); }
const SIEGE = Object.assign({ stop: 300, every: 3, share: 0.25, throws: 6 }, HOM && HOM.siege);
const LADDER = (HOM && HOM.ladder) || [0, 1, 1.6, 2.1, 3, 4.6];
// homie bodies keep apart by their drawn size (homies.space: body radius per tier in rules units, same team x same, two teams x foe; a
// hero's body radius; push share a step). Absent = the build 8 rule only. Homies on only: the shared creeps keep build 8's rule exactly.
const HSP = HON && HOM.space ? HOM.space : null, bodyR = u => HSP.body[Math.min(5, u.tier)];
if (HON && HOM.cfg) Object.assign(CFG, HOM.cfg);   // shared rules the homie game plays with other numbers (homies.cfg), e.g. the comeback seeds
const HB = HON && HOM.hb ? HOM.hb : CFG.hb;
// "creeps ignore each other and backdoor" (his words after build 12), homies only (?homies=0 keeps build 8's rules), each part off
// when its homies.* entry is absent:
//   homies.laneReach: a ground homie measures its reach to an enemy ground unit in its own lane along the lane only (the gap across
//     the lane does not count), so units walking down different sides of a lane still meet; the chase and the hit stay 2D.
//   homies.tankHit [per tier]: a tank stops for an enemy ground unit in its reach and hits it for this (units only, never heroes).
//   homies.siegeHit [per tier]: a siege with an enemy ground unit right in front of it in its lane stops and throws at it for this,
//     once a second; with the lane clear it walks on to the base as before.
const LANE = HON && !!HOM.laneReach, TANKHIT = HON && HOM.tankHit, SIEGEHIT = HON && HOM.siegeHit;
// counters (on since build 14, his yes 2026-11-17; ?abil=0 off, ?abil=1 on; sims: homies.abil.on): four body classes read from a homie's type and tier, and the counter
// multipliers between them. s = SMALL (runners, melee under tier 5), B = BIG (tanks, siege, tier 5 melee), S = SHOOTER (ranged,
// splash), F = FLYER. shootFly: shooters on flyers, shootBig: shooters on BIG, smallBig: SMALL on BIG, splashSmall: splash on SMALL.
// Homie on homie only; heroes and the base are untouched. SMALL and BIG cannot hit flyers already (TYPES.air).
const ABIL = HON && !/[?&]abil=0/.test(QS) && (/[?&]abil=1/.test(QS) || !!(HOM.abil && HOM.abil.on)) ? Object.assign({ shootFly: 2, shootBig: 0.25, smallBig: 2, splashSmall: 2, bigShoot: 3, rangedSmall: 0.5 }, HOM.abil) : null;   // setting E of sweep r2
const clsOf = u => u.ty === 'A' ? 'F' : u.ty === 'R' || u.ty === 'S' ? 'S' : u.ty === 'F' || (u.ty === 'M' && u.tier < 5) ? 's' : 'B';
function clsMul(u, e) {
  if (!ABIL || !u.hid || !e.hid) return 1; const a = clsOf(u), b = clsOf(e); let m = 1;
  if (a === 'S' && b === 'F') m *= ABIL.shootFly; if (a === 'S' && b === 'B') m *= ABIL.shootBig; if (a === 's' && b === 'B') m *= ABIL.smallBig; if (u.ty === 'S' && b === 's') m *= ABIL.splashSmall;
  if (a === 'B' && b === 'S') m *= ABIL.bigShoot; if (u.ty === 'R' && b === 's') m *= ABIL.rangedSmall;   // tuning: BIG on shooters, plain ranged on SMALL
  return m; }
if (TANKHIT) Object.assign(TYPES.T, { noAtk: false, tank: true, unitsOnly: true, aggro: 0 });   // hero multipliers: the homie game is balanced on its own
// homies.out: homies with no body that the road never gives (Old Shell, road draft 1): left out of a crew unless the tiers are
// named (an old save that owned him keeps him as build 9 had him, on his stand-in)
const HOUT = new Set((HOM && HOM.out) || []);
// the deck rule (road draft 1): six cards from the tiers owned, one of each, then extra copies from tier 1 upward.
// 3 owned: 1,1,2,2,3,3; 4 owned: 1,1,2,2,3,4; 5 owned: 1,1,2,3,4,5.
const deckTiers = owned => { const u = [...new Set(owned)].sort((a, b) => a - b), d = u.slice(); for (let i = 0; u.length && d.length < 6; i++) d.push(u[i % u.length]); return d.sort((a, b) => a - b); };
// a hero's crew deck; tiers = the tiers he brings (default: every tier he has that takes part)
const crewTiers = (heroId, tiers) => [1, 2, 3, 4, 5].filter(t => HD[heroId + '_' + t] && (tiers ? tiers.includes(t) : !HOUT.has(heroId + '_' + t)));
const crewDeck = (heroId, tiers) => deckTiers(crewTiers(heroId, tiers)).map(t => heroId + '_' + t).map(id => ({ hid: id, tier: HD[id].tier, kind: TBODY[HD[id].type][0] }));
// one creep's numbers: kind x body, times its own multipliers in CFG.creep. ST[kind][tier] = {hp, dmg, range, spd}; hp and dmg before unitHpMul / unitDmgMul
const ST = KINDS.map(k => BODIES.map((b, t) => { const o = (CFG.creep && CFG.creep[k.id + '_' + t]) || {}; return { hp: k.hp * (THP[t] || 0) * (o.hp || 1), dmg: k.dmg * (TD[t] || 0) * (o.dmg || 1), range: k.range * (o.range || 1), spd: k.spd * (o.spd || 1) }; }));
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
// where a hero comes back to life (picked when he dies, h.spawnAt): beside the base on the side he fell (CFG.respawnSide), or the
// build 20 spot (?respawn=back, or respawnSide null): x +-80 of the base, 70 toward the map edge (respawnBack) or 150 toward the field
const RSIDE = !HON || /[?&]respawn=back/.test(QS) ? null : CFG.respawnSide;   // homies on only: ?homies=0 stays build 8 to the frame (offcheck)
function spawnSpot(h) {
  const b = BASEPOS[h.team], away = h.team === BLUE ? 1 : -1;
  if (RSIDE) { const s = h.x < b.x ? -1 : 1; return { x: b.x + s * rnd(RSIDE.dx[0], RSIDE.dx[1]), y: b.y + away * rnd(RSIDE.dy[0], RSIDE.dy[1]) }; }
  return { x: b.x + rnd(-80, 80), y: b.y + away * (CFG.respawnBack ? 70 : -150) };
}
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
let TW = null;   // [towers] lanes/towers.js, set at the end of this file; null = off (build 20 exactly)
// one event, one cue: k is a cue id in lanes/sfx/cues.json; a is who made it (the spam guard is per actor and id; my own are 2D)
function snd(k, x, y, a) { if (root.SBL_SND && G && !G.mute) root.SBL_SND(k, x, y, a); }
const bodyId = u => BODIES[u.body || u.tier].toLowerCase();
// per homie numbers for the balance runs: plays, seeds, damage done, base damage, kills (G.stats.hom[id])
function hs(id) { const S = G.stats.hom || (G.stats.hom = {}); return S[id] || (S[id] = { plays: 0, seeds: 0, dmg: 0, base: 0, kills: 0, team: [0, 0, 0] }); }
function ent(o) { return Object.assign({ slowT: 0, slowV: 0, rootT: 0, hasteT: 0, hasteV: 1, invisT: 0, shield: 0, shieldT: 0, invuln: 0, shelterT: 0, dead: false }, o); }
function float(x, y, t, col) { G.fx.push({ k: 't', x, y, t: String(t), col: col || '#fff', life: 0.8 }); }
function ring(x, y, r, col, life) { G.fx.push({ k: 'r', x, y, r, col, life: life || 0.35, max: life || 0.35 }); }
// things that happened this step, for the client to draw and nothing else (the client empties the list; capped so a run with no client never grows it)
function ev(o) { const E = G.ev || (G.ev = []); if (E.length < 400) E.push(o); }
function line(x1, y1, x2, y2, col) { G.fx.push({ k: 'l', x: x1, y: y1, x2, y2, col, life: 0.12, max: 0.12 }); }
function foes(team, x, y, r, unitsToo, towersToo) { const o = []; for (const h of G.heroes) if (!h.dead && h.team !== team && Math.hypot(h.x - x, h.y - y) < r + h.r) o.push(h); if (unitsToo !== false) for (const u of G.units) if (!u.dead && u.team !== team && Math.hypot(u.x - x, u.y - y) < r + u.r) o.push(u); if (towersToo && TW) TW.foes(team, x, y, r, o); return o; }   // [towers] towersToo: hero attacks also hit enemy towers
function pals(team, x, y, r) { const o = []; for (const h of G.heroes) if (!h.dead && h.team === team && Math.hypot(h.x - x, h.y - y) < r + h.r) o.push(h); for (const u of G.units) if (!u.dead && u.team === team && Math.hypot(u.x - x, u.y - y) < r + u.r) o.push(u); return o; }
function hlv() { const g = CFG.heroGrow; return g ? Math.max(0, Math.min(g.max, Math.floor(G.t / g.every))) : 0; }
const bal = (h, k) => { const b = HB[h.def.id]; return (b && b[k] !== undefined ? b[k] : 1) * (h.crewF || 1); };   // crewF: homies.hbCrew, set when the deck is dealt
// what the pick screen shows: the real numbers after the balance multipliers, to the nearest 10
const say = (def, s) => s.replace(/\{(\d+)\}/g, (m, v) => Math.round(v * bal({ def }, 'dmg') / 10) * 10), hpOf = def => Math.round(def.hp * bal({ def }, 'hp') / 10) * 10;
// opts: quiet (no number), from (who to point the hit marker at), noCharge (super damage does not charge the super)
// hero hits on homies (build 16, his "my auto attack does like absolutely no damage especially as the units scale", "hte hero should
// scale with it and do way more damage"): homies.heroVsUnit {base, perTier, grow}: x base, x (1 + perTier x (tier - 1)) for the homie
// hit, and (grow) the hero's level growth (CFG.heroGrow, every 45 s), which before counted only against heroes. homies=0: unchanged.
// Then his "u should have levels and scale or something", "u get bonuses to ur attack and ur special every level": lv is the bonus per
// hero level (CFG.heroGrow levels, one every 45 s up to 5) on every hero hit on a homie, the attack and the special alike.
function heroVsUnit(e) { const v = HON && HOM.heroVsUnit; if (!v) return 1; const g = CFG.heroGrow;
  return (v.base || 1) * (1 + (v.perTier || 0) * ((e.tier || 1) - 1)) * (v.grow && g ? 1 + hlv() * g.dmg : 1) * (1 + (v.lv || 0) * hlv()); }
function hurt(e, d, src, o) {
  o = o || {}; if (e.dead || e.invuln > 0) return;
  if (o.from && o.from.tier) ev(o.from.hid ? { k: 'uatk', x: o.from.x, y: o.from.y, tx: e.x, ty: e.y, tier: o.from.tier, kind: o.from.kind, team: o.from.team, hid: o.from.hid } : { k: 'uatk', x: o.from.x, y: o.from.y, tx: e.x, ty: e.y, tier: o.from.tier, kind: o.from.kind, team: o.from.team });
  if (e.isHero) { const f = o.from || src; if (f && f !== e) e.hitFrom = { x: f.x, y: f.y, t: G.t }; }
  if (TW) { if (e.isTower) return TW.hurt(e, d, src, o); if (e.isHero && src && src.isHero) TW.heroHit(e, src); }   // [towers]
  let hv = 1; if (src && src.isHero) { d *= bal(src, 'dmg'); if (!e.isHero) { hv = heroVsUnit(e); d *= CFG.heroUnitMul * hv; } }
  if (CFG.heroGrow) { if (src && src.isHero && e.isHero) d *= 1 + hlv() * CFG.heroGrow.dmg; if (e.isHero) d /= 1 + hlv() * CFG.heroGrow.hp; }
  if (e.shelterT > 0) d *= 0.6;
  { const hg = CFG.homeGround; if (hg) { if (o.from && o.from.tier && onHome(o.from, hg.third)) d *= hg.dmg; if (!e.isHero && onHome(e, hg.third)) d *= hg.take; } }
  if (e.shield > 0) { const a = Math.min(e.shield, d); e.shield -= a; d -= a; }
  if (d <= 0) return;
  const real = Math.min(d, e.hp); e.hp -= d;
  { const by = o.by || o.from; if (by && by.hid) { const s = hs(by.hid); s.dmg += real; if (e.hp <= 0) s.kills++; } }
  if (src && src.isHero) { G.stats.dmg[src.def.id] = (G.stats.dmg[src.def.id] || 0) + real; if (!o.noCharge && src.sup < 1) { src.sup = Math.min(1, src.sup + real / (CFG.supChargeBase ? hv : 1) / (src.def.sup.hits * src.def.atk.dmg * (src.def.atk.n || 1)) * (e.isHero ? 1 : CFG.supUnit)); if (src.sup >= 1 && src === G.me) snd('super_ready', src.x, src.y, src); } }
  if (e.isHero) { e.hitT = CFG.regenWait; if (e === G.me) snd('hero_hurt', e.x, e.y, e); }
  let quiet = o.quiet;
  if (quiet && e.isHero) { e.qacc = (e.qacc || 0) + d; if (e.qacc >= 400) { d = e.qacc; e.qacc = 0; quiet = false; } }
  if (!quiet) float(e.x + rnd(-8, 8), e.y - e.r - 10, Math.round(d), e === G.me ? '#ff6b5e' : e.isHero ? '#fff' : '#fac775');
  if (e.hp <= 0) kill(e, src);
}
function heal(e, d, quiet) { if (e.dead) return; const b = e.hp; e.hp = Math.min(e.maxhp, e.hp + d); if (!quiet && e.hp - b > 40) float(e.x, e.y - e.r - 10, '+' + Math.round(e.hp - b), '#c0dd97'); }
function kill(e, src) {
  e.dead = true; if (!e.isHero) ev(e.hid ? { k: 'udie', x: e.x, y: e.y, tier: e.tier, kind: e.kind, team: e.team, hid: e.hid } : { k: 'udie', x: e.x, y: e.y, tier: e.tier, kind: e.kind, team: e.team });
  if (!e.isHero) {
    snd(e.tier === 5 && !e.hid ? 'colossus_split' : bodyId(e) + '_die', e.x, e.y, e);
    if (e.tier === 5 && !e.hid) for (let i = 0; i < 2; i++) spawnUnit(e.team, e.kind, 2, e.lane, e.x + rnd(-16, 16), e.y + rnd(-16, 16));
    if (src && src.isHero) { G.stats.heroUnitKills++; if (src.def.onUnitKill) src.def.onUnitKill(src, e); } else G.stats.unitUnitKills++;
  } else {
    G.stats.heroKills++; G.stats.deaths[e.def.id] = (G.stats.deaths[e.def.id] || 0) + 1;
    if (src && src.isHero) G.stats.kills[src.def.id] = (G.stats.kills[src.def.id] || 0) + 1;
    e.respawn = CFG.respawn; if (RSIDE) e.spawnAt = spawnSpot(e);   // the old spot is still drawn when he comes back (same random order as build 8)
    { const br = CFG.behindRespawn; if (br) { const lag = (e.team === BLUE ? G.base[2].hp - G.base[1].hp : G.base[1].hp - G.base[2].hp); if (lag > 0) e.respawn *= 1 - (1 - br.min) * Math.min(1, lag / br.at); } }
    if (!(e.shelterT > 0)) { const keep = Math.floor(e.seeds * (CFG.deathKeep || 0)); for (let i = keep; i < e.seeds; i++) dropSeed(e.x + rnd(-50, 50), e.y + rnd(-50, 50), e.x, e.y); e.seeds = keep; }
    snd(e === G.me ? 'hero_down_me' : e.team === G.me.team ? 'hero_down_ally' : 'hero_down_foe_' + e.def.id, e.x, e.y, e);
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
  for (const e of foes(h.team, h.x, h.y, range, true, true)) if (Math.abs(angd(Math.atan2(e.y - h.y, e.x - h.x), a)) < half && !blocked(h.x, h.y, e.x, e.y)) { hurt(e, typeof dmg === 'function' ? dmg(e) : dmg, h); if (onHit && !e.dead) onHit(e); }
  G.fx.push({ k: 'c', x: h.x, y: h.y, a, half, r: range, col, life: 0.15, max: 0.15, src: h.def && h.def.id, team: h.team });
}
const back = u => u.team === BLUE ? 1 : -1;
const onHome = (e, third) => e.team === BLUE ? e.y > H * (1 - third) : e.y < H * third;   // in the part of the map nearest its own base         // y direction toward a unit's own base
function shove(u, d) { if (u.isHero || u.isTower) return; u.y = clamp(u.y + back(u) * d * (u.tier === 5 ? 0.5 : 1), 30, H - 30); }

// ---- heroes. hp, damage per hit, range (tiles x 47.6), reload, speed and hits-to-super follow the named Brawl Stars hero.
const LP = [0, 1, 2, 3, 3, 5];   // what each body costs a Lure
// a super's key (briar, heist ...) is what the rules and the effects look it up by; its name is only what the screen shows
const supTag = h => ({ key: h.def.sup.key, label: h.def.sup.name });
const HEROES = [
{ id: 'bramble', name: 'Champ', col: '#639922', ref: 'El Primo', hp: 6000, spd: 122, atkRange: 135,
  aname: 'Haymaker', adesc: 'short wide swipe, {1400}. Units it hits are knocked back down their lane.',
  atk: { dmg: 1400, reload: 0.9, gap: 0.35, shape: 'cone', range: 143, half: 0.8, fn(h, a) { cone(h, a, 143, 0.8, 1400, '#c0dd97', e => shove(e, 70)); } },
  sup: { key: 'briar', name: 'Ring Ropes', hits: 3, shape: 'circle', range: 250, r: 140, bot: 'cluster', desc: 'ropes close a stretch of lane for 8 seconds. Units inside are slowed and cut; a hero who walks in is rooted.',
    fn(h, x, y) { zone(h, x, y, { r: 140, dur: 8, arm: 0.6, col: '#3b6d11', ...supTag(h), fn(z) { for (const e of foes(z.team, z.x, z.y, z.r)) { if (e.isHero) { if (!z.seen.has(e)) { z.seen.add(e); hurt(e, 600, h, { noCharge: true }); rootE(e, 0.6); } else { hurt(e, 150, h, { quiet: true, noCharge: true }); slow(e, 0.6, 0.3); } } else { hurt(e, 260, h, { quiet: true, noCharge: true }); slow(e, 0.6, 0.5); } } } }); } } },
{ id: 'sow', name: 'Hoot', col: '#ef9f27', ref: 'Jessie', hp: 3300, spd: 114, atkRange: 400,
  aname: 'Fire Arrow', adesc: 'long single shot, {1060}. It passes through her own units and heals them.',
  atk: { dmg: 1060, reload: 1.8, gap: 0.3, shape: 'line', range: 428, w: 8, fn(h, a) { shoot(h, a, { speed: 455, range: 428, dmg: 1060, healU: 350, col: '#fac775' }); } },
  sup: { key: 'nursery', name: "Elder's Lesson", hits: 5, shape: 'circle', range: 450, r: 120, bot: 'ownUnits', desc: 'a patch on a lane for 10 seconds. Her team\'s units that walk through come out one body bigger.',
    fn(h, x, y) { zone(h, x, y, { r: 120, dur: 10, arm: 0.4, every: 0.25, col: '#fac775', ...supTag(h), fn(z) { for (const u of G.units) if (!u.dead && u.team === z.team && !u.grown && Math.hypot(u.x - z.x, u.y - z.y) < z.r) growUnit(u); } }); } } },
{ id: 'mower', name: 'Kero', col: '#888780', ref: 'Shelly', hp: 4200, spd: 122, atkRange: 185,
  aname: 'Wide Cut', adesc: 'hits everything in front of him, {1300}. Each unit he kills heals him.',
  atk: { dmg: 1300, reload: 1.4, gap: 0.3, shape: 'cone', range: 200, half: 0.5, fn(h, a) { cone(h, a, 200, 0.5, 1300, '#d3d1c7'); } },
  onUnitKill(h) { heal(h, 150, true); },
  sup: { key: 'blades', name: 'Thousand Cuts', hits: 3, shape: 'circle', range: 300, r: 90, bot: 'ahead', desc: 'spinning blades on a lane for 12 seconds. Ground units that walk in are cut down; every 5 it kills give him a seed. Flyers pass over.',
    fn(h, x, y) { zone(h, x, y, { r: 90, dur: 12, arm: 1, every: 0.25, col: '#b4b2a9', ...supTag(h), kills: 0, fn(z) { for (const e of foes(z.team, z.x, z.y, z.r)) { if (e.isHero) hurt(e, 250, h, { quiet: true, noCharge: true }); else if (!e.fly) { hurt(e, 700, null, { quiet: true }); if (e.dead) { G.stats.heroUnitKills++; z.kills++; if (z.kills % 5 === 0 && h.seeds < CFG.carry) { h.seeds++; float(h.x, h.y - 40, '+1 seed', '#fac775'); if (h === G.me) snd('seed_pickup', h.x, h.y, h); } } } } } }); } } },
{ id: 'magpie', name: 'Whiskers', col: '#7f77dd', ref: 'Crow', hp: 3000, spd: 130, atkRange: 310,
  aname: 'Knife Toss', adesc: 'two quick knives, {520} each. A hit knocks a seed off an enemy hero.',
  atk: { dmg: 520, n: 2, reload: 1.4, gap: 0.25, shape: 'line', range: 333, w: 8, fn(h, a) { const st = { done: false }; for (const d of [-0.06, 0.06]) shoot(h, a + d, { speed: 620, range: 333, dmg: 520, r: 6, col: '#cecbf6', onHit(e) { if (e.isHero && e.seeds > 0 && !st.done) { st.done = true; e.seeds--; dropSeed(e.x + rnd(-70, 70), e.y + rnd(-70, 70), e.x, e.y); } } }); } },
  sup: { key: 'heist', name: 'Big Score', hits: 5, shape: 'line', range: 300, w: 16, bot: 'heist', desc: 'she dashes, and every seed on the ground and on enemy heroes where she lands flies to her. Enemies there take {900} and are slowed.',
    fn(h, x, y, a) { const st = 12; for (let i = 0; i < 300 / st; i++) { const nx = h.x + Math.cos(a) * st, ny = h.y + Math.sin(a) * st; if (inWall(nx, ny, h.r * 0.6) || nx < h.r || nx > W - h.r || ny < h.r || ny > H - h.r) break; h.x = nx; h.y = ny; } line(h.x - Math.cos(a) * 300, h.y - Math.sin(a) * 300, h.x, h.y, '#cecbf6'); ring(h.x, h.y, 220, '#cecbf6', 0.6); haste(h, 2, 1.4);
      for (const s of G.seeds) if (Math.hypot(s.x - h.x, s.y - h.y) < 220) s.to = h;
      for (const e of G.heroes) if (!e.dead && e.team !== h.team && dist(e, h) < 220 + e.r) { while (e.seeds > 0) { e.seeds--; G.seeds.push({ x: e.x, y: e.y, tx: e.x, ty: e.y, to: h }); } slow(e, 2, 0.5); hurt(e, 900, h, { noCharge: true }); } } } },
{ id: 'drover', name: 'Tusk', col: '#1d9e75', ref: 'Pam', hp: 4800, spd: 114, atkRange: 350,
  aname: 'Cannon Volley', adesc: 'three cannonballs in a narrow fan, {420} each.',
  atk: { dmg: 420, n: 3, reload: 1.3, gap: 0.3, shape: 'line', range: 380, w: 14, fn(h, a) { for (const d of [-0.07, 0, 0.07]) shoot(h, a + d, { speed: 620, range: 380, dmg: 420, r: 7, col: '#9fe1cb' }); } },
  sup: { key: 'rally', name: 'War Horn', hits: 4, shape: 'circle', range: 400, r: 130, bot: 'ownUnits', desc: 'a war horn on a lane for 10 seconds. Her team\'s units that pass it run 60 percent faster and hit the base twice as hard.',
    fn(h, x, y) { zone(h, x, y, { r: 130, dur: 10, arm: 0.3, every: 0.25, col: '#9fe1cb', ...supTag(h), fn(z) { for (const u of G.units) if (!u.dead && u.team === z.team && Math.hypot(u.x - z.x, u.y - z.y) < z.r) { haste(u, 6, 1.6); u.stampT = 6; } } }); } } },
{ id: 'thistle', name: 'Presto', col: '#d4537e', ref: 'Dynamike', hp: 2800, spd: 114, atkRange: 330,
  aname: 'Spell Orb', adesc: 'lobbed over walls, lands after a moment, {1500} in a small blast.',
  atk: { dmg: 1500, reload: 1.7, gap: 0.35, shape: 'circle', range: 349, r: 60, fn(h, a, x, y) { lob(h, x, y, { r: 60, delay: 0.8, dmg: 1500, snd: 'thistle_land' }); } },
  sup: { key: 'charge', name: 'Grand Finale', hits: 3, shape: 'circle', range: 350, r: 150, bot: 'bomb', desc: 'a bomb thrown over walls. It sits for 1.5 seconds, then blows for {2600} in a wide blast.',
    fn(h, x, y) { lob(h, x, y, { r: 150, delay: 1.5, dmg: 2600, big: true, noCharge: true, snd: 'thistle_sup_land' }); } } },
{ id: 'shade', name: 'Kuro', col: '#534ab7', ref: 'Leon', hp: 3600, spd: 130, atkRange: 118,
  aname: 'Kunai Cross', adesc: 'fast short cut, {1150}. Double from a bush or while unseen, and more for each seed the target carries.',
  atk: { dmg: 1150, reload: 1.0, gap: 0.25, shape: 'cone', range: 128, half: 0.6, fn(h, a) { const b = h.invisT > 0 || h.ambT > 0 ? 2 : 1; h.ambT = 0; cone(h, a, 128, 0.6, e => 1150 * b * (e.isHero ? 1 + 0.1 * Math.min(6, e.seeds) : 1), '#afa9ec'); } },
  sup: { key: 'vanish', name: 'Smoke Step', hits: 4, shape: 'self', r: 90, bot: 'ambush', desc: 'unseen and 45 percent faster for 4 seconds. Her next cut hits double.',
    fn(h) { h.invisT = 4; h.ambT = 5; haste(h, 4, 1.45); ring(h.x, h.y, 90, '#afa9ec', 0.4); } } },
{ id: 'foxglove', name: 'Sly', col: '#d85a30', ref: 'Nita', hp: 3800, spd: 122, atkRange: 335,
  aname: 'Ember Dagger', adesc: '{1000} and a slow. A unit it hits walks back the way it came for a second.',
  atk: { dmg: 1000, reload: 1.5, gap: 0.3, shape: 'line', range: 357, w: 8, fn(h, a) { shoot(h, a, { speed: 600, range: 357, dmg: 1000, col: '#f0997b', onHit(e) { if (e.isHero) slow(e, 1.2, 0.35); else e.backT = 1; } }); } },
  sup: { key: 'lure', name: 'Turncoat', hits: 5, shape: 'circle', range: 400, r: 120, bot: 'ahead', desc: 'a patch on a lane for 10 seconds. Enemy units that stay in it 1.5 seconds switch to her team. It turns 6 points of bodies (Grunt 1, Brute 2, Splasher 3, Flyer 3, Colossus 5).',
    fn(h, x, y) { zone(h, x, y, { r: 120, dur: 10, arm: 1, every: 0.25, col: '#f0997b', ...supTag(h), pts: 6, fn(z) { for (const u of G.units) { if (u.dead || u.team === z.team || Math.hypot(u.x - z.x, u.y - z.y) > z.r) continue; u.lureT = (u.lureT || 0) + z.every; if (u.lureT >= 1.5 && z.pts >= LP[u.tier]) { z.pts -= LP[u.tier]; u.team = z.team; u.lureT = 0; u.backT = 0; G.stats.turned++; ring(u.x, u.y, 22, '#f0997b', 0.4); float(u.x, u.y - 20, 'turned', '#f0997b'); if (z.pts <= 0) z.dur = 0; } } } }); } } },
{ id: 'bamboo', name: 'Bao', col: '#5dcaa5', ref: 'Poco', hp: 5000, spd: 114, atkRange: 300,
  aname: 'Salt Throw', adesc: 'thrown over walls, {900} to enemies. It leaves salted ground for 3 seconds that heals his team and slows enemy units.',
  atk: { dmg: 900, reload: 1.6, gap: 0.3, shape: 'circle', range: 320, r: 70, fn(h, a, x, y) { lob(h, x, y, { r: 70, delay: 0.6, dmg: 900, snd: 'bamboo_land', onLand(l) { zone(h, l.x, l.y, { r: 70, dur: 3, col: '#5dcaa5', puddle: true, fn(z) { for (const e of pals(z.team, z.x, z.y, z.r)) heal(e, e.isHero ? 200 : 75, true); for (const e of foes(z.team, z.x, z.y, z.r, true)) if (!e.isHero) slow(e, 0.6, 0.3); } }); } }); } },
  sup: { key: 'shelter', name: 'Iron Stance', hits: 4, shape: 'circle', range: 400, r: 220, bot: 'ally', desc: 'a dome for 6 seconds. His team inside takes 40 percent less damage and heals; a hero who dies inside keeps his seeds.',
    fn(h, x, y) { zone(h, x, y, { r: 220, dur: 6, every: 0.25, col: '#9fe1cb', ...supTag(h), dome: true, fn(z) { for (const e of pals(z.team, z.x, z.y, z.r)) { e.shelterT = 0.3; if (e.isHero) heal(e, 75, true); } } }); } } }
];
for (const d of HEROES) { d.adesc = d.aname + ': ' + d.adesc; d.sup.desc = d.sup.name + ': ' + d.sup.desc; }   // the panel text starts with the attack's or the super's name; nothing looks either up by name
function growUnit(u) { u.grown = true; if (u.tier >= 5) { u.hp = u.maxhp; return; }
  if (u.hid) { const f = u.hp / u.maxhp, k = LADDER[u.tier + 1] / LADDER[u.tier]; u.tier++; u.r = TR[u.tier]; u.st = Object.assign({}, u.st, { dmg: u.st.dmg * k }); u.maxhp *= k; u.hp = u.maxhp * f; ring(u.x, u.y, 26, '#fac775', 0.4); G.stats.grown++; return; }   /* a homie keeps its type and grows one tier stronger */
  const f = u.hp / u.maxhp; u.tier++; u.fly = u.tier === 4; u.r = TR[u.tier]; u.maxhp *= ST[u.kind][u.tier].hp / ST[u.kind][u.tier - 1].hp; u.hp = u.maxhp * f; ring(u.x, u.y, 26, '#fac775', 0.4); G.stats.grown++; }

function mkHero(def, team, bot, idx) {
  const b = BASEPOS[team], hp = def.hp * (HB[def.id] && HB[def.id].hp || 1);
  return ent({ isHero: true, def, team, bot, idx, ammo: 3, sup: 0, x: b.x + (idx - 1) * 90, y: b.y + (team === BLUE ? -150 : 150), r: 16, hp, maxhp: hp, hitT: 0, botWait: 0, seeds: CFG.startSeeds, seedT: 0, atkCd: 0, aimA: team === BLUE ? -Math.PI / 2 : Math.PI / 2, lane: Math.min(NL - 1, idx), home: Math.min(NL - 1, idx), kind: Math.floor(rnd(0, 3)), think: rnd(0, 0.3), goal: null, plan: null, mx: 0, my: 0 });
}
// ---- decks. A creep is a card {kind, tier}; each hero brings 6, holds 3 in the hand and sees the next one. Playing a card puts it
// at the back of the line and the next one takes its place (Clash Royale's cycle, 8 and 4 sized down to 6 and 3).
// Default deck (picked by Claude): mixed costs (1, 1, 2, 3, 5, 8: 20 seeds, 3.3 a card), one Colossus, three cards that hit flyers.
// It is the deck of a player who brings none and of a bot whose hero has none; each hero has its own below.
const C = (kind, tier) => ({ kind, tier }), TH = 0, SP = 1, RU = 2;
const BASE_DECK = [C(TH, 1), C(SP, 1), C(RU, 2), C(SP, 3), C(SP, 4), C(TH, 5)];
// 2026-11-14: each hero's own deck (picked by Claude, reasons in work/balance/creeps.md), measured with the creeps evened out in
// CFG.creep. Every deck: 18 to 22 seeds, at most one Colossus, at least two cards that hit flyers, at least two of cost 2 or less.
const DECKS = { _: BASE_DECK,
  bramble: [C(TH, 1), C(RU, 1), C(TH, 2), C(TH, 3), C(SP, 4), C(TH, 5)],    // the wall: Thorn bodies hold the lane behind his knockback
  sow: [C(TH, 1), C(SP, 1), C(RU, 2), C(SP, 3), C(TH, 4), C(SP, 5)],        // many bodies for Nursery to grow, Spitters her shot keeps alive
  mower: [C(TH, 1), C(RU, 1), C(TH, 2), C(RU, 3), C(SP, 4), C(TH, 5)],      // close-range ground brawl beside his cut and blade trap
  magpie: [C(RU, 1), C(SP, 1), C(RU, 2), C(RU, 3), C(RU, 4), C(RU, 5)],     // the fast thief: a Runner pack
  drover: [C(TH, 1), C(RU, 2), C(TH, 2), C(SP, 3), C(SP, 4), C(TH, 5)],     // Brutes walk straight to the base through her rally post
  thistle: [C(SP, 1), C(TH, 1), C(SP, 2), C(SP, 3), C(SP, 4), C(SP, 5)],    // artillery: ranged Spitters behind his shells
  shade: [C(RU, 1), C(SP, 2), C(RU, 2), C(SP, 3), C(RU, 4), C(TH, 4)],      // the unseen flank: fast and flying, no Colossus
  foxglove: [C(TH, 1), C(SP, 1), C(SP, 2), C(TH, 3), C(TH, 4), C(SP, 5)],   // control: ranged cards hit what her charm and Lure hold
  bamboo: [C(TH, 1), C(SP, 1), C(TH, 2), C(TH, 3), C(TH, 4), C(TH, 5)] };   // tough Thorn bodies that last in his puddles and Shelter
const HAND = 3, cardName = c => c.hid && HD[c.hid] ? TYPES[HD[c.hid].type].name + ' ' + HD[c.hid].name : KINDS[c.kind].name + ' ' + BODIES[c.tier];
function deckOk(d) { return Array.isArray(d) && d.length === 6 && d.every(c => c && KINDS[c.kind] && c.tier >= 1 && c.tier <= 5); }
function dealDeck(h, deck, tiers) {   // shuffled with the match's own random source, so seeded bot matches repeat
  if (UPG) return upDeal(h, tiers);   // the seed upgrade (on since build 16): fixed hand of three, see the block after playCard
  const d = HON ? crewDeck(h.def.id, tiers) :(deckOk(deck) ? deck : DECKS[h.def.id] || DECKS._).map(c => ({ kind: c.kind | 0, tier: c.tier | 0 }));   // with homies a hero always brings his own crew
  for (let k = d.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [d[k], d[j]] = [d[j], d[k]]; }
  h.deck = d.map(c => Object.assign({}, c)); h.hand = []; h.queue = d;
  for (let i = 0; i < HAND; i++) h.hand.push(drawFor(h, h.hand));
  // homies.hbCrew {heroId: {crew size: factor}}: a hero's multiplier scaled by how many different homies he brings (absent = 1)
  const HC = HON && HOM.hbCrew && HOM.hbCrew[h.def.id], f = HC ? HC[new Set(h.deck.map(c => c.tier)).size] : undefined;
  if (f && f !== 1) { h.crewF = f; h.hp *= f; h.maxhp *= f; }
}
// the next card for an open hand slot: the front of the line, except that a dear card waits its turn (keeps its place at the front)
// while the hand already holds one and a cheaper card is in the line (CFG.handDear)
const dear = c => CFG.handDear && CFG.cost[c.tier] >= CFG.handDear;
// CFG.handCheap: when the hand would hold no card of this cost or less, the first such card in the line comes in instead
const cheap = c => CFG.handCheap && CFG.cost[c.tier] <= CFG.handCheap;
function drawIdx(h, hand) {
  let i = -1;
  if (CFG.handCheap && !hand.some(c => c && cheap(c))) i = h.queue.findIndex(cheap);
  if (i < 0 && CFG.handDear && hand.some(c => c && dear(c))) i = h.queue.findIndex(c => !dear(c));
  return i < 0 ? 0 : i;
}
function drawFor(h, hand) { return h.queue.splice(drawIdx(h, hand), 1)[0]; }
// the card that comes in when hand slot i is played (without i: when the cheapest card in the hand is played, the usual play)
function nextCard(h, i) {
  if (!h.queue || !h.hand || UPG) return null;
  if (i === undefined) { i = 0; for (let k = 1; k < h.hand.length; k++) if (h.hand[k] && (!h.hand[i] || costOf(h.hand[k].tier) < costOf(h.hand[i].tier))) i = k; }
  return h.queue[drawIdx(h, h.hand.filter((c, k) => k !== i))];
}
function canPlay(h, i) { const c = h.hand && h.hand[i]; return !!c && canSummon(h, c.tier) && (!UPG || upCanPlay(h, i)); }
function playCard(h, i) {   // summon the creep in hand slot i into the hero's lane; the card goes to the back of the line
  if (UPG) return upPlay(h, i);
  const c = h.hand && h.hand[i]; if (!c || !summon(h, c.tier, c.kind, c.hid)) return false;
  h.queue.push(c); h.hand[i] = null; h.hand[i] = drawFor(h, h.hand); h.cycled = (h.cycled || 0) + 1; return true;
}
// ---- seed upgrade (his idea 2026-11-16: "maybe upgrade shop should cost seeds so ur 3 at a time would change", "each time one new guy
// shows up", "and the smallest one is gone"; "u should need alot of seeds to upgrade"; drafted by worker sb-upgrade, uncommitted in
// its worktree; on by default since build 16 on his "i dont see the upgrade button or the number it costs ... plz fix all fo this").
// The hand is three homies in tier order, fixed (no line, no NEXT). An upgrade costs seeds, brings in the next bigger homie on the big
// end and drops the smallest: 1,2,3 -> 2,3,4 -> 3,4,5. Homies on the field stay. pay 'bank': each press pours the seeds held into the
// upgrade; done when the total is reached (so it can be above the seed cap). limit.rise: each play of the same slot in a row costs one
// more (another slot resets it), so a fixed hand cannot spam its cheapest card. Off: ?upgrade=0 or homies.upgrade.on false.
// build 16 changes to the draft: no rising cost (limit null; he did not ask for it), and bots pour only the seeds that would spill over
// the cap (bot.spill) instead of holding back waves to save (that stalled every bot match: base ends 33.7 -> 1.1 percent)
const UPG_DRAFT = { pay: 'bank', cost: [16, 24], lock: 0, limit: null, crewF: 'owned', bot: { from: [60, 150], safe: true, spill: true } };
const UPG = HON && !/[?&]upgrade=0/.test(QS) && (/[?&]upgrade=1/.test(QS) || !!(HOM.upgrade && HOM.upgrade.on)) ? Object.assign({}, UPG_DRAFT, HOM.upgrade) : null;
const upCard = (heroId, t) => ({ hid: heroId + '_' + t, tier: t, kind: TBODY[HD[heroId + '_' + t].type][0] });
function upDeal(h, tiers) {
  const t = crewTiers(h.def.id, tiers), hand = t.slice(0, HAND); while (hand.length < HAND && t.length) hand.push(t[0]); hand.sort((a, b) => a - b);
  h.upTiers = t; h.upDone = 0; h.upLeft = Math.max(0, t.length - HAND); h.bank = 0; h.lockT = 0; h.cdT = [0, 0, 0]; h.rise = [0, 0, 0]; h.lastSlot = -1;
  h.hand = hand.map(x => upCard(h.def.id, x)); h.queue = []; h.deck = t.map(x => upCard(h.def.id, x));
  const HC = HOM.hbCrew && HOM.hbCrew[h.def.id], f = HC ? HC[UPG.crewF === 'reach' ? Math.min(t.length, HAND) : t.length] : undefined;
  h.crewF = 1; if (f && f !== 1) { h.crewF = f; h.hp *= f; h.maxhp *= f; }
}
const upExtra = (h, i) => UPG.limit && UPG.limit.rise ? h.rise[i] : 0;
function upCanPlay(h, i) { return G.t >= h.lockT && !(UPG.limit && UPG.limit.cd && G.t < h.cdT[i]) && h.seeds >= costOf(h.hand[i].tier) + upExtra(h, i); }
function upPlay(h, i) {
  const c = h.hand && h.hand[i]; if (!c || !canPlay(h, i)) return false; const x = upExtra(h, i);
  if (!summon(h, c.tier, c.kind, c.hid)) return false; h.seeds -= x;
  if (UPG.limit && UPG.limit.cd) h.cdT[i] = G.t + UPG.limit.cd;
  if (UPG.limit && UPG.limit.rise) { if (h.lastSlot !== i) h.rise = [0, 0, 0]; h.rise[i] += UPG.limit.rise; }
  h.lastSlot = i; h.cycled = (h.cycled || 0) + 1; return true;
}
const upCost = h => h && UPG && h.upLeft > 0 ? UPG.cost[h.upDone] : null;   // seeds the next upgrade costs (null: none left)
const upNext = h => upCost(h) === null ? null : upCard(h.def.id, h.upTiers[HAND + h.upDone]);   // the homie it brings in
const upNeed = h => upCost(h) === null ? null : upCost(h) - (h.bank || 0);   // seeds still to put in
function canUpgrade(h) { const c = upCost(h); return c !== null && (!h.dead || CFG.deadPlay) && (UPG.pay === 'bank' ? h.seeds > 0 : h.seeds >= c); }
function upgrade(h) {   // the upgrade button: true when the upgrade happened, 'bank' when seeds went in and it is not done yet
  if (!UPG || !canUpgrade(h)) return false; const c = upCost(h);
  if (UPG.pay === 'bank') { h.bank += h.seeds; h.seeds = 0; if (h.bank < c) return 'bank'; h.seeds = Math.min(CFG.carry, h.bank - c); h.bank = 0; } else h.seeds -= c;
  const nx = upNext(h); h.hand = h.hand.slice(1).concat([nx]); h.cdT = h.cdT.slice(1).concat([0]); h.rise = [0, 0, 0]; h.lastSlot = -1; h.upDone++; h.upLeft--;
  if (UPG.pay === 'lock' && UPG.lock) h.lockT = G.t + UPG.lock;
  (G.stats.ups || (G.stats.ups = [])).push([h.team, h.upDone, Math.round(G.t), h.def.id]); ev({ k: 'upgrade', team: h.team, hid: nx.hid }); float(h.x, h.y - 46, HD[nx.hid].name, '#fac775'); return true;
}
// a bot's upgrade: true when it is saving this think (no attack wave)
function botUpgrade(h, danger) {
  const P = UPG.bot; if (!P || upCost(h) === null || G.t < P.from[h.upDone]) return false;
  if (P.spill) { if (h.seeds >= CFG.carry) upgrade(h); return false; }
  if (danger && P.safe) return false;
  if (UPG.pay === 'bank' ? h.seeds >= Math.min(CFG.carry, upCost(h) - h.bank) : h.seeds >= upCost(h)) upgrade(h);
  return true;
}
// ?lanebtn=8&multi=1 (lanes/main.js): the card in slot i played n times at once for n times its cost, the homies in a short line one
// behind the other down the lane; the card cycles once. Returns how many came out (0 when the seeds do not cover n).
function playCardN(h, i, n) { const c = h.hand && h.hand[i]; if (!c || n < 1 || h.seeds < costOf(c.tier) * n) return 0; let k = 0;
  for (; k < n; k++) { if (!summon(h, c.tier, c.kind, c.hid)) break; const u = G.units[G.units.length - 1]; u.y += (h.team === BLUE ? 1 : -1) * k * 34; }
  if (k) { h.queue.push(c); h.hand[i] = null; h.hand[i] = drawFor(h, h.hand); h.cycled = (h.cycled || 0) + 1; } return k; }
// a bot's deck from a pool of allowed creeps: its hero's default cards that are in the pool first, then the rest of the pool
// in random order, at most one Colossus while anything else is left; fewer than six in the pool repeats cards
function deckFromPool(h, pool) {
  const ok = pool.filter(c => c && KINDS[c.kind] && c.tier >= 1 && c.tier <= 5).map(c => ({ kind: c.kind | 0, tier: c.tier | 0 })); if (!ok.length) return null;
  const same = (a, b) => a.kind === b.kind && a.tier === b.tier, d = [];
  const add = c => { if (d.length < 6 && !d.some(x => same(x, c)) && !(c.tier === 5 && d.some(x => x.tier === 5) && ok.some(x => x.tier < 5 && !d.some(y => same(y, x))))) d.push(c); };
  for (const c of DECKS[h.def.id] || DECKS._) if (ok.some(x => same(x, c))) add(c);
  for (const c of ok.slice().sort(() => Math.random() - 0.5)) add(c);
  const rep = d.filter(c => c.tier < 5).length ? d.filter(c => c.tier < 5) : d.slice(); for (let i = 0; d.length < 6; i++) d.push(Object.assign({}, rep[i % rep.length]));
  return d;
}
// how hard a bot plays, by level (0 easy for a first match, 2 = the bots every sweep was tuned with, 4 hardest). Reaction (how often
// it thinks), aim (spread of a shot at a hero, wait between shots), lane sense (how often it answers a lane being lost),
// seed sense (how often a wave starts with the biggest card it can pay for) and a delay before a ready super. No stat boosts.
const BOTLV = [
  { think: 0.8, aim: 0.55, wait: [0.8, 1.6], defend: 0.15, big: 0.25, supWait: 3 },
  { think: 0.55, aim: 0.35, wait: [0.5, 1.1], defend: 0.3, big: 0.4, supWait: 1.5 },
  { think: 0.35, aim: 0.2, wait: [0.3, 0.8], defend: null, big: 0.5, supWait: 0 },
  { think: 0.25, aim: 0.12, wait: [0.2, 0.55], defend: 0.7, big: 0.6, supWait: 0 },
  { think: 0.18, aim: 0.06, wait: [0.1, 0.35], defend: 0.9, big: 0.7, supWait: 0 }];
const skillOf = h => h.skill || BOTLV[2];
// SBL.start(heroIndex, auto, opts) or the older SBL.start(heroIndex, auto, lineup). opts, every field optional:
//   deck: six {kind, tier} the player brings (default: the hero's deck in DECKS)
//   pool: the {kind, tier} creeps the bots may build their decks from (default: their hero's deck in DECKS)
//   botLevel: 0..4, how hard the enemy (Red) bots play, see BOTLV; the player's own team plays at 2 (default 2 for all)
//   heroes: hero ids the bots may be (default: all nine, no repeats); fewer than five repeats heroes
//   lineup: six hero indexes, seat order Blue (player first) then Red, as the sweeps use
// When it ends, G.over is 'Blue wins', 'Red wins' or 'Draw' and G.result = { winner: 1 | 2 | 0 (draw), by: 'base' | 'timer',
// base: [blue base health, red base health], mine: true when the player's team won }.
function newGame(pi, auto, lineup, opts) {
  if (lineup && !Array.isArray(lineup)) { opts = lineup; lineup = opts.lineup; } opts = opts || {};
  for (const f of FARMS) { f.t = 0; f.n = 0; }
  G = { heroes: [], units: [], seeds: [], projs: [], lobs: [], zones: [], fx: [], base: [null, { team: BLUE, x: BASEPOS[1].x, y: BASEPOS[1].y, hp: CFG.baseHp, awake: false, gunT: 0 }, { team: RED, x: BASEPOS[2].x, y: BASEPOS[2].y, hp: CFG.baseHp, awake: false, gunT: 0 }],
    stats: { leadChanges: 0, lead: 0, lead60: null, heroUnitKills: 0, unitUnitKills: 0, heroKills: 0, arrived: 0, endBy: null, summoned: [0, 0, 0, 0, 0, 0], sumTeam: [0, 0, 0], arrTeam: [0, 0, 0], spent: [null, [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], pick: {}, turned: 0, grown: 0, dmg: {}, kills: {}, deaths: {}, casts: {} },
    statT: 0, time: CFG.time, over: null, sel: 0, auto: !!auto, t: 0, lateOn: false };
  let o = lineup;
  if (!o && Array.isArray(opts.heroes) && opts.heroes.length) {
    let allow = HEROES.map((h, i) => opts.heroes.includes(h.id) ? i : -1).filter(i => i >= 0 && i !== pi); if (!allow.length) allow = HEROES.map((h, i) => opts.heroes.includes(h.id) ? i : -1).filter(i => i >= 0);
    if (!allow.length) allow = HEROES.map((_, i) => i).filter(i => i !== pi);
    const sh = allow.sort(() => Math.random() - 0.5); o = [pi]; for (let i = 0; o.length < 6; i++) o.push(sh[i % sh.length]);
  }
  o = o || [pi].concat(HEROES.map((_, i) => i).filter(i => i !== pi).sort(() => Math.random() - 0.5));
  // seats: the player (or first pick) takes the middle lane of Blue
  G.heroes.push(mkHero(HEROES[o[0]], BLUE, !!auto, 1), mkHero(HEROES[o[1]], BLUE, true, 0), mkHero(HEROES[o[2]], BLUE, true, 2), mkHero(HEROES[o[3]], RED, true, 0), mkHero(HEROES[o[4]], RED, true, 1), mkHero(HEROES[o[5]], RED, true, 2));
  G.me = G.heroes[0];
  const lv = opts.botLevel === undefined ? 2 : clamp(Math.round(+opts.botLevel) || 0, 0, 4);
  // homies on: opts.myCrew = the tiers the player brings; opts.crews = {heroId: tiers} for every other seat (absent: full crew)
  const tiersOf = h => h === G.me && Array.isArray(opts.myCrew) ? opts.myCrew : opts.crews && Array.isArray(opts.crews[h.def.id]) ? opts.crews[h.def.id] : null;
  if (TW) TW.start();   // [towers]
  for (const h of G.heroes) { if (h.team === RED && lv !== 2) h.skill = BOTLV[lv]; dealDeck(h, h === G.me ? opts.deck : Array.isArray(opts.pool) && opts.pool.length ? deckFromPool(h, opts.pool) : null, tiersOf(h)); }
}
function finish(winner, by) { G.over = winner === BLUE ? 'Blue wins' : winner === RED ? 'Red wins' : 'Draw'; G.stats.endBy = by; G.result = { winner, by, base: [G.base[1].hp, G.base[2].hp], mine: winner === G.me.team }; }
function spawnUnit(team, kind, tier, lane, x, y, hid) {
  const ug = CFG.unitGrow, grow = ug ? 1 + ug.hp * Math.min(ug.max, Math.floor(G.t / ug.every)) : 1;   // later waves are tougher, so the match ends at a base
  if (hid && HD[hid]) {   // a homie: its numbers come from its own def, what it does from its type
    const d = HD[hid], ty = TYPES[d.type], hp = d.hp * grow, tb = TBODY[d.type];
    const u = ent({ team, kind: tb[0], body: tb[1], tier: d.tier, hid, ty: d.type, st: { dmg: d.dmg, atk: d.atk, spd: d.spd, range: d.range, splashR: d.splashR, crash: d.crash }, fly: !!ty.fly, lane, x, y, r: TR[d.tier], hp, maxhp: hp, atkCd: rnd(0, 1), ox: laneX(lane) + rnd(-LW * 0.3, LW * 0.3), stampT: 0, backT: 0, throws: 0, sgT: 0 });
    G.units.push(u); ev({ k: 'spawn', x, y, tier: d.tier, kind: tb[0], team, lane, hid }); return u;
  }
  const hp = ST[kind][tier].hp * CFG.unitHpMul * grow;
  const u = ent({ team, kind, tier, fly: tier === 4, lane, x, y, r: TR[tier], hp, maxhp: hp, atkCd: rnd(0, 1), ox: laneX(lane) + rnd(-LW * 0.3, LW * 0.3), stampT: 0, backT: 0 });
  G.units.push(u); ev({ k: 'spawn', x, y, tier, kind, team, lane }); return u;
}
const costOf = tier => CFG.cost[tier];
function canSummon(h, tier) { return (!h.dead || CFG.deadPlay) && h.seeds >= costOf(tier) && G.units.reduce((a, u) => a + (u.team === h.team && !u.dead ? 1 : 0), 0) < CFG.unitCap; }
function summon(h, tier, kind, hid) {
  if (!canSummon(h, tier)) return false;
  h.seeds -= costOf(tier); const p = spawnPt(h.team, h.lane), kd = kind === undefined ? (h === G.me && !G.auto ? G.sel : h.kind) : kind;
  const u = spawnUnit(h.team, kd, tier, h.lane, p.x + rnd(-LW * 0.3, LW * 0.3), p.y + rnd(-10, 10), hid);
  if (u.hid) { const s = hs(u.hid); s.plays++; s.seeds += costOf(tier); s.team[h.team]++; }
  G.stats.summoned[tier]++; G.stats.sumTeam[h.team] += costOf(tier); G.stats.spent[h.team][tier] += costOf(tier); ring(p.x, p.y, 50, TCOL[h.team], 0.45); float(p.x, p.y - 30, u.hid ? HD[u.hid].name : BODIES[tier], '#fac775'); snd('summon_' + BODIES[u.body || tier].toLowerCase(), p.x, p.y, h);
  return true;
}
function setLane(h, lane) { h.lane = ((lane % NL) + NL) % NL; if (h === G.me) snd('lane_pick', h.x, h.y, h); }
function castSuper(h, x, y) {
  const sp = h.def.sup; if (h.dead || h.sup < 1) return false;
  let a = Math.atan2(y - h.y, x - h.x);
  if (sp.shape === 'circle') { const d = Math.hypot(x - h.x, y - h.y); if (d > sp.range) { x = h.x + Math.cos(a) * sp.range; y = h.y + Math.sin(a) * sp.range; } }
  h.aimA = a; h.supT = 0.5; sp.fn(h, x, y, a); h.sup = 0; h.invisT = sp.key === 'vanish' ? h.invisT : 0;
  G.stats.casts[h.def.id] = (G.stats.casts[h.def.id] || 0) + 1; float(h.x, h.y - 46, sp.name, '#fac775'); snd(h.def.id + '_sup', h.x, h.y, h); return true;
}
function attack(h, x, y) {
  if (h.dead || h.atkCd > 0 || h.ammo < 1) return false;
  const a = Math.atan2(y - h.y, x - h.x), at = h.def.atk;
  if (at.shape === 'circle') { const d = Math.hypot(x - h.x, y - h.y); if (d > at.range) { x = h.x + Math.cos(a) * at.range; y = h.y + Math.sin(a) * at.range; } }
  h.aimA = a; h.fireT = 0.15; at.fn(h, a, x, y); h.invisT = 0; h.revT = 0.8; h.atkCd = at.gap; h.ammo -= 1; h.hitT = Math.max(h.hitT, CFG.regenWait);
  snd(h.def.id + '_atk', h.x, h.y, h); return true;
}

// ---- bots
function laneState(team, lane) { // what stands in a lane, seen from team's side
  let foe = 0, own = 0, front = null, ownFront = null;
  for (const u of G.units) { if (u.dead || u.lane !== lane) continue; const adv = team === BLUE ? H - u.y : u.y; // distance from own base end
    if (u.team === team) { own += TM[u.tier]; if (!ownFront || adv > ownFront.adv) ownFront = { u, adv }; } else { foe += TM[u.tier] * (1 + (H - adv) / H) * (u.ty === 'G' ? 3 : 1); if (!front || adv < front.adv) front = { u, adv }; } }   // a siege is a threat worth three of its size
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
const hitsAir = c => c.hid && HD[c.hid] ? !!TYPES[HD[c.hid].type].air : ST[c.kind][c.tier].range > 60 || c.tier === 3 || c.tier === 4;
const tyOf = c => c && c.hid && HD[c.hid] ? HD[c.hid].type : null;
function sendWave(h, lane, defend, air) { // play the hand into one lane until nothing in it is affordable. A defending wave skips Brutes
  h.lane = lane; let guard = 0, played = 0;                                              // (they walk past fights) and wants something that hits flyers
  while (guard++ < 12) {
    let ok = []; for (let i = 0; i < HAND; i++) if (canPlay(h, i) && !(defend && (HON ? (TANKHIT && HOM.tankDefend !== false ? /G/ : /[TG]/).test(tyOf(h.hand[i])) : h.hand[i].tier === 2))) ok.push(i);
    if (!ok.length) break;
    if (air && ok.some(i => hitsAir(h.hand[i]))) ok = ok.filter(i => hitsAir(h.hand[i]));
    if (HON && !defend) {   // homies: a siege goes in behind the push (last in the wave, and not alone into an empty lane); flyers go where nothing hits air
      if (!played && !laneState(h.team, lane).ownFront) { const ns = ok.filter(i => tyOf(h.hand[i]) !== 'G'); if (ns.length) ok = ns; else if (h.seeds < CFG.carry) break; }
      if (ok.some(i => tyOf(h.hand[i]) === 'A') && !G.units.some(u => !u.dead && u.team !== h.team && u.lane === lane && (u.hid ? TYPES[u.ty].air : ST[u.kind][u.tier].range > 60 || u.tier === 3 || u.fly))) ok = ok.filter(i => tyOf(h.hand[i]) === 'A');
    }
    let pick = ok[Math.floor(rnd(0, ok.length))];
    if (Math.random() < skillOf(h).big) for (const i of ok) if (h.hand[i].tier > h.hand[pick].tier) pick = i;   // half the time (level 2) the biggest it can pay for
    if (HON && ((!played && !defend && h.plan && h.plan.save) || Math.random() < (HOM.bot && HOM.bot.dear || 0))) for (const i of ok) if (h.hand[i].tier > h.hand[pick].tier) pick = i;   // homies: lead a saved-up wave with the dearest card, and often (homies.bot.dear) take the dearest that can be paid for
    if (!playCard(h, pick)) break; played++;
  }
}
function siegeAt(team) { const b = BASEPOS[team]; let best = null, bd = SIEGE.stop + 80; for (const u of G.units) if (!u.dead && u.team !== team && u.ty === 'G') { const d = dist(u, b); if (d < bd) { bd = d; best = u; } } return best; }
function botSummon(h) {
  if (h.dead && !CFG.deadPlay) return;
  // a lane where the other team is winning near our base gets units first
  let worst = -1, wv = 0; for (let i = 0; i < NL; i++) { const s = laneState(h.team, i); const v = s.foe - s.own; if (v > wv && s.foe >= 4 && s.front && (h.team === BLUE ? s.front.y > H * 0.45 : s.front.y < H * 0.55)) { wv = v; worst = i; } }
  if (UPG && botUpgrade(h, worst >= 0)) return;
  if (worst >= 0 && h.seeds >= 3 && Math.random() < (skillOf(h).defend === null ? CFG.botDefend : skillOf(h).defend) * (HON && h.plan && h.plan.save ? 0.5 : 1)) { const fl = G.units.some(u => !u.dead && u.team !== h.team && u.lane === worst && u.fly); sendWave(h, worst, true, fl); h.plan = null; return; }
  // otherwise save up and send a wave down one lane: the home lane, or the lane where the other team is thinnest
  if (!h.plan) { let lane = h.home; if (Math.random() < 0.45) { let b = 1e9; for (let i = 0; i < NL; i++) { const s = laneState(h.team, i), v = s.foe - s.own * 0.5 + rnd(0, 2) - (TW ? TW.laneBias(h.team, i) : 0); if (v < b) { b = v; lane = i; } } } h.plan = { budget: [4, 5, 6, 8, 9, 10][Math.floor(rnd(0, 6))], lane }; if (HON && Math.random() < (HOM.bot && HOM.bot.save !== undefined ? HOM.bot.save : 0.6)) { h.plan.budget = Math.max(h.plan.budget, ...h.hand.map(c => c ? costOf(c.tier) : 0)); h.plan.save = true; } }   // homies: often save up for the dearest card in hand and lead the wave with it
  if (h.seeds >= Math.min(CFG.carry, h.plan.budget)) { sendWave(h, h.plan.lane, false, false); h.plan = null; }
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
  if (!go && mid(h) && foeH && fhd < (sp.range || 300) + 40) go = sp.shape === 'self' || b === 'ambush' || b === 'ownUnits' ? h : foeH;
  if (go) castSuper(h, go.x, go.y);
}
// ?botmid=1, recording takes only (auto=1): my hero's bot holds the middle lane and fights there. No seed detours past 220
// from the lane, no siege duty, backs off at half health, casts the super as soon as an enemy is in its reach (Marketing,
// 2026-11-17: the bots farmed side lanes and Kero never cast in 120 s). Other heroes and every sim are unchanged.
const BOTMID = /[?&]botmid=1\b/.test(QS), mid = h => BOTMID && G && G.auto && h === G.me;
function botThink(h, dt) {
  const at = h.def.atk, lobber = at.shape === 'circle', see = e => lobber || !blocked(h.x, h.y, e.x, e.y);
  let foeH = null, fhd = 1e9; for (const e of G.heroes) if (e.team !== h.team && !e.dead && e.invisT <= 0) { const d = dist(e, h); if (d < fhd) { fhd = d; foeH = e; } }
  let tgt = null, td = 1e9;
  if (foeH && fhd < h.def.atkRange + 150 && see(foeH)) { tgt = foeH; td = fhd; }
  if (!tgt || td > h.def.atkRange + 20) for (const u of G.units) if (!u.dead && u.team !== h.team) { const d = dist(u, h); if (d < h.def.atkRange + 60 && d < td && see(u)) { td = d; tgt = u; } }
  if (TW && (!tgt || td > h.def.atkRange + 20)) { const t = TW.botTarget(h); if (t && see(t)) { tgt = t; td = dist(t, h); } }   // [towers]
  h.think -= dt;
  if (h.think <= 0) {
    h.think = skillOf(h).think; const home = BASEPOS[h.team], dir = h.team === BLUE ? 1 : -1;
    botSummon(h);
    if (h.hp < h.maxhp * (mid(h) ? 0.5 : 0.3) || (h.goal && h.goal.heal && h.hp < h.maxhp * 0.8)) h.goal = mid(h) ? { x: laneX(1), y: dir > 0 ? Math.min(h.y + 260, home.y - 300) : Math.max(h.y - 260, home.y + 300), heal: true } : { x: home.x + (h.idx - 1) * 50, y: home.y - dir * 140, heal: true };   // botmid: back off a little, stay in sight
    else {
      let sd = null, sdd = h.seeds < 4 ? 520 : 300; if (h.seeds < CFG.carry) for (const s of G.seeds) { if (s.to || inWall(s.x, s.y, 10)) continue; const d0 = dist(s, h); if (G.heroes.some(e => e !== h && e.team === h.team && !e.dead && e.seeds < CFG.carry && dist(s, e) < d0)) continue; const d = d0 + (foes(h.team, s.x, s.y, 170, false).length ? 220 : 0); if (d < sdd) { sdd = d; sd = s; } }
      if (sd && mid(h) && Math.abs(sd.x - laneX(1)) > 220) sd = null;
      const sg = HON && !mid(h) ? siegeAt(h.team) : null;
      if (sg && G.heroes.filter(e => e.team === h.team && !e.dead).sort((a, b) => dist(a, sg) - dist(b, sg))[0] === h) h.goal = { x: sg.x, y: sg.y + (h.team === BLUE ? 1 : -1) * 40 };   // the nearest hero goes to kill a siege that throws at his base
      else if (sd) h.goal = { x: sd.x, y: sd.y };
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
  if (TW) { const [ax, ay] = TW.botAvoid(h); mx += ax; my += ay; }   // [towers] out of a tower's reach unless our units take its shots
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  h.mx = mx; h.my = my;
  if (tgt) { h.aimA = Math.atan2(tgt.y - h.y, tgt.x - h.x);
    if (td < h.def.atkRange + tgt.r && h.atkCd <= 0 && h.ammo >= 1) { if (!tgt.isHero) attack(h, tgt.x, tgt.y); else if (h.botWait > 0) h.botWait -= dt; else { const k = skillOf(h), a = h.aimA + rnd(-k.aim, k.aim); attack(h, h.x + Math.cos(a) * td, h.y + Math.sin(a) * td); h.botWait = rnd(k.wait[0], k.wait[1]); } } }
  if (h.sup >= 1) { h.supReady = (h.supReady || 0) + dt; if (h.supReady >= skillOf(h).supWait) botSuper(h, foeH, fhd); } else h.supReady = 0;
}

function moveHero(e, vx, vy, dt) { e.x += vx * dt; e.y += vy * dt; pushOut(e); if (TW) TW.solid(e); e.x = clamp(e.x, e.r, W - e.r); e.y = clamp(e.y, e.r, H - e.r); }
function moveUnit(u, vx, vy, dt) { u.x += vx * dt; u.y += vy * dt; if (TW && !u.fly) TW.solid(u); if (inSpan(u.y)) u.x = clamp(u.x, laneL(u.lane) + u.r, laneR(u.lane) - u.r); u.x = clamp(u.x, u.r, W - u.r); u.y = clamp(u.y, u.r, H - u.r); }
function spd(e, base) { return e.rootT > 0 ? 0 : base * (e.hasteT > 0 ? e.hasteV : 1) * (e.slowT > 0 ? 1 - e.slowV : 1); }
function tickStatus(e, dt) { for (const k of ['slowT', 'rootT', 'hasteT', 'invisT', 'shieldT', 'stampT', 'invuln', 'ambT', 'revT', 'shelterT', 'backT', 'supT']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt); if (e.slowT <= 0) e.slowV = 0; }

function update(dt) {
  if (!G || G.over) return; G.t += dt; G.time -= dt;
  if (G.time <= 0) { const b = G.base[1].hp, r = G.base[2].hp; finish(b === r ? (TW ? TW.tieBreak() : 0) : b > r ? BLUE : RED, 'timer'); return; }   // [towers] equal thrones: tower health left
  G.statT += dt; if (G.statT >= 1) { G.statT -= 1; const st = G.stats, ld = Math.sign(G.base[1].hp - G.base[2].hp); if (ld && st.lead && ld !== st.lead) st.leadChanges++; if (ld) st.lead = ld; if (st.lead60 === null && CFG.time - G.time >= 60) st.lead60 = ld; }
  if (CFG.late && !G.lateOn && G.time <= CFG.late.at) { G.lateOn = true; for (const b of [G.base[1], G.base[2]]) { float(b.x, b.y - 90, 'base hits count ' + ({ 2: 'double', 3: 'triple' }[CFG.late.base] || CFG.late.base + 'x'), '#fac775'); ring(b.x, b.y, 200, '#fac775', 1); } snd('late_double', G.me.x, G.me.y, 'match'); }
  const me = G.me, I = root.SBL_INPUT;
  if (!G.auto && !me.dead && I) { me.mx = I.mx; me.my = I.my; if (I.aimA !== null) me.aimA = I.aimA; if (I.fire) { attack(me, me.x + Math.cos(I.fireA) * I.fireD, me.y + Math.sin(I.fireA) * I.fireD); I.fire = I.hold; } }
  const lead = G.base[1].hp - G.base[2].hp;
  G.flip = !G.flip;                                   // heroes and units act in alternating order, so neither team always moves first
  for (const h of G.heroes) {
    if (h.dead) { h.respawn -= dt;
      if (CFG.deadPlay) { const bh = h.team === BLUE ? -lead : lead; h.seedT += dt * (CFG.comeback && bh > 0 ? 1 + CFG.comeback.under * 2 * bh / CFG.baseHp : 1) * (1 + CFG.seedRamp * G.t / CFG.time); if (h.seedT >= CFG.seedEvery) { h.seedT = 0; if (h.seeds < CFG.carry) h.seeds++; } if (h.bot) { h.think -= dt; if (h.think <= 0) { h.think = skillOf(h).think; botSummon(h); } } }
      if (h.respawn <= 0) { const b = BASEPOS[h.team], sp = h.spawnAt || spawnSpot(h); h.spawnAt = null; Object.assign(h, { dead: false, hp: h.maxhp, ammo: 3, x: sp.x, y: sp.y, slowT: 0, rootT: 0, invuln: CFG.respawnInvuln, goal: null }); if (h === me) snd('hero_respawn', h.x, h.y, h);
        const rg = CFG.respawnGuard; if (rg) { let n = 0; for (const u of G.units) if (!u.dead && u.team !== h.team && Math.hypot(u.x - b.x, u.y - b.y) < rg.r) { shove(u, rg.shove); rootE(u, rg.root); n++; } if (n) { ring(b.x, b.y, rg.r, TCOL[h.team], 0.6); ev({ k: 'guard', x: b.x, y: b.y, r: rg.r, team: h.team, n }); } } }
      continue; }
    tickStatus(h, dt); h.atkCd = Math.max(0, h.atkCd - dt); h.ammo = Math.min(3, h.ammo + dt / h.def.atk.reload); if (h.fireT > 0) h.fireT -= dt;
    h.inBush = BUSHES.some(b => Math.hypot(h.x - b.x, h.y - b.y) < b.r); if (h.inBush && !(h.revT > 0) && !G.heroes.some(e => e.team !== h.team && !e.dead && dist(e, h) < 95)) h.invisT = Math.max(h.invisT, 0.08);
    if (h.hitT > 0) h.hitT -= dt; else h.hp = Math.min(h.maxhp, h.hp + h.maxhp * CFG.regen * dt);
    // seeds trickle in; the team whose base is behind gets them faster
    const behind = h.team === BLUE ? -lead : lead, cm = CFG.comeback && behind > 0 ? 1 + CFG.comeback.under * 2 * behind / CFG.baseHp : 1;
    h.seedT += dt * cm * (1 + CFG.seedRamp * G.t / CFG.time); if (h.seedT >= CFG.seedEvery) { h.seedT = 0; if (h.seeds < CFG.carry) h.seeds++; }
    if (h.bot) botThink(h, dt);
    const s = spd(h, h.def.spd); moveHero(h, h.mx * s, h.my * s, dt);
    for (let i = G.seeds.length - 1; i >= 0; i--) { const sd = G.seeds[i]; if (h.seeds < CFG.carry && Math.hypot(sd.x - h.x, sd.y - h.y) < 32 && (!sd.to || sd.to === h)) { G.seeds.splice(i, 1); h.seeds++; { const fi = FARMS.findIndex(f => Math.hypot(f.x - sd.tx, f.y - sd.ty) < 120), k = h.team + ':' + (fi < 0 ? 'drop' : fi); G.stats.pick[k] = (G.stats.pick[k] || 0) + 1; } if (h === me) snd('seed_pickup', h.x, h.y, h); } }
    if (CFG.heroGrow) { const l = hlv(); if (l !== (h.lv || 0)) { h.lv = l; float(h.x, h.y - h.r - 26, 'level ' + (l + 1) + (HON && HOM.heroVsUnit && HOM.heroVsUnit.lv ? ': attack up' : ''), '#fac775'); ring(h.x, h.y, 60, '#fac775', 0.5); if (h === me) snd('level_up', h.x, h.y, h); } }
    const ob = BASEPOS[h.team]; if (dist(ob, h) < 190) h.hp = Math.min(h.maxhp, h.hp + 800 * dt);
  }
  for (const f of FARMS) { f.t += dt; if (f.t >= f.every) { f.t = 0; if (G.seeds.filter(s => Math.hypot(s.tx - f.x, s.ty - f.y) < 110).length < f.cap) { const a = rnd(0, 6.28), d = rnd(42, 80); dropSeed(f.x + Math.cos(a) * d * (f.mid ? 0.45 : 1), f.y + Math.sin(a) * d, f.x, f.y); snd('seed_farm', f.x, f.y, f); } } }
  if (TW) TW.tick(dt);   // [towers] towers shoot
  for (const b of [G.base[1], G.base[2]]) {
    if (TW && TW.throne(b, dt)) continue;   // [towers] the throne's slow splash replaces the base gun
    const bg = CFG.baseGun; b.gunT -= dt; let e = null, bd = bg.range;
    for (const u of G.units) if (!u.dead && u.team !== b.team) { const d = dist(u, b); if (d < bd) { bd = d; e = u; } }
    for (const h of G.heroes) if (!h.dead && h.team !== b.team && h.invisT <= 0) { const d = dist(h, b); if (d < bd) { bd = d; e = h; } }
    if (e && !b.awake) { b.awake = true; ring(b.x, b.y, bg.range, TCOL[b.team], 0.8); float(b.x, b.y - 70, 'base awake', TCOL[b.team]); snd('base_awake', b.x, b.y, b); }
    const gr = CFG.gunRage, lost = gr ? Math.max(0, 1 - b.hp / CFG.baseHp) : 0;
    if (e && b.gunT <= 0) { b.gunT = bg.every / (1 + (gr ? gr.every * lost : 0)); b.shotT = G.t; line(b.x, b.y, e.x, e.y, TCOL[b.team]); hurt(e, bg.dmg * (1 + (gr ? gr.dmg * lost : 0)), null, { from: b }); snd('base_shot', b.x, b.y, b); }
  }
  for (const u of G.units) {
    if (u.dead) continue; tickStatus(u, dt); u.atkCd -= dt; const k = KINDS[u.kind], TY = u.hid ? TYPES[u.ty] : null, cs = u.st || ST[u.kind][u.tier];
    if (TY && TY.siege && !(u.backT > 0)) {   // siege: stops outside the base gun and throws at the base
      if (SIEGEHIT) { let blk = null, bd = 30; const fs = u.team === BLUE ? -1 : 1;   // an enemy ground unit right in front of it in its lane: stop and throw at it
        for (const e of G.units) if (!e.dead && e.team !== u.team && !e.fly && e.lane === u.lane && (e.y - u.y) * fs > -e.r) { const d = Math.abs(e.y - u.y) - e.r; if (d < bd) { bd = d; blk = e; } }
        if (blk) { if (u.atkCd <= 0) { u.atkCd = 1; hurt(blk, SIEGEHIT[u.tier] || 0, null, { quiet: true, from: u }); snd(KINDS[u.kind].id + '_' + bodyId(u) + '_atk', u.x, u.y, u); } continue; } }
      { const tw = TW && TW.siegeTarget(u); if (tw) { if (dist(tw, u) <= SIEGE.stop) { u.sgT += dt; if (u.sgT >= SIEGE.every) { u.sgT -= SIEGE.every; u.throws++; TW.siegeThrow(u, tw); if (u.throws >= SIEGE.throws) kill(u, null); } continue; } } }   // [towers] a tower in the way takes the throws
      const eb = G.base[3 - u.team];
      if (dist(eb, u) <= SIEGE.stop && !(TW && TW.guarded(eb))) { u.sgT += dt; if (u.sgT >= SIEGE.every) { u.sgT -= SIEGE.every; u.throws++;
          const dm = TM[u.tier] * SIEGE.share * (u.st.crash || 1) * (u.stampT > 0 ? 2 : 1) * (CFG.late && G.time <= CFG.late.at ? CFG.late.base : 1); eb.hp -= dm; hs(u.hid).base += dm;
          ev({ k: 'uatk', x: u.x, y: u.y, tx: eb.x, ty: eb.y, tier: u.tier, kind: u.kind, team: u.team, hid: u.hid, siege: true }); ring(eb.x, eb.y, 40, TCOL[u.team], 0.3); float(eb.x + rnd(-30, 30), eb.y - 60, '-' + (Math.round(dm * 100) / 100), TCOL[u.team]); snd(eb.team === G.me.team ? 'base_hit_ours' : 'base_hit_theirs', eb.x, eb.y, eb);
          if (eb.hp <= 0) { eb.hp = 0; finish(u.team, 'base'); }
          if (u.throws >= SIEGE.throws) kill(u, null); }
        continue; }
    }
    let foe = null, fd = cs.range + (TY ? TY.aggro || 0 : 60); const air = TY ? !!TY.air : cs.range > 60 || u.tier === 3 || u.fly;
    if ((TY ? !TY.noAtk : u.tier !== 2) && !(u.backT > 0)) {
      for (const e of G.units) if (!e.dead && e.team !== u.team && (air || !e.fly)) { const d = (LANE && TY && !u.fly && !e.fly && e.lane === u.lane ? Math.abs(e.y - u.y) : dist(e, u)) - e.r; if (d < fd && (e.lane === u.lane || !blocked(u.x, u.y, e.x, e.y))) { fd = d; foe = e; } }
      if (!(TY && TY.unitsOnly)) for (const e of G.heroes) if (!e.dead && e.team !== u.team && e.invisT <= 0) { const d = dist(e, u) - e.r; if (d < fd && !blocked(u.x, u.y, e.x, e.y)) { fd = d; foe = e; } }
    }
    if (TW && !foe && !(u.backT > 0)) { const tw = TW.unitTarget(u); if (tw) { foe = tw; fd = dist(tw, u) - tw.r; } }   // [towers] nothing to fight: the tower in the way
    if (foe) {
      if (LANE && TY) fd = dist(foe, u) - foe.r;   // picked along the lane, hit only in true reach (the chase is in 2D)
      if (fd <= cs.range) { if (u.atkCd <= 0) { u.atkCd = TY ? cs.atk : 1; const dmg = TY ? (TY.tank ? TANKHIT[u.tier] || 0 : cs.dmg) : cs.dmg * CFG.unitDmgMul; hurt(foe, dmg * clsMul(u, foe), null, { quiet: true, from: u }); snd(k.id + '_' + (TY && TY.tank ? 'colossus' : bodyId(u)) + '_atk', u.x, u.y, u);
          if (TY ? TY.splash : u.tier === 3) { const sr = TY ? cs.splashR : 46; ring(foe.x, foe.y, sr, k.col, 0.3); for (const e of G.units) if (e !== foe && !e.dead && e.team !== u.team && (!TY || air || !e.fly) && Math.hypot(e.x - foe.x, e.y - foe.y) < sr) hurt(e, dmg * 0.6 * clsMul(u, e), null, TY ? { quiet: true, by: u } : { quiet: true }); }
          if (cs.range > 60) line(u.x, u.y, foe.x, foe.y, k.col); } }
      else { const d = dist(foe, u) || 1, s = spd(u, cs.spd); moveUnit(u, (foe.x - u.x) / d * s, (foe.y - u.y) / d * s, dt); }
      continue;
    }
    const eb = G.base[3 - u.team], s = spd(u, cs.spd), fwd = -back(u) * (u.backT > 0 ? -1 : 1);
    const past = u.team === BLUE ? u.y < Y0 + 6 : u.y > Y1 - 6;
    if (past && !(u.backT > 0)) {
      const d = dist(eb, u);
      if (d < 46 && !(TW && TW.guarded(eb))) { u.dead = true; G.stats.arrived++; G.stats.arrTeam[u.team]++; const dm = TM[u.tier] * (u.st && u.st.crash || 1) * (u.stampT > 0 ? 2 : 1) * (CFG.late && G.time <= CFG.late.at ? CFG.late.base : 1); eb.hp -= dm; if (u.hid) hs(u.hid).base += dm; ring(eb.x, eb.y, 60, TCOL[u.team], 0.3); float(eb.x + rnd(-30, 30), eb.y - 60, '-' + dm, TCOL[u.team]); snd(eb.team === G.me.team ? 'base_hit_ours' : 'base_hit_theirs', eb.x, eb.y, eb);
        if (eb.hp <= 0) { eb.hp = 0; finish(u.team, 'base'); } continue; }
      moveUnit(u, (eb.x - u.x) / d * s, (eb.y - u.y) / d * s, dt);
    } else { const dx = clamp((u.ox - u.x) / 60, -0.5, 0.5); moveUnit(u, dx * s, fwd * s, dt); }
  }
  { const U = G.units, sp = CFG.space, mul = sp ? sp.mul : 0.95, pu = sp ? sp.push : 0.3;
    for (let i = 0; i < U.length; i++) { const a = U[i]; if (a.dead) continue; for (let j = i + 1; j < U.length; j++) { const b = U[j]; if (b.dead || a.fly !== b.fly) continue; let dx = b.x - a.x, dy = b.y - a.y; let m = (a.r + b.r) * (sp && sp.own && a.team !== b.team ? 0.95 : mul);
      if (HSP && a.hid && b.hid) m = Math.max(m, (bodyR(a) + bodyR(b)) * (a.team === b.team ? HSP.same : HSP.foe)); if (Math.abs(dx) > m || Math.abs(dy) > m) continue; let d = Math.hypot(dx, dy); if (d >= m) continue; if (d < 0.05) { dx = rnd(-1, 1); dy = rnd(-1, 1); d = Math.hypot(dx, dy) || 1; }
      if (!sp) { const q = (m - d) * 0.3 / d; a.x -= dx * q; a.y -= dy * q; b.x += dx * q; b.y += dy * q; continue; }
      // the bigger body gives way less (Colossus 19 against Grunt 9 moves about half as far), and a creep is kept inside its lane
      // side (0..1): how much of the push goes along the lane; below 1 a group spreads across the lane more than along it, so it is not slowed
      const q = (m - d) * pu / d, wa = b.r / (a.r + b.r) * 2, wb = a.r / (a.r + b.r) * 2, qy = sp.side === undefined ? 1 : sp.side, sx = (dx < 0 ? -1 : 1) * Math.abs(dy) * (1 - qy);
      a.x -= (dx + sx) * q * wa; a.y -= dy * q * wa * qy; b.x += (dx + sx) * q * wb; b.y += dy * q * wb * qy;
      for (const e of [a, b]) if (inSpan(e.y)) e.x = clamp(e.x, laneL(e.lane) + e.r, laneR(e.lane) - e.r); } } }
  // homies give way to heroes: a ground homie inside a hero's drawn body is pushed out (the hero is never moved by it)
  if (HSP) for (const u of G.units) { if (u.dead || !u.hid || u.fly) continue; for (const h of G.heroes) { if (h.dead) continue; let dx = u.x - h.x, dy = u.y - h.y; const m = HSP.hero + bodyR(u); if (Math.abs(dx) > m || Math.abs(dy) > m) continue; let d = Math.hypot(dx, dy); if (d >= m) continue; if (d < 0.05) { dx = 0; dy = u.team === BLUE ? 1 : -1; d = 1; }
      const q = (m - d) * HSP.push / d; u.x += dx * q; u.y += dy * q; if (inSpan(u.y)) u.x = clamp(u.x, laneL(u.lane) + u.r, laneR(u.lane) - u.r); } }
  for (const p of G.projs) {
    const st = Math.hypot(p.vx, p.vy) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.left -= st;
    if (inWall(p.x, p.y, 0) || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.left = 0; ring(p.x, p.y, 12, '#d3d1c7', 0.15); continue; }
    if (p.healU) for (const u of G.units) if (!u.dead && u.team === p.team && !p.hit.has(u) && Math.hypot(u.x - p.x, u.y - p.y) < p.r + u.r) { p.hit.add(u); heal(u, p.healU, true); ring(u.x, u.y, 16, '#c0dd97', 0.25); }
    for (const e of foes(p.team, p.x, p.y, p.r, true, true)) { if (p.hit.has(e)) continue; p.hit.add(e); hurt(e, p.dmg, p.owner); if (p.onHit && !e.dead) p.onHit(e); if (e !== G.me && !e.dead) snd(e.isHero ? 'hit_hero' : e.tier === 2 ? 'unit_hit_armour' : e.tier === 5 ? 'unit_hit_big' : 'unit_hit_small', p.x, p.y, p.owner); if (!p.pierce) { p.left = 0; break; } }
  }
  G.projs = G.projs.filter(p => p.left > 0);
  for (const l of G.lobs) { l.t -= dt; if (l.t <= 0) { for (const e of foes(l.team, l.x, l.y, l.r, true, true)) hurt(e, l.dmg, l.owner, { noCharge: l.noCharge }); if (l.onLand) l.onLand(l); ring(l.x, l.y, l.r, '#fff', l.big ? 0.5 : 0.3); snd(l.snd, l.x, l.y, l.owner); } }
  G.lobs = G.lobs.filter(l => l.t > 0);
  for (const z of G.zones) { if (z.arm > 0) { z.arm -= dt; continue; } z.dur -= dt; z.acc += dt; while (z.acc >= z.every) { z.acc -= z.every; z.fn(z); } }
  G.zones = G.zones.filter(z => z.dur > 0);
  G.units = G.units.filter(u => !u.dead);
  for (const s of G.seeds) { if (s.to) { if (s.to.dead) s.to = null; else { const d = dist(s.to, s) || 1; s.x += (s.to.x - s.x) / d * 700 * dt; s.y += (s.to.y - s.y) / d * 700 * dt; continue; } } s.x += (s.tx - s.x) * Math.min(1, dt * 6); s.y += (s.ty - s.y) * Math.min(1, dt * 6); }
  for (const f of G.fx) f.life -= dt; G.fx = G.fx.filter(f => f.life > 0);
}

// [towers] lanes/towers.js (loaded before this file) builds the tower rules when ?towers= or CFG.towers picks a layout
if (root.SBL_TOWERS_MAKE) TW = root.SBL_TOWERS_MAKE({ get G() { return G; }, CFG, BLUE, RED, TCOL, KINDS, Y0, Y1, laneX, laneOf, hurt, foes, ring, float, snd, ev, finish, bodyId });
root.SBL = { get TW() { return TW; }, get G() { return G; }, homiesOn: HON, UPG, upgrade, canUpgrade, upCost, upNext, upNeed, HOMIES: HD, HOUT, TYPES, crewDeck, crewTiers, deckTiers, SIEGE, cardBody: c => BODIES[c.hid && HD[c.hid] ? TBODY[HD[c.hid].type][1] : c.tier], start: newGame, update, spawnUnit, HEROES, KINDS, BODIES, CFG, TM, ST, hitsAir, castSuper, attack, summon, canSummon, playCard, playCardN, canPlay, nextCard, cardName, DECKS, HAND, setLane, costOf, laneX, laneL, laneR, laneOf, spawnPt, spawnSpot, blocked, WALLS, GAPS, FARMS, BUSHES, BASEPOS, W, H, T, NL, LW, Y0, Y1, BLUE, RED, hlv, say, hpOf };
})(typeof window !== 'undefined' ? window : globalThis);
