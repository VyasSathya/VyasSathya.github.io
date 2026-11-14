// Seed Brawl Lanes: the summoned creeps. A creep body is a GLB from game/assets/units when units.json lists one for
// its kind and body, and the old procedural body until then. Every creep is drawn instanced (one draw call for the
// body and one for its outline per kind, body and team) and moved in the shader: a per-creep bend (lunge forward,
// sway sideways, wing flap) and a white flash when it is hit, on top of the hop, squash and lunge done by transform.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as LOOK from './game/src/look.js';
import * as W from './game/src/world.js';

export const KEYS = ['thorn', 'spitter', 'runner'], BODY = ['grunt', 'brute', 'splasher', 'flyer', 'colossus'];
const BEND = `
attribute vec4 aAnim;   // x lean forward, y sway sideways, z wing flap, w hit flash
vec3 creepBend(vec3 p, vec4 a) { float h = clamp(p.y, 0.0, 1.3), h2 = h * h * 0.5; p.z += a.x * h2; p.x += a.y * h2; p.y += a.z * min(p.x * p.x, 0.6) * 2.0 - (abs(a.x) + abs(a.y)) * 0.25 * h2 * h; return p; }`;

// the game's toon material plus the bend and the flash
function creepMaterial(opts) {
  const m = LOOK.toonMaterial(opts), base = m.onBeforeCompile, top = { value: opts.top || 1.2 };   // top: the body's height, for the lit-top gradient (lighter at the head, darker at the feet)
  m.onBeforeCompile = (s) => {
    base(s); s.uniforms.uTop = top;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vFlash; varying float vH; uniform float uTop;' + BEND)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = clamp(position.y / uTop, 0.0, 1.0); transformed = creepBend(transformed, aAnim); vFlash = aAnim.w;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFlash; varying float vH;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= mix(0.8, 1.1, vH);')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), vFlash * 0.6);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'seedtoon-creep';
  return m;
}
// Real models keep their own colours, so their team is carried by the outline (and the floor ring): a team-coloured
// line around the whole body reads in a clump where the rings are hidden. Procedural bodies are team-coloured already.
const outMats = {};
function outlineMat(col, width = 1.6) {
  const key = col + ':' + width; if (outMats[key]) return outMats[key];
  const src = LOOK.outlineMaterial(width, col === undefined ? LOOK.palette.outline : col), m = src.clone();
  m.uniforms.uAspect = src.uniforms.uAspect; m.uniforms.uScale = src.uniforms.uScale;
  m.vertexShader = src.vertexShader.replace('#include <common>', '#include <common>' + BEND)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = creepBend(transformed, aAnim);')
    .replace('modelViewMatrix * vec4(transformed, 1.0)', 'modelViewMatrix * instanceMatrix * vec4(transformed, 1.0)')
    .replace('normalMatrix * objectNormal', 'normalMatrix * mat3(instanceMatrix) * objectNormal');
  return outMats[key] = m;
}
// the same vertex data with its own per-instance animation attribute
function instanced(geo, anim) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
  if (geo.index) g.setIndex(geo.index);
  g.setAttribute('aAnim', anim); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

const MODELS = {}, SETS = {}, procMat = creepMaterial({ vertexColors: true });
let scene = null, MAX = 80, info = { units: {} };
export function init(sc, max) { scene = sc; MAX = max; }
export const model = (kind, ti) => MODELS[KEYS[kind] + '_' + BODY[ti]] || null;
export const meta = (kind, ti) => info.units[KEYS[kind] + '_' + BODY[ti]] || null;

// one instanced body and outline per kind, body and team; rebuilt when that creep's model arrives
export function set(kind, ti, team, teamCol) {
  const key = kind + '_' + ti + '_' + team; if (SETS[key]) return SETS[key];
  const md = model(kind, ti); let geo, hull, mat;
  let line; if (md) { geo = md.geo; hull = md.hull; mat = md.mat; line = outlineMat(new THREE.Color(teamCol).multiplyScalar(0.85).getHex(), 1.9); }
  else { W.unit(W.UNIT_KINDS[kind], ti, teamCol).children[0].traverse((o) => { if (o.isMesh) { if (o.userData.isHull) hull = o.geometry; else geo = o.geometry; } }); mat = procMat; }
  const anim = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); anim.setUsage(THREE.DynamicDrawUsage);
  const b = new THREE.InstancedMesh(instanced(geo, anim), mat, MAX), o = new THREE.InstancedMesh(instanced(hull, anim), line || outlineMat(), MAX);
  for (const m of [b, o]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  return SETS[key] = { b, o, n: 0, w: W.UNIT_WIDTH[ti], anim, real: !!md };
}
export const sets = () => SETS;
function drop(prefix) { for (const k in SETS) if (k.startsWith(prefix)) { const s = SETS[k]; scene.remove(s.b, s.o); s.b.dispose(); s.o.dispose(); delete SETS[k]; } }

// a single creep as its own object (the dock pictures)
export function single(kind, ti, teamCol) {
  const md = model(kind, ti); if (!md) return W.unit(W.UNIT_KINDS[kind], ti, teamCol).children[0];
  const g = new THREE.Group(), m = new THREE.Mesh(md.geo, LOOK.toonMaterial({ map: md.mat.map })); g.add(m); LOOK.addOutline(g, 1.6); return g;
}

// loads every creep model listed in units.json; missing file or list = the procedural bodies stay
export async function load(base, onReady) {
  let j; try { j = await (await fetch(base + 'units.json')).json(); } catch (e) { return 0; }
  info = j; const L = new GLTFLoader(); let n = 0;
  await Promise.all(Object.entries(j.units || {}).map(async ([key, d]) => {
    try {
      const g = await L.loadAsync(base + d.file); let mesh = null; g.scene.updateMatrixWorld(true); g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); if (d.scale) geo.scale(d.scale, d.scale, d.scale); if (d.turn) geo.rotateY(d.turn);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      const map = mesh.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
      MODELS[key] = { geo, hull: LOOK.hullGeometry(geo), mat: creepMaterial({ map, sat: d.sat, contrast: d.contrast, top: (d.height || 1.2) * (d.scale || 1) }) };
      const [kn, bn] = key.split('_'); drop(KEYS.indexOf(kn) + '_' + BODY.indexOf(bn) + '_'); n++; if (onReady) onReady(key);
    } catch (e) { console.warn('creep model', key, e.message); }
  }));
  return n;
}
