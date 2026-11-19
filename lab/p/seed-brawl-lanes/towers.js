// Seed Brawl Lanes: towers before the throne (refine-towers, 2026-11-18). His words: "also i think the base needs towers to kil
// lbefoer the throne", "the throne can attack too maybe slower and splash also all of it need good fx".
// Rules only, no screen code: it runs in the game and in the sims. Off unless ?towers=a or ?towers=b (game) or CFG.towers 'a' / 'b'
// (sims); off, core.js runs exactly as build 20. Numbers live in sim/towers.json (game: lanes/towers-cfg.js, made by
// tools/build-towers.js). core.js calls the hooks marked "[towers]"; this file never edits its state except through them.
//   a, Lane towers (Dota): a tower near our end of each lane. A lane's units stop at its tower until it falls; the throne cannot be
//      hurt until a tower falls; the throne shoots a slow splash at anything in its reach.
//   b, Guard towers (Clash Royale): two towers flanking the throne. Units past their lane's end go for the nearest tower; the
//      throne sleeps (does not shoot, cannot be hurt) until a tower falls.
// A fallen tower takes fallPts from its throne (the score at 5:00) and leaves rubble. At 5:00 with equal thrones, the team whose
// towers have more health left wins (Clash Royale's tie-break).
(function (root) {
'use strict';
root.SBL_TOWERS_MAKE = function (A) {
  const QS = (root.location && root.location.search) || '', m = QS.match(/[?&]towers=(\w+)/);
  const pick = m ? m[1] : A.CFG.towers, DATA = A.CFG.towersData || root.SBL_TOWERS_DATA;
  if (!pick || pick === '0' || !DATA || !DATA[pick]) return null;
  const C = Object.assign({}, DATA[pick], A.CFG.towersOver || {}), { BLUE, RED } = A, th = Object.assign({}, C.throne);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const G = () => A.G;
  function place(team, d) {   // dy runs from our lane end into the field (negative) or toward our base (positive)
    const x = d.x === 'lane' ? A.laneX(d.lane) : d.x, yEnd = team === BLUE ? A.Y1 : A.Y0, s = team === BLUE ? 1 : -1;
    return { x, y: yEnd + s * d.dy };
  }
  function start() {
    const g = G(); g.towers = [];
    for (const team of [BLUE, RED]) for (const d of C.towers) { const p = place(team, d);
      g.towers.push({ isTower: true, team, lane: d.lane, x: p.x, y: p.y, r: C.r, hp: C.hp, maxhp: C.hp, dead: false, invuln: 0, shield: 0, shelterT: 0, gunT: Math.random() * C.every, aggroT: 0, aggroOn: null, idx: g.towers.length }); }
    g.tev = []; g.tsplash = []; g.stats.towers = [];
    for (const b of [g.base[1], g.base[2]]) { b.sleep = !!C.throneSleeps; b.tgunT = 0; }
  }
  const live = team => G().towers.filter(t => !t.dead && t.team === team);
  // C.fallRage {dmg}: each fallen tower of a team makes its standing towers and its throne hit dmg x harder (a comeback for the side
  // that is losing its towers; Clash Royale's King Tower waking is the same idea). Absent = off.
  const rage = team => C.fallRage ? 1 + C.fallRage.dmg * G().towers.filter(t => t.dead && t.team === team).length : 1;
  // the throne of this team cannot be hurt yet
  function guarded(b) { const t = G().towers.filter(x => x.team === b.team); return C.throneGuard === 'anyFallen' ? t.every(x => !x.dead) : t.some(x => !x.dead); }
  function tev(o) { const E = G().tev; if (E.length < 300) E.push(o); }
  function wake(b) { if (!b.sleep) return; b.sleep = false; b.awake = true; A.ring(b.x, b.y, th.range, A.TCOL[b.team], 0.8); A.float(b.x, b.y - 70, 'throne awake', A.TCOL[b.team]); A.snd('base_awake', b.x, b.y, b); tev({ k: 'wake', team: b.team, x: b.x, y: b.y }); }
  function fall(t, by) {
    const g = G(); t.dead = true; t.hp = 0; const b = g.base[t.team];
    g.stats.towers.push([t.team, t.lane, Math.round(g.t)]);
    tev({ k: 'fall', team: t.team, x: t.x, y: t.y, idx: t.idx });
    A.float(t.x, t.y - 60, 'tower down', A.TCOL[3 - t.team]);
    A.snd('colossus_split', t.x, t.y, t); A.snd(t.team === g.me.team ? 'base_hit_ours' : 'base_hit_theirs', t.x, t.y, t);
    if (C.fallPts) { b.hp = Math.max(0, b.hp - C.fallPts); A.float(b.x, b.y - 60, '-' + C.fallPts, A.TCOL[3 - t.team]); if (b.hp <= 0) { A.finish(3 - t.team, 'base'); tev({ k: 'throneFall', team: b.team, x: b.x, y: b.y }); } }
    wake(b);
  }
  // [towers] hurt(): a hit on a tower. Heroes do heroMul of their hit (no super charge), a tank its tankHit, others unitMul.
  function hurt(t, d, src, o) {
    const g = G(); if (t.dead) return; o = o || {};
    const f = o.from;
    if (src && src.isHero) d = d * C.heroMul;
    else if (f && f.ty === 'T') d = (C.tankHit[f.tier] || 0);
    else d = d * C.unitMul;
    if (f && f.tier && A.CFG.late && g.time <= A.CFG.late.at) d *= C.lateMul;
    if (d <= 0) return;
    t.hp -= d; t.hitT = g.t; if (src && src.isHero) { t.heroHitT = g.t; g.stats.twHero = (g.stats.twHero || 0) + Math.min(d, d + t.hp); } else g.stats.twUnit = (g.stats.twUnit || 0) + Math.min(d, d + t.hp);   // counts only
    if (!o.quiet && src && src.isHero) A.float(t.x + (Math.random() - 0.5) * 16, t.y - 56, Math.round(d), '#fac775');
    if (t.hp <= 0) fall(t, src || f);
  }
  // [towers] the siege throws at the tower in its way: a standing tower of its lane (a) or, while the throne is guarded, the nearest
  function siegeTarget(u) {
    const g = G(), foe = 3 - u.team; let best = null, bd = 1e9;
    for (const t of g.towers) { if (t.dead || t.team !== foe) continue; if (C.laneLock && t.lane !== u.lane) continue; const d = dist(t, u); if (d < bd) { bd = d; best = t; } }
    if (best && (C.laneLock || guarded(g.base[foe]) || bd < C.taunt + 150)) return best;
    return null;
  }
  function siegeThrow(u, t) {
    const dm = C.siegeHit[u.tier] || 0; A.ev({ k: 'uatk', x: u.x, y: u.y, tx: t.x, ty: t.y, tier: u.tier, kind: u.kind, team: u.team, hid: u.hid, siege: true });
    A.snd(A.KINDS[u.kind].id + '_' + A.bodyId(u) + '_atk', u.x, u.y, u); hurt(t, dm, null, { from: { tier: u.tier, ty: 'G' } });
  }
  // [towers] a unit with no enemy unit or hero to fight: the tower it must go through, if any
  function unitTarget(u) {
    const g = G(), foe = 3 - u.team, past = u.team === BLUE ? u.y < A.Y0 + 6 : u.y > A.Y1 - 6, grd = guarded(g.base[foe]);
    let best = null, bd = 1e9;
    for (const t of g.towers) { if (t.dead || t.team !== foe) continue; const d = dist(t, u);
      if (C.laneLock) { if (t.lane === u.lane && d < C.taunt + t.r) { best = t; bd = d; } continue; }   // a: its own lane's tower, once near it
      if ((d < C.taunt + t.r || (past && grd)) && d < bd) { bd = d; best = t; } }
    if (!best && past && grd) for (const t of g.towers) if (!t.dead && t.team === foe && dist(t, u) < bd) { bd = dist(t, u); best = t; }   // never stand at a guarded throne
    if (best && !C.laneLock && !grd && dist(g.base[foe], u) < bd) return null;   // b: an open throne nearer than any tower is the target (Clash: the nearest building)
    return best;
  }
  // [towers] enemy towers inside a hero hit (cones, shots, lobs): added to foes()
  function foes(team, x, y, r, o) { for (const t of G().towers) if (!t.dead && t.team !== team && Math.hypot(t.x - x, t.y - y) < r + t.r) o.push(t); }
  // [towers] keep a body out of a standing tower
  function solid(e) { for (const t of G().towers) { if (t.dead) continue; const dx = e.x - t.x, dy = e.y - t.y, m = t.r + (e.r || 10), d = Math.hypot(dx, dy); if (d >= m) continue; if (d < 0.01) { e.y += t.team === BLUE ? -m : m; continue; } e.x = t.x + dx / d * m; e.y = t.y + dy / d * m; } }
  // [towers] the throne's attack in place of the base gun: slower, splash. Returns true (the base gun does not fire).
  function throne(b, dt) {
    const g = G(); b.tgunT -= dt; if (b.sleep) return true;
    let e = null, bd = th.range;
    for (const u of g.units) if (!u.dead && u.team !== b.team) { const d = dist(u, b); if (d < bd) { bd = d; e = u; } }
    for (const h of g.heroes) if (!h.dead && h.team !== b.team && h.invisT <= 0) { const d = dist(h, b); if (d < bd) { bd = d; e = h; } }
    if (e && !b.awake) { b.awake = true; A.ring(b.x, b.y, th.range, A.TCOL[b.team], 0.8); A.float(b.x, b.y - 70, 'base awake', A.TCOL[b.team]); A.snd('base_awake', b.x, b.y, b); }
    const gr = A.CFG.gunRage, lost = gr ? Math.max(0, 1 - b.hp / A.CFG.baseHp) : 0;
    if (e && b.tgunT <= 0) { b.tgunT = th.every / (1 + (gr ? gr.every * lost : 0)); b.shotT = g.t;
      const x = e.x, y = e.y, dm = th.dmg * (1 + (gr ? gr.dmg * lost : 0)) * rage(b.team);
      const fly = th.travel || 0.5; tev({ k: 'splash', team: b.team, x: b.x, y: b.y, tx: x, ty: y, r: th.splash, travel: fly });
      g.tsplash.push({ x, y, t: fly, dm, b }); }
    return true;
  }
  // towers shoot: the nearest enemy unit in reach, a hero when no unit is in reach, or the hero who hit one of our heroes inside
  // our reach in the last C.aggro seconds (Dota's tower aggro)
  function tick(dt) {
    const g = G();
    // the throne's shells land where the target stood when it fired (a slow splash can be walked out of)
    for (const sp of g.tsplash) { sp.t -= dt; if (sp.t > 0) continue; for (const f of A.foes(sp.b.team, sp.x, sp.y, th.splash)) { A.hurt(f, sp.dm, null, { from: sp.b, quiet: !f.isHero }); if (f.isHero && f.dead) g.stats.thKills = (g.stats.thKills || 0) + 1; } A.snd('thistle_land', sp.x, sp.y, sp.b); }
    g.tsplash = g.tsplash.filter(sp => sp.t > 0);
    for (const t of g.towers) { if (t.dead) continue; t.gunT -= dt; if (t.gunT > 0) continue;
      let e = null, bd = C.range; const mine = o => !C.laneLock || (t.team === BLUE ? o.y > A.Y1 : o.y < A.Y0) || (o.isHero ? A.laneOf(o.x) : o.lane) === t.lane;   // a: its own lane and the open ground before its base, not across the walls
      if (t.aggroOn && !t.aggroOn.dead && g.t - t.aggroT < C.aggro && dist(t.aggroOn, t) < C.range + t.aggroOn.r && t.aggroOn.invisT <= 0 && mine(t.aggroOn)) e = t.aggroOn;
      if (!e) for (const u of g.units) if (!u.dead && u.team !== t.team && mine(u)) { const d = dist(u, t) - u.r; if (d < bd) { bd = d; e = u; } }
      if (!e) for (const h of g.heroes) if (!h.dead && h.team !== t.team && h.invisT <= 0 && mine(h)) { const d = dist(h, t) - h.r; if (d < bd) { bd = d; e = h; } }
      if (!e) continue;
      t.gunT = C.every; t.shotT = g.t;
      tev({ k: 'shot', team: t.team, x: t.x, y: t.y, tx: e.x, ty: e.y, idx: t.idx, hero: !!e.isHero });
      A.hurt(e, C.dmg * rage(t.team), null, { from: t, quiet: !e.isHero }); A.snd('base_shot', t.x, t.y, t); if (e.isHero && e.dead) g.stats.twKills = (g.stats.twKills || 0) + 1; }
  }
  // [towers] hurt(): an enemy hero hit one of our heroes; our towers in reach of that hero turn on him (Dota's tower aggro)
  function heroHit(h, src) { const g = G(); for (const t of g.towers) if (!t.dead && t.team === h.team && dist(t, h) < C.range) { t.aggroOn = src; t.aggroT = g.t; } }
  // [towers] 5:00 with equal thrones: more tower health left wins
  function tieBreak() { const g = G(), s = team => g.towers.filter(t => t.team === team).reduce((a, t) => a + Math.max(0, t.hp) / t.maxhp, 0), b = s(BLUE), r = s(RED); return Math.abs(b - r) < 1e-6 ? 0 : b > r ? BLUE : RED; }
  // ---- bots
  // [towers] botThink: an enemy tower to shoot, when nothing else is in reach and our units are at it (or it is nearly down)
  function botTarget(h) {
    const g = G(); let best = null, bd = 1e9;
    for (const t of g.towers) { if (t.dead || t.team === h.team) continue; const d = dist(t, h); if (d > h.def.atkRange + t.r + 40) continue;
      const tanked = g.units.some(u => !u.dead && u.team === h.team && dist(u, t) < C.range * 0.8);
      if ((tanked || t.hp < t.maxhp * 0.15 || d > C.range + 10) && d < bd) { bd = d; best = t; } }
    return best;
  }
  // [towers] botThink: step out of an enemy tower's reach unless our units are taking its shots; returns [dx, dy]
  function botAvoid(h) {
    const g = G(); let mx = 0, my = 0;
    for (const t of g.towers) { if (t.dead || t.team === h.team) continue; const d = dist(t, h) || 1; if (d > C.range + 30) continue;
      if (g.units.some(u => !u.dead && u.team === h.team && dist(u, t) < C.range * 0.9) && h.hp > h.maxhp * 0.45) continue;
      mx += (h.x - t.x) / d; my += (h.y - t.y) / d; }
    return [mx, my];
  }
  // [towers] botSummon lane pick: a lane whose enemy tower is lower is worth more (subtracted from the lane's cost)
  function laneBias(team, lane) { let v = 0; for (const t of G().towers) if (t.team !== team && (C.laneLock ? t.lane === lane : t.lane === lane)) v += t.dead ? 1.5 : 2 * (1 - t.hp / t.maxhp); return v; }
  return { C, start, guarded, hurt, heroHit, siegeTarget, siegeThrow, unitTarget, foes, solid, throne, tick, tieBreak, botTarget, botAvoid, laneBias, pick };
};
})(typeof window !== 'undefined' ? window : globalThis);
