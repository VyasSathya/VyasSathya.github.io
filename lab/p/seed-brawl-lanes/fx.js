// Seed Brawl Lanes: effect player. Plays the Toybox effect-definition format (C:/Dev/toybox/assets/fx/defs/FORMAT.md)
// inside the game's own three.js scene: painted grey sprites and ground decals, colour from palette ramps, flipbooks,
// sizes from the gameplay numbers the caller passes. One draw call per texture (ground decals and sprites apart).
//
//   import * as FX from './fx.js';
//   await FX.init(THREE, scene, camera, { base: './fx/', max: 400 });
//   FX.play('creep_hit', { x, z, dir, element: 'thorn', scale: 1 });           // world units (tiles), dir in radians on x-z
//   const h = FX.attach('shot_trail', () => alive ? { x, z } : null, { element: 'seed' }); // follows until getPos returns null
//   const z = FX.play('zone_briar', { x, z, radius, duration, arm, team });  z.stop();
//   FX.tick(dt) once per frame before render;  FX.count() -> { sprites, draws, effects }
//
// Format extensions used by the game's definitions (all optional, ignored by other players):
//   layer.arc (half angle, number or "half"), layer.sweep (the arc wipes from one side to the other over the life),
//   layer.swing (1, -1 or "random"), layer.rot "aim" (decal turned to the direction), layer.beam (quad from at to to),
//   layer.anchor "move" (the travelling point of a def with "travel"), layer.follow (moves with its anchor),
//   layer.frame (always this flipbook tile), layer.toCam (pulled this far toward the camera, so a hit draws over the body it lands on),
//   def.travel { time, arc } (the anchor flies from at to to), "travel" and "arm" as number names, team ramps.
let THREE = null, scene = null, camera = null, data = null, MAXP = 400;
const TAU = Math.PI * 2, STRIDE = 32;
let seed = 1234567;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
const hex = h => { h = String(h).replace('#', '').padStart(6, '0'); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255); };
const CURVES = { grow: [0, .3, 1, 1], shrink: [0, 1, 1, .35], pop: [0, .2, .1, 1.08, .22, 1, 1, 1], swell: [0, .6, 1, 1.5], snap: [0, .55, .08, 1.12, .2, 1, 1, .9], bloom: [0, .25, .15, 1, 1, 1.15] };
const curve = (k, t) => { if (!k) return 1; for (let i = 2; i < k.length; i += 2) if (t <= k[i]) { const u = (t - k[i - 2]) / Math.max(1e-5, k[i] - k[i - 2]); return k[i - 1] + (k[i + 1] - k[i - 1]) * u; } return k[k.length - 1]; };
const TINT = { none: [[1, 1, 1], [1, 1, 1]], white: [[1, 1, 1], [.92, .92, .95]], hot: [[1, 1, 1], [.9, .9, .93]], mid: [[.95, .95, .97], [.82, .82, .86]], deep: [[.8, .8, .84], [.66, .66, .72]], cool: [[1, 1, 1], [.78, .8, .9]], fade: [[1, 1, 1], [.55, .55, .6]] };

// ---- GPU side: one instanced quad mesh per texture and facing, premultiplied blend with an added-light share
const VS = `
attribute vec2 corner;
attribute vec3 iPos; attribute vec4 iSize; attribute vec4 iUv; attribute vec2 iUv2; attribute vec4 iCol; attribute vec4 iFx; attribute vec2 iArc;
attribute vec3 iC0; attribute vec3 iC1; attribute vec3 iC2;
varying vec2 vUv; varying vec2 vUv2; varying float vBl; varying vec4 vCol; varying vec4 vFx; varying vec2 vArc; varying vec2 vCorner; varying vec3 vC0; varying vec3 vC1; varying vec3 vC2;
void main(){
  float c = cos(iSize.z), s = sin(iSize.z);
  vec2 q = corner * iSize.xy; vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
  vec3 wp;
  if (iSize.w > 0.5) wp = iPos + vec3(r.x, 0.0, r.y);
  else { vec3 Rt = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 Up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); wp = iPos + Rt * r.x + Up * r.y; }
  if (iArc.y > 0.0) wp += normalize(cameraPosition - wp) * iArc.y;   // pulled toward the camera so it draws over the body it hits
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vec2 f = vec2(corner.x * 0.5 + 0.5, 0.5 - corner.y * 0.5);
  vUv = iUv.xy + f * iUv.z; vUv2 = iUv2 + f * iUv.z; vBl = iUv.w;
  vCol = iCol; vFx = iFx; vArc = iArc; vCorner = corner; vC0 = iC0; vC1 = iC1; vC2 = iC2;
}`;
const FS = `
precision highp float;
uniform sampler2D map;
varying vec2 vUv; varying vec2 vUv2; varying float vBl; varying vec4 vCol; varying vec4 vFx; varying vec2 vArc; varying vec2 vCorner; varying vec3 vC0; varying vec3 vC1; varying vec3 vC2;
void main(){
  vec4 t = texture2D(map, vUv); if (vBl > 0.001) t = mix(t, texture2D(map, vUv2), vBl);
  float lum = dot(t.rgb, vec3(.3, .59, .11));
  vec3 c = lum > .5 ? mix(vC1, vC0, (lum - .5) * 2.) : mix(vC2, vC1, lum * 2.);
  float a = clamp(t.a * (.65 + .35 * lum) * 3., 0., 1.) * vCol.a;
  if (vFx.z > 0.0) {                       // arc: keep the part of the quad inside +-half around its x axis
    float ang = atan(vCorner.y, vCorner.x) * vArc.x, h = vFx.z;
    float m = smoothstep(h + .04, h - .18, abs(ang));
    if (vFx.w >= 0.0) {                    // sweep: a lit band wipes from -h to +h, its tail fading behind it
      float tl = max(.5, h * 1.1), lead = -h - .1 + vFx.w * (2. * h + tl + .2);
      m *= smoothstep(lead + .06, lead - .14, ang) * smoothstep(lead - tl - .05, lead - tl + .35, ang);
      m *= mix(.45, 1., clamp((ang - (lead - tl)) / tl, 0., 1.));
    }
    a *= m;
  }
  vec3 rgb = c * vCol.rgb * (1. + vFx.x * lum);
  gl_FragColor = vec4(rgb * a, a * (1. - vFx.y));
}`;
const batches = new Map(); let texCache = {}, loader = null, baseGeo = null;
function batch(tex, ground) {
  const key = tex + (ground ? '|g' : '|s'); let b = batches.get(key); if (b) return b;
  const geo = new THREE.InstancedBufferGeometry(); geo.index = baseGeo.index; geo.setAttribute('corner', baseGeo.getAttribute('corner'));
  const arr = new Float32Array(MAXP * STRIDE), ib = new THREE.InstancedInterleavedBuffer(arr, STRIDE, 1); ib.setUsage(THREE.DynamicDrawUsage);
  const A = (n, size, off) => geo.setAttribute(n, new THREE.InterleavedBufferAttribute(ib, size, off));
  A('iPos', 3, 0); A('iSize', 4, 3); A('iUv', 4, 7); A('iUv2', 2, 11); A('iCol', 4, 13); A('iFx', 4, 17); A('iArc', 2, 21); A('iC0', 3, 23); A('iC1', 3, 26); A('iC2', 3, 29);
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { map: { value: texCache[tex] } }, transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = ground ? 5 : 10; mesh.visible = false; scene.add(mesh);
  b = { key, tex, mesh, geo, ib, arr, n: 0 }; batches.set(key, b); return b;
}

// ---- data
export async function init(T, sc, cam, opts) {
  THREE = T; scene = sc; camera = cam; opts = opts || {}; MAXP = opts.max || 400; if (opts.seed !== undefined) seed = opts.seed;
  const base = opts.base || './fx/', j = async u => { for (let n = 0; ; n++) try { const r = await fetch(base + u); if (!r.ok) throw new Error('fx: ' + u + ' ' + r.status); return await r.json(); } catch (e) { if (n >= 3) throw e; await new Promise(ok => setTimeout(ok, 250 * (n + 1))); } };   // a busy or small server can refuse one of many requests: ask again before giving up
  const [elements, palette, index] = await Promise.all([j('elements.json'), j('palette.json'), j('defs/index.json')]);
  const defs = {}; for (let i = 0; i < index.length; i += 6) await Promise.all(index.slice(i, i + 6).map(id => j('defs/' + id + '.json').then(d => { defs[d.id || id] = d; })));   // six at a time: a page that also loads sixty sounds at start should not open a hundred connections at once
  data = { defs, elements, palette: palette.tokens || palette };
  baseGeo = new THREE.BufferGeometry(); baseGeo.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2)); baseGeo.setIndex([0, 1, 2, 0, 2, 3]);
  loader = new THREE.TextureLoader(); const names = new Set();
  const want = t => { if (t && t[0] !== '@') names.add(t); };
  for (const d of Object.values(defs)) for (const L of d.layers) want(L.tex);
  for (const e of Object.values(elements)) for (const s of Object.values(e.slots || {})) if (s) names.add(s.split(':')[0]);
  const one = n => new Promise(res => { let tries = 0; const go = () => loader.load(base + 'tex/' + n + '.png', t => { t.flipY = false; t.colorSpace = THREE.NoColorSpace || ''; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; texCache[n] = t; res(); }, undefined, () => { if (++tries < 4) setTimeout(go, 250 * tries); else { console.warn('fx: missing texture', n); res(); } }); go(); }); { const all = [...names]; for (let i = 0; i < all.length; i += 6) await Promise.all(all.slice(i, i + 6).map(one)); }
  for (let i = 0; i < MAXP; i++) pool.push({ alive: false, ly: null, fx: null, p: [0, 0, 0], v: [0, 0, 0], o: [0, 0, 0], size: 1, aspect: 1, life: 1, age: 0, rot: 0, spin: 0, fr: 0, hold: false });
  free.length = 0; for (let i = MAXP - 1; i >= 0; i--) free.push(pool[i]);
  return data;
}
export const defs = () => data && data.defs;
export function setSeed(s) { seed = s | 0; }

// ---- effects and particles
const pool = [], free = [], live = [], effects = [];
let now = 0, dropped = 0;
function tok(n) { const p = data.palette; return hex(p[n] !== undefined ? p[n] : (/^[0-9a-f]{6}$/i.test(n) ? n : 'ff00ff')); }
function skinOf(name) { const E = data.elements; return E[name] || E.default || Object.values(E)[0]; }
function expr(o, a, fb) {
  if (typeof o === 'number') return o; if (typeof o !== 'string') return fb;
  const s = o.split(':'), m = s.length > 1 ? +s[1] : 1, c = s.length > 2 ? +s[2] : 0;
  const v = s[0] === 'radius' ? a.radius : s[0] === 'length' ? a.length : s[0] === 'width' ? a.width : s[0] === 'duration' ? a.duration : s[0] === 'height' ? a.height
    : s[0] === 'scale' ? a.scale : s[0] === 'area' ? Math.PI * a.radius * a.radius : s[0] === 'perimeter' ? TAU * a.radius : s[0] === 'dist' ? Math.hypot(a.tx - a.x, a.tz - a.z)
    : s[0] === 'half' ? a.half : s[0] === 'travel' ? a.travel : s[0] === 'arm' ? a.arm : s[0] === 'speed' ? a.speed : undefined;
  return v !== undefined ? v * m + c : fb;
}
function range(d, k, fb, a) { const v = d[k]; if (v === undefined) return [fb, fb]; if (Array.isArray(v)) return [expr(v[0], a, fb), expr(v[1], a, fb)]; const o = expr(v, a, fb); return [o, o]; }
const V = (L, k, fb, a) => { const r = range(L, k, fb, a); return r[0] === r[1] ? r[0] : R(r[0], r[1]); };

function args(o, def) {
  o = o || {}; const pf = def.proof || {};
  const a = { x: o.x || 0, y: o.y || 0, z: o.z || 0, tx: 0, tz: 0, ty: 0, dir: o.dir || 0, radius: o.radius !== undefined ? o.radius : pf.radius || 1, length: o.length !== undefined ? o.length : 3,
    width: o.width !== undefined ? o.width : .4, duration: o.duration !== undefined ? o.duration : pf.duration || 1, half: o.half !== undefined ? o.half : .6, height: o.height || 1,
    scale: o.scale || 1, arm: o.arm || 0, speed: o.speed || 8, team: o.team || 0, element: o.element || def.element || 'default' };
  if (o.to) { a.tx = o.to.x; a.tz = o.to.z; a.ty = o.to.y || 0; } else if (o.tx !== undefined) { a.tx = o.tx; a.tz = o.tz; } else { a.tx = a.x + Math.cos(a.dir) * a.length; a.tz = a.z + Math.sin(a.dir) * a.length; }
  if (o.to || o.tx !== undefined) { if (o.dir === undefined) a.dir = Math.atan2(a.tz - a.z, a.tx - a.x); if (o.length === undefined) a.length = Math.hypot(a.tx - a.x, a.tz - a.z); }
  const tr = def.travel; a.travel = o.travel !== undefined ? o.travel : tr ? expr(tr.time, a, .3) : 0; a.arcH = tr ? expr(tr.arc || 0, a, 0) : 0;
  return a;
}
function teamTokens(team) { const p = data.palette; return team === 1 ? ['team_blue_l', 'team_blue', 'team_blue_d'] : team === 2 ? ['team_red_l', 'team_red', 'team_red_d'] : team === 3 ? ['team_you_l', 'team_you', 'team_you_d'] : ['neutral_l', 'neutral', 'neutral_d']; }

function build(fx, def, a, tOff, depth) {
  const skin = skinOf(a.element), glow = skin.emit || 0;
  for (const L of def.layers) {
    if (L.use) {
      const a2 = Object.assign({}, a); a2.scale = a.scale * (L.scale || 1);
      if (L.element) a2.element = L.element === '@dust' ? (skin.dustElement || 'dust') : L.element;
      for (const k of ['radius', 'duration', 'length', 'width', 'half']) if (L[k] !== undefined) a2[k] = expr(L[k], a, a[k]);
      if (L.anchor === 'to') { a2.x = a.tx; a2.z = a.tz; a2.y = a.ty; }
      if (depth < 6 && data.defs[L.use]) build(fx, data.defs[L.use], a2, tOff + expr(L.at === undefined ? 0 : L.at, a, 0), depth + 1);
      continue;
    }
    let tex = L.tex || 'fx_glow_soft', tiles = L.tiles || 1, sizeMul = 1, alphaMul = 1;
    if (tex[0] === '@') { const s = (skin.slots || {})[tex.slice(1)]; if (!s) continue; const p = s.split(':'); tex = p[0]; tiles = p.length > 1 ? +p[1] : 1; if (p.length > 2) sizeMul = +p[2]; if (p.length > 3) alphaMul = +p[3]; }
    if (!texCache[tex]) continue;
    const blend = L.blend || 'matter', ramp = L.ramp || (blend === 'smoke' ? 'dust' : 'base');
    const tokens = L.tokens || (ramp === 'team' ? teamTokens(a.team) : skin[ramp] || skin.tokens), dusty = ramp === 'dust' || ramp === 'mark' || blend === 'smoke';
    const bright = L.bright !== undefined ? L.bright : blend === 'glow' ? .8 : blend === 'flame' ? 1 : blend === 'matter' ? .6 : 0;
    const tt = TINT[L.tint || (blend === 'smoke' ? 'white' : 'none')] || TINT.none, em = L.emit || { burst: 1 }, shape = L.shape || 'point';
    const start = tOff + expr(L.at !== undefined ? L.at : 0, a, 0), hasRate = em.rate !== undefined, every = em.every ? expr(em.every, a, 0) : 0;
    const until = em.until !== undefined ? tOff + expr(em.until, a, 0) : em.for !== undefined ? start + expr(em.for, a, 1) : (hasRate || every > 0) ? tOff + Math.max(.05, a.duration) : Infinity;
    const ly = { L, a, fx, tex, tiles, sizeMul, ground: !!(L.ground || L.beam), c: tokens.map(tok), from: tt[0], to: tt[1], emit: (dusty ? 0 : glow) * 1.5 * bright + (L.glow || 0),
      add: L.additive !== undefined ? L.additive : blend === 'glow' ? 1 : blend === 'flame' ? .3 : blend === 'matter' ? .1 : 0,
      alpha: (L.alpha !== undefined ? L.alpha : blend === 'smoke' ? .4 : 1) * alphaMul, fin: L.fadeIn !== undefined ? L.fadeIn : .15, fout: L.fadeOut !== undefined ? L.fadeOut : .4,
      em, shape, start, until, every, next: start, hasRate, hasBurst: em.burst !== undefined || every > 0, acc: 0, sc: Array.isArray(L.sizeCurve) ? L.sizeCurve : CURVES[L.sizeCurve], smooth: !!(L.smooth || def.smooth),
      arc: L.arc !== undefined ? expr(L.arc, a, .6) : 0, sweep: !!L.sweep, hold: !!L.hold, batch: null };
    ly.batch = batch(tex, ly.ground);
    fx.layers.push(ly); fx.end = Math.max(fx.end, (isFinite(until) ? until : start) + range(L, 'life', 1, a)[1]);
  }
}
function newFx(id, o, getPos) {
  const def = data && data.defs[id]; if (!def) { if (data) console.warn('fx: no effect', id); return null; }
  const a = args(o, def), fx = { id, def, a, t: 0, layers: [], end: 0, getPos: getPos || null, stopped: false, mx: a.x, my: a.y, mz: a.z, live: 0, len: 0 };
  build(fx, def, a, 0, 0);
  fx.len = getPos ? Infinity : def.loop ? Math.max(.05, a.duration) + (def.tail !== undefined ? def.tail : 1) : def.length !== undefined ? expr(def.length, a, 1.5) : Math.max(.2, fx.end, a.travel);
  if (getPos) for (const ly of fx.layers) if (ly.hasRate && ly.L.emit.until === undefined && ly.L.emit.for === undefined) ly.until = Infinity;
  fx.handle = { stop: () => stopFx(fx), get alive() { return effects.includes(fx); }, set: o2 => Object.assign(fx.a, o2), fx };
  effects.push(fx); return fx.handle;
}
export function play(id, o) { return newFx(id, o, null); }
export function attach(id, getPos, o) { return newFx(id, o, getPos); }
function stopFx(fx) {
  if (fx.stopped) return; fx.stopped = true; fx.len = fx.t + (fx.def.tail !== undefined ? Math.min(fx.def.tail, 1.2) : .8);
  for (const ly of fx.layers) { ly.until = Math.min(ly.until, fx.t); if (ly.hasBurst && ly.every <= 0 && ly.next > fx.t) ly.next = Infinity; }
  for (const q of live) if (q.fx === fx && q.hold) q.life = Math.min(q.life, q.age + .45);
}
export function clear() { for (const q of live) { q.alive = false; free.push(q); } live.length = 0; effects.length = 0; }

function anchor(fx, ly) {
  const an = ly.L.anchor, a = ly.a;
  if (an === 'to') return [a.tx, a.ty, a.tz];
  if (an === 'move' || fx.getPos) return [fx.mx, fx.my, fx.mz];
  return [a.x, a.y, a.z];
}
const _c = [0, 0, 0], _od = [0, 0, 0];
function spawn(fx, ly, i, n) {
  const q = free.pop(); if (!q) { dropped++; return; }
  const L = ly.L, a = ly.a, c = anchor(fx, ly), spread = V(L, 'spread', 1, a), fdx = Math.cos(a.dir), fdz = Math.sin(a.dir), ev = L.arrange === 'even' && i >= 0 && n > 0;
  let px = c[0], py = c[1], pz = c[2], ox = 1, oz = 0;
  switch (ly.shape) {
    case 'disc': { const t = R(0, TAU), r = Math.sqrt(rnd()); ox = Math.cos(t); oz = Math.sin(t); px += ox * r * a.radius * spread; pz += oz * r * a.radius * spread; break; }
    case 'ring': case 'edge': { const g = ev ? (i + R(-.2, .2)) / n * TAU : R(0, TAU); ox = Math.cos(g); oz = Math.sin(g); px += ox * a.radius * spread; pz += oz * a.radius * spread; break; }
    case 'line': { const u = ev ? (i + .5 + R(-.2, .2)) / n : rnd(), w = R(-a.width / 2, a.width / 2) * spread; px += fdx * a.length * u - fdz * w; pz += fdz * a.length * u + fdx * w; ox = fdx; oz = fdz; break; }
    case 'path': { const u = ev ? (i + .5) / n : rnd(); px = a.x + (a.tx - a.x) * u; pz = a.z + (a.tz - a.z) * u; py = a.y + (a.ty - a.y) * u; ox = fdx; oz = fdz; break; }
    case 'cone': { const g = ev ? -a.half + (i + .5 + R(-.25, .25)) / n * 2 * a.half : R(-a.half, a.half); const dd = a.dir + g; ox = Math.cos(dd); oz = Math.sin(dd); const lo = L.near !== undefined ? L.near : 0, r = a.radius * (lo + (1 - lo) * Math.sqrt(rnd())) * spread; px += ox * r; pz += oz * r; break; }
    case 'body': { const g = R(0, TAU), r = a.height * R(.2, .34) * spread; ox = Math.cos(g); oz = Math.sin(g); px += ox * r; py += a.height * R(.15, .9); pz += oz * r; break; }
    default: { const g = R(0, TAU); ox = Math.cos(g); oz = Math.sin(g); }
  }
  const size = V(L, 'size', 1, a) * a.scale * ly.sizeMul, aspect = L.aspect || 1; py += V(L, 'height', 0, a);
  const speed = V(L, 'speed', 0, a), lift = V(L, 'lift', 0, a); let vx = 0, vy = 0, vz = 0;
  switch (L.dir) {
    case 'up': vy = speed; break; case 'out': vx = ox * speed; vz = oz * speed; break; case 'in': vx = -ox * speed; vz = -oz * speed; break;
    case 'aim': vx = fdx * speed; vz = fdz * speed; break; case 'back': vx = -fdx * speed; vz = -fdz * speed; break;
    case 'random': { const z = R(-1, 1), t = R(0, TAU), w = Math.sqrt(1 - z * z); vx = w * Math.cos(t) * speed; vy = w * Math.sin(t) * speed; vz = z * speed; break; }
    case 'fan': { const z = R(-1, 1), t = R(0, TAU), w = Math.sqrt(1 - z * z); let x = w * Math.cos(t), y = Math.abs(w * Math.sin(t)) * .6 + .25, zz = z; const m = Math.hypot(x, y, zz); vx = x / m * speed; vy = y / m * speed; vz = zz / m * speed; break; }
    case 'aimfan': { const g = R(-(L.cone || .7), L.cone || .7), d = a.dir + g; vx = Math.cos(d) * speed; vz = Math.sin(d) * speed; vy = speed * R(.25, .7); break; }
  }
  vy += lift; if (L.drift !== undefined) { vx += .15 * L.drift; vz -= .1 * L.drift; }
  if (L.standing) py += size * aspect * .5 * (L.foot !== undefined ? L.foot * 2 : .84);
  let rot = L.rot === 'aim' ? a.dir : L.rot !== undefined ? L.rot * Math.PI / 180 : (L.upright || L.standing) ? R(-7, 7) * Math.PI / 180 : R(0, TAU);
  if (L.rot === 'aim' && L.rotJitter) rot += R(-L.rotJitter, L.rotJitter) * Math.PI / 180;
  if (L.rot === 'out') rot = Math.atan2(oz, ox);
  q.alive = true; q.ly = ly; q.fx = fx; q.p[0] = px; q.p[1] = py; q.p[2] = pz; q.v[0] = vx; q.v[1] = vy; q.v[2] = vz; q.o[0] = px - c[0]; q.o[1] = py - c[1]; q.o[2] = pz - c[2];
  q.size = size; q.aspect = aspect; q.life = Math.max(.02, V(L, 'life', 1, a)); q.age = 0; q.rot = rot; q.spin = L.spin ? R(-L.spin, L.spin) * Math.PI / 180 : 0;
  q.fr = L.frame !== undefined ? L.frame : Math.floor(rnd() * ly.tiles * ly.tiles); q.hold = ly.hold; q.swing = L.swing === -1 ? -1 : L.swing === 1 ? 1 : rnd() < .5 ? -1 : 1;
  live.push(q); fx.live++;
}

export function tick(dt) {
  if (!data) return; now += dt;
  for (let e = effects.length - 1; e >= 0; e--) {
    const fx = effects[e], t0 = fx.t, t1 = fx.t + dt, a = fx.a; fx.t = t1;
    if (fx.getPos) { const p = fx.getPos(); if (p) { fx.mx = p.x; fx.my = p.y || 0; fx.mz = p.z; } else stopFx(fx); }
    else if (fx.def.travel) { const k = Math.min(1, t1 / Math.max(.001, a.travel)); fx.mx = a.x + (a.tx - a.x) * k; fx.mz = a.z + (a.tz - a.z) * k; fx.my = a.y + (a.ty - a.y) * k + Math.sin(k * Math.PI) * a.arcH; }
    for (const ly of fx.layers) {
      if (ly.hasBurst) while (ly.next <= t1 && (ly.every <= 0 || ly.next < ly.until)) { const n = Math.max(0, Math.round(range(ly.em, 'burst', 1, ly.a)[0])); for (let i = 0; i < n; i++) spawn(fx, ly, i, n); ly.next = ly.every > 0 ? ly.next + ly.every : Infinity; }
      if (ly.hasRate && t1 > ly.start && t0 < ly.until) {
        const lo = Math.max(ly.start, t0), hi = Math.min(ly.until, t1);
        if (hi > lo) { let rate = range(ly.em, 'rate', 1, ly.a)[0]; const la = ly.a;
          if (ly.em.perM2) rate *= ly.shape === 'cone' ? Math.max(.3, la.radius * la.radius * la.half) : ly.shape === 'line' ? Math.max(.3, la.length * la.width) : Math.PI * la.radius * la.radius;
          if (ly.em.perM) rate *= ly.shape === 'line' ? la.length : ly.shape === 'path' ? Math.hypot(la.tx - la.x, la.tz - la.z) : TAU * la.radius;
          ly.acc += rate * (hi - lo); let k = Math.min(60, Math.floor(ly.acc)); ly.acc -= Math.floor(ly.acc); while (k-- > 0) spawn(fx, ly, -1, 1); }
      }
    }
    if (fx.t > fx.len && fx.live <= 0) { effects[e] = effects[effects.length - 1]; effects.pop(); }
  }
  for (const b of batches.values()) b.n = 0;
  for (let i = live.length - 1; i >= 0; i--) {
    const q = live[i]; q.age += dt;
    if (q.age >= q.life) { q.alive = false; q.fx.live--; free.push(q); live[i] = live[live.length - 1]; live.pop(); continue; }
    const ly = q.ly, L = ly.L, fx = q.fx;
    if (L.follow && (fx.getPos || fx.def.travel || L.anchor === 'move')) { const c = anchor(fx, ly); q.o[0] += q.v[0] * dt; q.o[1] += q.v[1] * dt; q.o[2] += q.v[2] * dt; q.p[0] = c[0] + q.o[0]; q.p[1] = c[1] + q.o[1]; q.p[2] = c[2] + q.o[2]; }
    else { const g = (L.gravity || 0) * 9.81; q.v[1] -= g * dt; if (L.drag) { const k = Math.max(0, 1 - L.drag * dt); q.v[0] *= k; q.v[1] *= k; q.v[2] *= k; } q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; if (L.floor !== false && L.gravity && q.p[1] < .03) { q.p[1] = .03; q.v[1] *= -.25; q.v[0] *= .5; q.v[2] *= .5; q.spin *= .5; } }
    q.rot += q.spin * dt;
    write(q);
  }
  for (const b of batches.values()) {
    b.mesh.visible = b.n > 0; b.geo.instanceCount = b.n;
    if (b.n > 0) { if (b.ib.addUpdateRange) { if (b.ib.clearUpdateRanges) b.ib.clearUpdateRanges(); b.ib.addUpdateRange(0, b.n * STRIDE); } else b.ib.updateRange = { offset: 0, count: b.n * STRIDE }; b.ib.needsUpdate = true; }
  }
}
function write(q) {
  const ly = q.ly, b = ly.batch; if (b.n >= MAXP) return; const L = ly.L, a = ly.a, o = b.n++ * STRIDE, A = b.arr;
  const u = q.age / q.life, sz = q.size * curve(ly.sc, u), n = ly.tiles, nn = n * n;
  const m = u < .45 ? u / .45 * .5 : .5 + (u - .45) / .55 * .5;
  const al = ly.alpha * (u < ly.fin ? (ly.fin <= 0 ? 1 : u / ly.fin) : u > 1 - ly.fout ? Math.max(0, (1 - u) / Math.max(1e-4, ly.fout)) : 1);
  let fr = q.fr, bl = 0; if (n > 1 && L.frames !== 'random' && L.frame === undefined) { const ff = Math.min(nn - 1e-3, u * nn); fr = Math.floor(ff); if (ly.smooth) bl = ff - fr; }
  const f2 = Math.min(nn - 1, fr + 1), d = 1 / n;
  if (L.beam) { const dx = a.tx - a.x, dz = a.tz - a.z, len = Math.hypot(dx, dz); A[o] = (a.x + a.tx) / 2; A[o + 1] = q.p[1]; A[o + 2] = (a.z + a.tz) / 2; A[o + 3] = len / 2 * (L.beamPad || 1.08); A[o + 4] = sz / 2; A[o + 5] = Math.atan2(dz, dx); A[o + 6] = 1; }
  else { A[o] = q.p[0]; A[o + 1] = q.p[1]; A[o + 2] = q.p[2]; A[o + 3] = sz / 2; A[o + 4] = sz * q.aspect / 2; A[o + 5] = q.rot; A[o + 6] = ly.ground ? 1 : 0; }
  A[o + 7] = (fr % n) * d; A[o + 8] = Math.floor(fr / n) * d; A[o + 9] = d; A[o + 10] = bl; A[o + 11] = (f2 % n) * d; A[o + 12] = Math.floor(f2 / n) * d;
  A[o + 13] = ly.from[0] + (ly.to[0] - ly.from[0]) * m; A[o + 14] = ly.from[1] + (ly.to[1] - ly.from[1]) * m; A[o + 15] = ly.from[2] + (ly.to[2] - ly.from[2]) * m; A[o + 16] = al;
  A[o + 17] = ly.emit; A[o + 18] = ly.add; A[o + 19] = ly.arc; A[o + 20] = ly.sweep ? u : -1; A[o + 21] = q.swing; A[o + 22] = L.toCam !== undefined ? L.toCam : 0;
  const c = ly.c; A[o + 23] = c[0][0]; A[o + 24] = c[0][1]; A[o + 25] = c[0][2]; A[o + 26] = c[1][0]; A[o + 27] = c[1][1]; A[o + 28] = c[1][2]; A[o + 29] = c[2][0]; A[o + 30] = c[2][1]; A[o + 31] = c[2][2];
}
export function count() { let draws = 0, sprites = 0; for (const b of batches.values()) if (b.n > 0) { draws++; sprites += b.n; } return { sprites, draws, effects: effects.length, live: live.length, dropped, cap: MAXP }; }
