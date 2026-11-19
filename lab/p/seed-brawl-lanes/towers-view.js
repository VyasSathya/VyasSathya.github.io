// Seed Brawl Lanes: towers before the throne, drawn (refine-towers, 2026-11-18). Rules: lanes/towers.js. Off (no ?towers=) this
// draws nothing. main.js calls build() once from buildWorld() and tick() once a frame (both marked "[towers]").
// Tower model: the world's own guard tree (game/src/world.js plot, tier 4 tree on a stone bed with the team ring), no new asset;
// a fallen tower leaves the bare stone bed. Effects are definitions in lanes/fx/defs (tower_shot, tower_hit, tower_fall,
// throne_splash, throne_wake, throne_fall), built from the game's own painted textures.
let C = null, views = [], lastG = null, seenEv = 0, throneDone = false, sleepFx = [], houses = [], fallAnim = null;
const TREE_S = 0.78;   // tree scale: a tower is about as tall as the throne's glass house (1.9 tiles)

export function build(c) {
  C = c; if (!c.SB.TW) return;
  const { SB, W, TEAM, wx, wz, world } = c;
  // one view per tower slot; the rules' towers are made per match in the same order (team Blue first, then Red)
  const cfg = SB.TW.C, slots = [];
  for (const team of [SB.BLUE, SB.RED]) for (const d of cfg.towers) {
    const x = d.x === 'lane' ? SB.laneX(d.lane) : d.x, y = (team === SB.BLUE ? SB.Y1 : SB.Y0) + (team === SB.BLUE ? 1 : -1) * d.dy;
    slots.push({ team, x, y }); }
  views = slots.map((s, i) => {
    const g = new c.THREE.Group(); g.position.set(wx(s.x), 0, wz(s.y));
    const tree = W.plot(4, TEAM[s.team], 11 + i * 7); tree.scale.setScalar(TREE_S); g.add(tree);
    const stump = W.plot(0, TEAM[0], 5 + i); stump.scale.setScalar(TREE_S); stump.visible = false; g.add(stump);
    world.add(g);
    const ring = c.flat(new c.THREE.RingGeometry(cfg.range * c.K - 0.05, cfg.range * c.K, 72), TEAM[s.team], 0.22); ring.position.set(wx(s.x), 0.013, wz(s.y)); world.add(ring);   // how far it shoots
    const lab = document.createElement('div'); lab.className = 'lab ubar' + (s.team === SB.G?.me?.team ? '' : ' foe'); lab.style.width = '46px'; lab.style.height = '6px'; lab.innerHTML = '<i></i>'; c.labels.appendChild(lab);
    return { i, s, g, tree, stump, ring, lab, hp: 1, wob: 0, down: false };
  });
  // the two glass houses (the thrones) main.js built, found by their kind, with a rubble bed for each once it falls
  houses = world.children.filter(o => o.userData.kind === 'base').map(o => { const team = o.position.z > 0 ? SB.BLUE : SB.RED, rub = W.plot(0, TEAM[0], 3 + team); rub.scale.setScalar(1.9); rub.position.copy(o.position); rub.visible = false; world.add(rub); return { o, team, rub }; });
}

function reset(G) {   // a new match: every tower stands again
  lastG = G; seenEv = 0; throneDone = false; fallAnim = null;
  for (const h of houses) { h.o.visible = true; h.o.scale.set(1, 1, 1); h.o.rotation.z = 0; h.o.position.y = 0; h.rub.visible = false; }
  for (const v of views) { v.tree.visible = true; v.stump.visible = false; v.ring.visible = true; v.down = false; v.hp = 1; v.wob = 0; v.lab.style.display = ''; v.lab.className = 'lab ubar' + (v.s.team === G.me.team ? '' : ' foe'); }
  for (const z of sleepFx) z && z.stop && z.stop(); sleepFx = [];
}

export function tick(G, dt) {
  if (!C || !views.length || !G || !G.towers) return;
  if (G !== lastG) reset(G);
  const FX = C.fx(), { wx, wz, K } = C, W2 = (x, y, h) => ({ x: wx(x), z: wz(y), y: h || 0 });
  // a sleeping throne (layout b) wears its towers' guard: a slow team glow round its feet until a tower falls
  if (FX && G.base) for (const t of [1, 2]) { const b = G.base[t]; if (b.sleep && !sleepFx[t]) sleepFx[t] = FX.play('throne_guard', { ...W2(b.x, b.y), radius: 1.9, duration: 999, team: t, element: 'seed' }); if (!b.sleep && sleepFx[t]) { sleepFx[t].stop && sleepFx[t].stop(); sleepFx[t] = null; } }
  // what the tower rules did this step
  const E = G.tev || [];
  for (const e of E) {
    if (!FX) continue;
    if (e.k === 'shot') { const h = e.hero ? 1.0 : 0.6; FX.play('tower_shot', { ...W2(e.x, e.y, 1.7), to: W2(e.tx, e.ty, h), travel: Math.min(0.35, Math.max(0.12, Math.hypot(e.tx - e.x, e.ty - e.y) / 900)), element: 'seed', team: e.team }); }
    else if (e.k === 'splash') FX.play('throne_splash', { ...W2(e.x, e.y, 2.0), to: W2(e.tx, e.ty), radius: e.r * K, travel: e.travel || 0.5, element: 'seed', team: e.team });
    else if (e.k === 'fall') { FX.play('tower_fall', { ...W2(e.x, e.y), radius: 1.6, element: 'dust', team: e.team }); if (C.near(e.y)) C.kick(0.14); }
    else if (e.k === 'wake') FX.play('throne_wake', { ...W2(e.x, e.y), radius: (C.SB.TW.C.throne.range) * K, element: 'seed', team: e.team });
  }
  E.length = 0;
  // the throne falls: the match ended at a base
  if (!throneDone && G.over && G.result && G.result.by === 'base') { throneDone = true; const lost = G.base[1].hp <= 0 ? G.base[1] : G.base[2];
    if (FX) FX.play('throne_fall', { ...W2(lost.x, lost.y), radius: 2.6, element: 'dust', team: lost.team }); C.kick(0.2);
    const h = houses.find(x => x.team === lost.team); if (h) fallAnim = { h, t: 0 }; }
  // the glass house caves in over 0.9 s (shudder, tilt, sink), then only its rubble bed is left
  if (fallAnim) { const a = fallAnim, o = a.h.o; a.t += dt; const k = Math.min(1, a.t / 0.9), e = k * k;
    o.rotation.z = (o.position.z > 0 ? 1 : -1) * 0.18 * e + Math.sin(a.t * 60) * 0.02 * (1 - k); o.scale.set(1 + 0.08 * e, Math.max(0.05, 1 - 0.95 * e), 1 + 0.08 * e); o.position.y = -0.3 * e;
    if (k >= 1) { o.visible = false; a.h.rub.visible = true; fallAnim = null; } }
  for (const v of views) {
    const t = G.towers[v.i]; if (!t) continue;
    if (t.dead && !v.down) { v.down = true; v.tree.visible = false; v.stump.visible = true; v.ring.visible = false; v.lab.style.display = 'none'; }
    if (v.down) continue;
    const hp = Math.max(0, t.hp / t.maxhp); if (hp < v.hp - 1e-4) v.wob = 0.18; v.hp = hp;
    if (v.wob > 0) { v.wob = Math.max(0, v.wob - dt); const k = v.wob / 0.18; v.tree.rotation.z = Math.sin(v.wob * 70) * 0.05 * k; v.tree.scale.set(TREE_S * (1 + 0.04 * k), TREE_S * (1 - 0.05 * k), TREE_S * (1 + 0.04 * k)); }
    else { v.tree.rotation.z = 0; v.tree.scale.setScalar(TREE_S); }
    if (t.shotT === G.t) { v.tree.scale.y = TREE_S * 1.06; }   // the tree pumps when it fires
    v.lab.firstChild.style.width = (hp * 100).toFixed(1) + '%';
    const p = C.project(wx(t.x), 2.6, wz(t.y)); v.lab.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
  }
}
