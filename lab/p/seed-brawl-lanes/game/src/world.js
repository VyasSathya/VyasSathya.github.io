// Seed Brawl world pieces, built procedurally in the shared look (look.js): same outline weight, same 3 band
// toon shading, same rim, same palette. Every piece is merged into ONE vertex-coloured mesh (plus its outline
// hull) so a piece costs 2 draw calls however many primitives it is made of.
//
// Units: 1 tile = 1 world unit, y up, +Z toward the game camera. Every factory returns a THREE.Group;
// group.userData.tick(t, dt) animates it if present (call tickAll(scene, t, dt) once per frame).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonMaterial, addOutline, blobShadow, teamRing, palette, OUTLINE_PX } from './look.js';

const P = palette;
const worldMat = toonMaterial({ vertexColors: true, rim: 0.45 });
const _c = new THREE.Color();

// ---------------------------------------------------------------- piece builder
// p.add(geometry, colour, [x,y,z], [rx,ry,rz], [sx,sy,sz]) collects parts; p.mesh() merges them.
class Piece {
  constructor() { this.parts = []; }
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...(typeof scl === 'number' ? [scl, scl, scl] : scl)));
    g.applyMatrix4(m);
    _c.set(color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }
  mesh({ outline = true, width = OUTLINE_PX, mat = worldMat } = {}) {
    const geo = mergeGeometries(this.parts, false);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    const grp = new THREE.Group();
    grp.add(mesh);
    if (outline) addOutline(grp, width);
    return grp;
  }
}
const sph = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const ball = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const torus = (R, r) => new THREE.TorusGeometry(R, r, 6, 20);
// deterministic random so the same piece always looks the same
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function tickAll(root, t, dt) { root.traverse((o) => { if (o.userData.tick) o.userData.tick(t, dt); }); }

// ---------------------------------------------------------------- ground
// Mid value, low saturation checker so tiles are countable and heroes pop.
export function ground(w = 21, h = 33) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  x.fillStyle = hex(P.grassA); x.fillRect(0, 0, 128, 128);
  x.fillStyle = hex(P.grassB); x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64);
  // a few painted grass flecks, low contrast
  const r = rng(7); x.fillStyle = 'rgba(255,255,230,0.07)';
  for (let i = 0; i < 40; i++) { const px = r() * 128, py = r() * 128; x.fillRect(px, py, 3, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / 2, h / 2); t.anisotropy = 4; t.magFilter = THREE.NearestFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  m.rotation.x = -Math.PI / 2;
  const grp = new THREE.Group(); grp.add(m);
  // darker edge band around the playfield
  const e = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, h + 6), new THREE.MeshBasicMaterial({ color: P.grassEdge }));
  e.rotation.x = -Math.PI / 2; e.position.y = -0.01; grp.add(e);
  return grp;
}

// ---------------------------------------------------------------- plot (tiers 0..5)
// A raised soil mound with a team ring. The plant grows with tier: 0 seed hole, 1 sprout, 2 bush,
// 3 small tree, 4 big tree, 5 giant bloom. The centre above the plant is left clear for the HUD number.
export const PLOT_R = 0.95;
export function plot(tier = 0, team = P.team.neutral, seed = 1) {
  const grp = new THREE.Group();
  const mound = new Piece()
    .add(cyl(PLOT_R * 0.92, PLOT_R, 0.22, 20), P.soil, [0, 0.11, 0])
    .add(cyl(PLOT_R * 0.8, PLOT_R * 0.92, 0.06, 20), P.soilTop, [0, 0.25, 0]);
  // a low stone kerb so the plot reads as a built bed from any angle
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; mound.add(sph(0.13, 0), i % 2 ? P.rockTop : P.rock, [Math.cos(a) * PLOT_R * 0.98, 0.1, Math.sin(a) * PLOT_R * 0.98], [i, i * 2, 0], [1.3, 0.8, 1]); }
  grp.add(mound.mesh());
  const ring = teamRing(PLOT_R * 1.28, team); grp.add(ring);
  grp.add(blobShadow(PLOT_R * 1.1, 0.18));
  const r = rng(seed * 97 + tier);
  const plant = new Piece();
  const top = 0.28;
  let sway = 0.03;
  if (tier === 0) {
    plant.add(cyl(0.2, 0.2, 0.02, 14), 0x3e2819, [0, top + 0.005, 0]).add(ball(0.11), P.seed, [0, top + 0.06, 0], [0.3, 0, 0], [1, 0.75, 0.8]);
    sway = 0;
  } else if (tier === 1) {
    plant.add(cyl(0.035, 0.05, 0.42, 6), P.stem, [0, top + 0.21, 0]);
    plant.add(ball(0.17), P.leaf, [-0.15, top + 0.42, 0], [0, 0, 0.5], [1, 0.32, 0.6]);
    plant.add(ball(0.17), P.leaf, [0.15, top + 0.46, 0], [0, 0, -0.5], [1, 0.32, 0.6]);
    sway = 0.08;
  } else if (tier === 2) {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + r(), d = 0.26;
      plant.add(sph(0.28, 1), i % 2 ? P.leaf : P.leafDark, [Math.cos(a) * d, top + 0.28 + r() * 0.08, Math.sin(a) * d]);
    }
    plant.add(sph(0.3, 1), P.leaf, [0, top + 0.5, 0]);
    plant.add(ball(0.07), P.bloom, [0.18, top + 0.72, 0.12]).add(ball(0.07), P.bloom, [-0.2, top + 0.62, -0.1]);
    sway = 0.05;
  } else {
    // trees
    const H = tier === 3 ? 0.75 : tier === 4 ? 1.15 : 1.35;
    const R = tier === 3 ? 0.42 : tier === 4 ? 0.58 : 0.6;
    const trunkR = tier === 3 ? 0.09 : 0.15;
    plant.add(cyl(trunkR * 0.8, trunkR * 1.25, H, 8), P.bark, [0, top + H / 2, 0]);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; plant.add(cone(trunkR * 0.7, 0.3, 6), P.barkDark, [Math.cos(a) * trunkR, top + 0.08, Math.sin(a) * trunkR], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]); }
    const n = tier === 3 ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + r() * 0.5;
      plant.add(sph(R * (0.72 + r() * 0.15), 1), i % 2 ? P.leafDark : P.leaf, [Math.cos(a) * R * 0.62, top + H + R * 0.05, Math.sin(a) * R * 0.62]);
    }
    plant.add(sph(R * 0.95, 1), P.leaf, [0, top + H + R * 0.45, 0]);
    if (tier === 4) for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; plant.add(ball(0.1), P.bloom, [Math.cos(a) * R * 0.95, top + H + R * 0.35, Math.sin(a) * R * 0.95]); }
    if (tier === 5) {
      // giant bloom on top: 7 petals and a gold centre, plus a few fruit
      const fy = top + H + R * 1.25;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; plant.add(ball(0.3), i % 2 ? P.bloom : 0xff94c8, [Math.cos(a) * 0.36, fy, Math.sin(a) * 0.36], [0, -a, 0.35], [1, 0.32, 0.62]); }
      plant.add(ball(0.22), P.bloomCenter, [0, fy + 0.07, 0], [0, 0, 0], [1, 0.6, 1]);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; plant.add(ball(0.09), P.seed, [Math.cos(a) * R, top + H + 0.05, Math.sin(a) * R]); }
    }
    sway = tier === 3 ? 0.035 : 0.02;
  }
  if (plant.parts.length) {
    const pm = plant.mesh();
    grp.add(pm);
    const ph = r() * 6;
    if (sway) pm.userData.tick = (t) => { pm.rotation.z = Math.sin(t * 1.6 + ph) * sway; pm.rotation.x = Math.cos(t * 1.3 + ph) * sway * 0.5; };
  }
  grp.userData.kind = 'plot'; grp.userData.tier = tier;
  grp.userData.setTeam = (c) => ring.children[0].material.color.set(c);
  return grp;
}

// ---------------------------------------------------------------- links between plots
// kind 'path': a flat dirt path (no outline, decal). kind 'vine': a low creeping vine with leaves, outlined.
export function link(a, b, kind = 'path') {
  const A = new THREE.Vector3(a.x, 0, a.z), B = new THREE.Vector3(b.x, 0, b.z);
  const dir = B.clone().sub(A), len = dir.length(), ang = Math.atan2(dir.x, dir.z);
  const grp = new THREE.Group();
  if (kind === 'path') {
    const mk = (w, color, y, order) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshBasicMaterial({ color, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = order; return m;
    };
    const inner = new THREE.Group();
    inner.add(mk(0.62, P.dirtDark, 0.004, 0), mk(0.5, P.dirt, 0.006, 0));
    // stepping stones so it reads as a path, not a stripe
    const stones = new Piece();
    const n = Math.max(1, Math.floor(len / 0.9));
    for (let i = 0; i < n; i++) { const z = -len / 2 + (i + 0.5) * len / n; stones.add(cyl(0.13, 0.15, 0.05, 7), P.rockTop, [(i % 2 ? 0.08 : -0.08), 0.025, z]); }
    inner.add(stones.mesh({ width: 1.2 }));
    inner.rotation.y = ang; inner.position.copy(A).lerp(B, 0.5); grp.add(inner);
  } else {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const f = i / 12; const p = A.clone().lerp(B, f); const s = Math.sin(f * Math.PI * 3) * 0.12; p.x += Math.cos(ang) * s; p.z -= Math.sin(ang) * s; p.y = 0.07 + Math.sin(f * Math.PI) * 0.02; pts.push(p); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const v = new Piece().add(new THREE.TubeGeometry(curve, 40, 0.055, 6), P.stem);
    const n = Math.floor(len / 0.55);
    for (let i = 1; i < n; i++) { const f = i / n, p = curve.getPoint(f), s = i % 2 ? 1 : -1; v.add(ball(0.11, 8, 6), i % 3 ? P.leaf : P.leafDark, [p.x + Math.cos(ang) * 0.1 * s, 0.09, p.z - Math.sin(ang) * 0.1 * s], [0, ang + s * 0.8, 0], [1, 0.3, 0.55]); }
    grp.add(v.mesh({ width: 1.4 }));
  }
  grp.userData.kind = 'link';
  return grp;
}

// ---------------------------------------------------------------- bush (hiding grass)
// A tile-sized clump of tall grass, one colour family, taller than a hero's knees (about 0.7 tile), so a hero
// standing in it shows only head and shoulders.
export function bush(seed = 1) {
  const r = rng(seed * 31 + 5);
  const p = new Piece();
  p.add(cyl(0.48, 0.5, 0.3, 10), P.bushDark, [0, 0.15, 0]);
  const blades = 11;
  for (let i = 0; i < blades; i++) {
    const a = i / blades * Math.PI * 2 + r() * 0.3, d = 0.18 + r() * 0.26, h = 0.55 + r() * 0.25;
    const lean = 0.25 + r() * 0.2;
    p.add(ball(0.17 + r() * 0.04, 8, 6), i % 3 === 0 ? P.bushLight : i % 3 === 1 ? P.bush : P.bushDark,
      [Math.cos(a) * d, 0.2 + h * 0.42, Math.sin(a) * d], [Math.sin(a) * lean, r(), -Math.cos(a) * lean], [0.8, h / 0.36, 0.8]);
  }
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; p.add(sph(0.2, 1), P.bush, [Math.cos(a) * 0.22, 0.36 + r() * 0.08, Math.sin(a) * 0.22]); }
  p.add(sph(0.22, 1), P.bushLight, [0, 0.5, 0]);
  const m = p.mesh();
  const ph = r() * 6;
  m.userData.tick = (t) => { m.rotation.z = Math.sin(t * 1.1 + ph) * 0.02; };
  const grp = new THREE.Group(); grp.add(m); grp.userData.kind = 'bush';
  return grp;
}

// ---------------------------------------------------------------- walls (tile snapped)
// kind 'rock' or 'hedge'. One tile, about 0.9 tile tall. Rotation is in 90 degree steps only.
export function wall(kind = 'rock', seed = 1, rot90 = 0) {
  const r = rng(seed * 13 + (kind === 'rock' ? 1 : 2));
  const p = new Piece();
  if (kind === 'rock') {
    p.add(box(0.98, 0.7, 0.98), P.rock, [0, 0.35, 0]);
    p.add(box(0.9, 0.16, 0.9), P.rockTop, [0, 0.76, 0]);
    p.add(sph(0.22, 0), P.rockDark, [0.3, 0.84, 0.25], [r(), r(), r()], [1, 0.6, 1]);
    p.add(sph(0.16, 0), P.rockTop, [-0.28, 0.86, -0.2], [r(), r(), r()], [1, 0.7, 1]);
    p.add(box(0.5, 0.06, 0.04), P.rockDark, [-0.1, 0.4, 0.5]);
  } else {
    p.add(box(0.96, 0.62, 0.96), P.hedge, [0, 0.31, 0]);
    for (let x = -1; x <= 1; x += 2) for (let z = -1; z <= 1; z += 2) p.add(sph(0.3, 1), P.hedgeTop, [x * 0.22, 0.66, z * 0.22]);
    p.add(sph(0.26, 1), P.hedgeTop, [0, 0.76, 0]);
    p.add(box(0.98, 0.1, 0.98), P.barkDark, [0, 0.05, 0]);
  }
  const g = p.mesh(); g.rotation.y = rot90 * Math.PI / 2;
  const grp = new THREE.Group(); grp.add(g); grp.userData.kind = 'wall';
  return grp;
}

// ---------------------------------------------------------------- seed pod (map centre)
export function seedPod() {
  const grp = new THREE.Group();
  const base = new Piece();
  base.add(cyl(1.25, 1.35, 0.2, 18), P.soil, [0, 0.1, 0]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; base.add(ball(0.5, 10, 8), i % 2 ? P.leaf : P.leafDark, [Math.cos(a) * 0.85, 0.22, Math.sin(a) * 0.85], [0, -a, 0.15], [1.2, 0.25, 0.6]); }
  base.add(cyl(0.16, 0.22, 0.6, 8), P.stem, [0, 0.45, 0]);
  grp.add(base.mesh());
  grp.add(blobShadow(1.3, 0.2));
  const pod = new Piece();
  // two husk halves, split open, with seeds inside
  pod.add(ball(0.62, 16, 12), P.pod, [-0.2, 1.15, 0], [0, 0, 0.38], [0.62, 1.05, 0.9]);
  pod.add(ball(0.62, 16, 12), P.podDark, [0.2, 1.15, 0], [0, 0, -0.38], [0.62, 1.05, 0.9]);
  for (let i = 0; i < 3; i++) pod.add(ball(0.16, 10, 8), P.podSeed, [0, 0.82 + i * 0.3, 0.12], [0, 0, 0], [1, 0.8, 0.9]);
  pod.add(cone(0.12, 0.35, 6), P.stem, [0, 1.9, 0]);
  pod.add(ball(0.2, 10, 8), P.leaf, [0.2, 1.95, 0], [0, 0, -0.6], [1, 0.3, 0.6]);
  const pm = pod.mesh(); grp.add(pm);
  pm.userData.tick = (t) => { const s = 1 + Math.sin(t * 2.2) * 0.025; pm.scale.set(s, 1 / s, s); };
  grp.userData.kind = 'pod';
  return grp;
}

// ---------------------------------------------------------------- seed pickup
export function seedPickup() {
  const grp = new THREE.Group();
  const p = new Piece()
    .add(ball(0.17, 12, 10), P.seed, [0, 0, 0], [0, 0, 0], [0.85, 1.1, 0.85])
    .add(ball(0.1, 8, 6), P.seedGlow, [-0.05, 0.08, 0.08])
    .add(cyl(0.02, 0.03, 0.12, 5), P.stem, [0, 0.22, 0])
    .add(ball(0.1, 8, 6), P.leaf, [0.08, 0.27, 0], [0, 0, -0.6], [1, 0.3, 0.55]);
  const m = p.mesh({ width: 1.6 });
  grp.add(m);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20), new THREE.MeshBasicMaterial({ color: P.seedGlow, transparent: true, opacity: 0.45, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.015; glow.renderOrder = 1; grp.add(glow);
  const ph = Math.random() * 6;
  m.userData.tick = (t) => { m.position.y = 0.32 + Math.sin(t * 3 + ph) * 0.06; m.rotation.y = t * 1.5 + ph; glow.scale.setScalar(1 + Math.sin(t * 3 + ph) * 0.08); };
  grp.userData.kind = 'seed';
  return grp;
}

// ---------------------------------------------------------------- team base (greenhouse)
// About 3 x 2.4 tiles footprint, 2.5 tiles tall. Team colour on the roof ridge, door and flag.
export function base(team = P.team.blue) {
  const p = new Piece();
  const W = 3.0, D = 2.2, H = 1.25;
  p.add(box(W + 0.2, 0.3, D + 0.2), P.wood, [0, 0.15, 0]);
  p.add(box(W, H, D), P.glass, [0, 0.3 + H / 2, 0]);
  // frame bars
  for (let i = 0; i <= 4; i++) { const x = -W / 2 + i * W / 4; p.add(box(0.09, H + 0.04, 0.09), P.frame, [x, 0.3 + H / 2, D / 2 + 0.01]); p.add(box(0.09, H + 0.04, 0.09), P.frame, [x, 0.3 + H / 2, -D / 2 - 0.01]); }
  for (const s of [-1, 1]) p.add(box(0.09, H + 0.04, D), P.frame, [s * W / 2, 0.3 + H / 2, 0]);
  p.add(box(W + 0.06, 0.1, D + 0.06), P.frame, [0, 0.3 + H, 0]);
  p.add(box(W, 0.08, 0.09), P.frame, [0, 0.3 + H * 0.5, D / 2 + 0.02]);
  // gable roof: a 3 sided prism along X
  // local x of the prism maps to world z (depth), local z (apex) to world y, the axis to world x
  const rr = D * 0.66, rh = 0.55, roofC = 0.3 + H + 0.5 * rr * rh;
  p.add(new THREE.CylinderGeometry(rr, rr, W + 0.2, 3, 1), 0xa9dfe0, [0, roofC, 0], [-Math.PI / 2, 0, Math.PI / 2], [1, 1, rh]);
  p.add(box(W + 0.3, 0.14, 0.16), team, [0, roofC + rr * rh, 0]);
  for (let i = 0; i <= 4; i++) { const x = -W / 2 + i * W / 4; for (const s of [-1, 1]) p.add(box(0.08, 0.07, rr * 0.98), P.frame, [x, roofC + rr * rh * 0.28, s * rr * 0.43], [s * Math.atan2(rr * rh * 1.5, rr * 0.866), 0, 0]); }
  // door and planters out front
  p.add(box(0.7, 0.95, 0.08), team, [0, 0.3 + 0.48, D / 2 + 0.05]);
  p.add(box(0.5, 0.1, 0.06), P.frame, [0, 0.3 + 0.95, D / 2 + 0.07]);
  for (const s of [-1, 1]) { p.add(box(0.6, 0.3, 0.4), P.wood, [s * 1.0, 0.15, D / 2 + 0.35]); p.add(sph(0.22, 1), P.leaf, [s * 0.86, 0.38, D / 2 + 0.35]); p.add(sph(0.2, 1), P.leafDark, [s * 1.14, 0.36, D / 2 + 0.35]); p.add(ball(0.08), P.bloom, [s * 1.0, 0.5, D / 2 + 0.42]); }
  // plants visible behind the glass roof line
  p.add(sph(0.35, 1), P.leaf, [-0.8, 0.3 + H + 0.05, 0]).add(sph(0.3, 1), P.leafDark, [0.7, 0.3 + H + 0.02, -0.2]);
  // flag
  p.add(cyl(0.04, 0.04, 1.4, 6), P.frame, [W / 2 - 0.1, 0.3 + H + 0.7, -D / 2 + 0.15]);
  const grp = new THREE.Group();
  grp.add(p.mesh());
  const flag = new Piece().add(box(0.55, 0.36, 0.03), team, [0.28, 0, 0]).mesh({ width: 1.6 });
  flag.position.set(W / 2 - 0.1, 0.3 + H + 1.2, -D / 2 + 0.15); grp.add(flag);
  flag.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 2.5) * 0.25; };
  grp.add(blobShadow(1.9, 0.18));
  grp.userData.kind = 'base';
  return grp;
}

// ---------------------------------------------------------------- units
// Three kinds x three tiers. Tier reads from size (0.4, 0.48, 0.58 tile wide) and from head leaves (1, 2, 3),
// tier 3 also wears a gold crown. Team reads from the body colour and the floor ring; kind reads from shape and the collar colour.
export const UNIT_KINDS = ['thorn', 'spitter', 'runner'];
export const UNIT_WIDTH = [0.42, 0.6, 0.52, 0.5, 0.9];
const unitCache = new Map();
function unitBody(kind, tier, team) {
  const key = kind + tier + ':' + team;
  if (unitCache.has(key)) return unitCache.get(key);
  // modelled at width 1.0, facing +Z, feet at y=0; scaled to the tier width by the caller.
  // tier 0 Grunt, 1 Brute (tank), 2 Splasher (mortar), 3 Flyer (wings), 4 Colossus. Body colour = team.
  const p = new Piece();
  const kc = kind === 'thorn' ? P.thorn : kind === 'spitter' ? P.spitter : P.runner;
  let cy = 0.48, br = 0.42, headY = 0.9;
  const eyes = (y, z, sx, r) => { for (const s of [-1, 1]) { p.add(ball(r, 8, 6), P.eye, [s * sx, y, z]); p.add(ball(r * 0.55, 6, 5), P.pupil, [s * sx * 0.95, y, z + r * 0.8]); } };
  const feet = (sx, r) => { for (const s of [-1, 1]) p.add(ball(r, 8, 6), P.leafDark, [s * sx, r * 0.5, 0.05], [0, 0, 0], [1, 0.6, 1.35]); };
  if (tier === 0) {
    p.add(ball(0.42, 16, 12), team, [0, 0.48, 0], [0, 0, 0], [1, 0.95, 1]);
    feet(0.2, 0.15); eyes(0.58, 0.34, 0.15, 0.11);
  } else if (tier === 1) {
    cy = 0.46; br = 0.52; headY = 0.98;
    p.add(ball(0.5, 16, 12), team, [0, 0.46, 0], [0, 0, 0], [1.15, 0.88, 1.05]);
    p.add(ball(0.46, 14, 8), P.runnerLeg, [0, 0.7, -0.02], [0, 0, 0], [1.12, 0.62, 1.1]);          // nut-shell helmet
    p.add(torus(0.5, 0.05), P.thornSpike, [0, 0.66, 0], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) p.add(ball(0.2, 10, 8), team, [s * 0.62, 0.4, 0.08], [0, 0, 0], [0.9, 1.2, 0.9]); // fists
    feet(0.28, 0.2); eyes(0.5, 0.44, 0.17, 0.1);
  } else if (tier === 2) {
    cy = 0.46; br = 0.4; headY = 1.12;
    p.add(ball(0.4, 16, 12), team, [0, 0.46, 0]);
    p.add(cyl(0.2, 0.28, 0.5, 10), P.spitterMouth, [0, 0.92, -0.06], [-0.3, 0, 0]);               // mortar pot
    p.add(torus(0.21, 0.05), P.thornSpike, [0, 1.15, -0.13], [Math.PI / 2 - 0.3, 0, 0]);
    p.add(ball(0.17, 10, 8), P.seed, [0, 1.17, -0.13]);
    feet(0.2, 0.15); eyes(0.52, 0.33, 0.14, 0.1);
  } else if (tier === 3) {
    cy = 0.5; br = 0.32; headY = 0.84;
    p.add(ball(0.32, 14, 10), team, [0, 0.5, 0], [0.25, 0, 0], [0.9, 1, 1.15]);
    for (const s of [-1, 1]) {
      p.add(ball(0.42, 10, 6), P.leaf, [s * 0.52, 0.62, -0.05], [0, s * 0.25, s * 0.35], [1.25, 0.1, 0.62]); // wings
      p.add(ball(0.26, 8, 6), P.leafDark, [s * 0.8, 0.74, -0.12], [0, s * 0.3, s * 0.5], [1.1, 0.1, 0.5]);
    }
    p.add(cone(0.1, 0.3, 6), team, [0, 0.42, -0.36], [-1.9, 0, 0]);                               // tail
    eyes(0.6, 0.3, 0.12, 0.1);
  } else {
    cy = 0.62; br = 0.5; headY = 1.5;
    p.add(ball(0.5, 16, 12), team, [0, 0.62, 0], [0, 0, 0], [1.05, 1.2, 0.95]);
    p.add(ball(0.3, 14, 10), team, [0, 1.3, 0.06]);
    for (const s of [-1, 1]) {
      p.add(ball(0.26, 10, 8), P.runnerLeg, [s * 0.56, 1.0, 0], [0, 0, 0], [1, 0.9, 1]);          // shoulder plates
      p.add(cone(0.09, 0.26, 6), P.thornSpike, [s * 0.62, 1.24, 0], [0, 0, -s * 0.5]);
      p.add(cyl(0.13, 0.16, 0.55, 8), team, [s * 0.62, 0.62, 0.06]);
      p.add(ball(0.2, 10, 8), P.runnerLeg, [s * 0.62, 0.3, 0.08]);
    }
    feet(0.26, 0.22); eyes(1.34, 0.32, 0.12, 0.085);
    p.add(cyl(0.2, 0.17, 0.12, 8, 1), P.seed, [0, 1.56, 0.04]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.add(cone(0.05, 0.14, 4), P.seed, [Math.cos(a) * 0.18, 1.68, 0.04 + Math.sin(a) * 0.18]); }
  }
  // seed type: collar colour plus one mark (thorn spikes, spitter snout, runner ears)
  p.add(torus(br * 0.97, 0.07), kc, [0, cy - 0.12, 0], [Math.PI / 2, 0, 0]);
  if (kind === 'thorn') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.6; p.add(cone(0.09, 0.26, 6), P.thornSpike, [Math.cos(a) * br * 0.95, cy + 0.12, Math.sin(a) * br * 0.95], [Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3]); }
  } else if (kind === 'spitter') {
    p.add(cyl(0.1, 0.14, 0.3, 8), kc, [0, cy - 0.02, br + 0.08], [Math.PI / 2, 0, 0]);
    p.add(cyl(0.09, 0.09, 0.04, 8), P.spitterMouth, [0, cy - 0.02, br + 0.24], [Math.PI / 2, 0, 0]);
  } else {
    for (const s of [-1, 1]) p.add(ball(0.2, 8, 6), kc, [s * 0.2, headY + 0.12, -0.04], [0.2, 0, s * -0.5], [0.45, 1.3, 0.3]);
  }
  const out = { piece: p };
  unitCache.set(key, out);
  return out;
}
export function unit(kind = 'thorn', tier = 0, team = P.team.blue) {
  const w = UNIT_WIDTH[tier];
  const grp = new THREE.Group();
  const b = unitBody(kind, tier, team);
  const m = b.piece.mesh({ width: 1.6 });
  m.scale.setScalar(w);
  grp.add(m);
  grp.add(blobShadow(w * 0.6, 0.3));
  grp.add(teamRing(w * 0.62, team));
  const ph = Math.random() * 6, speed = kind === 'runner' ? 12 : kind === 'thorn' ? 6 : 8;
  m.userData.tick = (t) => {
    const k = Math.abs(Math.sin(t * speed * 0.5 + ph));
    m.position.y = k * w * (kind === 'runner' ? 0.18 : 0.1);
    const sq = 1 + (1 - k) * 0.08;
    m.scale.set(w * sq, w / sq, w * sq);
    if (kind === 'spitter') m.rotation.x = Math.sin(t * 3 + ph) * 0.08;
  };
  grp.userData.kind = 'unit'; grp.userData.unit = { kind, tier, width: w };
  return grp;
}
