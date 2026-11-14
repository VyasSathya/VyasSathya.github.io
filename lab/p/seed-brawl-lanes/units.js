// Seed Brawl Lanes: the summoned creeps. A creep body is a GLB from game/assets/units when units.json lists one for
// its kind and body, and the old procedural body until then. Every creep is drawn instanced (one draw call for the
// body and one for its outline per kind, body and team) and moved in the shader: a per-creep bend (lunge forward,
// sway sideways, wing flap) and a white flash when it is hit, on top of the hop, squash and lunge done by transform.
// A creep whose GLB carries a skeleton and clips (tools/creep_rig.py) is skinned on the GPU instead: at load every clip
// is sampled at 30 fps into one float texture of bone matrices (3 texels a bone, one row a frame), and each instance
// carries the row it shows (aPose), so a whole kind / body / team is still one draw call for the body and one for the
// outline. Without clips (or if the bake fails) the bend animation stays.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as LOOK from './game/src/look.js';
import * as W from './game/src/world.js';

export const KEYS = ['thorn', 'spitter', 'runner'], BODY = ['grunt', 'brute', 'splasher', 'flyer', 'colossus'];
const BEND = `
attribute vec4 aAnim;   // x lean forward, y sway sideways, z wing flap, w hit flash
vec3 creepBend(vec3 p, vec4 a) { float h = clamp(p.y, 0.0, 1.3), h2 = h * h * 0.5; p.z += a.x * h2; p.x += a.y * h2; p.y += a.z * min(p.x * p.x, 0.6) * 2.0 - (abs(a.x) + abs(a.y)) * 0.25 * h2 * h; return p; }`;

// GPU skinning from the baked bone texture: per instance the frame row, per vertex up to 4 bones
const SKIN = `
uniform sampler2D uBones; attribute vec4 skinIndex; attribute vec4 skinWeight; attribute float aPose;
mat4 boneM(float i) { int x = int(i) * 3, y = int(aPose); return transpose(mat4(texelFetch(uBones, ivec2(x, y), 0), texelFetch(uBones, ivec2(x + 1, y), 0), texelFetch(uBones, ivec2(x + 2, y), 0), vec4(0.0, 0.0, 0.0, 1.0))); }`;
const SKIN_N = '\nmat4 skM = skinWeight.x * boneM(skinIndex.x) + skinWeight.y * boneM(skinIndex.y) + skinWeight.z * boneM(skinIndex.z) + skinWeight.w * boneM(skinIndex.w); objectNormal = mat3(skM) * objectNormal;';
const SKIN_P = '\ntransformed = (skM * vec4(transformed, 1.0)).xyz;';
function skinned(vs) {
  return vs.replace('#include <common>', '#include <common>' + SKIN).replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>' + SKIN_N)
    .replace('#include <begin_vertex>', '#include <begin_vertex>' + SKIN_P);
}
// the game's toon material plus the bend and the flash (and the skinning when opts.bones is a baked bone texture)
function creepMaterial(opts) {
  const m = LOOK.toonMaterial(opts), base = m.onBeforeCompile, top = { value: opts.top || 1.2 };   // top: the body's height, for the lit-top gradient (lighter at the head, darker at the feet)
  m.onBeforeCompile = (s) => {
    base(s); s.uniforms.uTop = top; if (opts.bones) { s.uniforms.uBones = { value: opts.bones }; s.vertexShader = skinned(s.vertexShader); }
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vFlash; varying float vH; uniform float uTop;' + BEND)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = clamp(position.y / uTop, 0.0, 1.0); transformed = creepBend(transformed, aAnim); vFlash = aAnim.w;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFlash; varying float vH;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= mix(0.8, 1.1, vH);')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), vFlash * 0.6);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => opts.bones ? 'seedtoon-creep-skin' : 'seedtoon-creep';
  return m;
}
// Real models keep their own colours, so their team is carried by the outline (and the floor ring): a team-coloured
// line around the whole body reads in a clump where the rings are hidden. Procedural bodies are team-coloured already.
const outMats = {};
function outlineMat(col, width = 1.6, md = null) {
  const key = col + ':' + width + (md && md.bones ? ':' + md.key : ''); if (outMats[key]) return outMats[key];
  const src = LOOK.outlineMaterial(width, col === undefined ? LOOK.palette.outline : col), m = src.clone();
  m.uniforms.uAspect = src.uniforms.uAspect; m.uniforms.uScale = src.uniforms.uScale;
  m.vertexShader = src.vertexShader.replace('#include <common>', '#include <common>' + BEND)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = creepBend(transformed, aAnim);')
    .replace('modelViewMatrix * vec4(transformed, 1.0)', 'modelViewMatrix * instanceMatrix * vec4(transformed, 1.0)')
    .replace('normalMatrix * objectNormal', 'normalMatrix * mat3(instanceMatrix) * objectNormal');
  if (md && md.bones) { m.vertexShader = skinned(m.vertexShader); m.uniforms.uBones = { value: md.bones }; }
  return outMats[key] = m;
}
// the same vertex data with its own per-instance animation attribute
function instanced(geo, anim, pose) {
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) g.setAttribute(k, geo.attributes[k]);
  if (geo.index) g.setIndex(geo.index);
  g.setAttribute('aAnim', anim); if (pose) g.setAttribute('aPose', pose); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
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
  let line; if (md) { geo = md.geo; hull = md.hull; mat = md.mat; line = outlineMat(new THREE.Color(teamCol).multiplyScalar(0.85).getHex(), 1.9, md); }
  else { W.unit(W.UNIT_KINDS[kind], ti, teamCol).children[0].traverse((o) => { if (o.isMesh) { if (o.userData.isHull) hull = o.geometry; else geo = o.geometry; } }); mat = procMat; }
  const anim = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); anim.setUsage(THREE.DynamicDrawUsage);
  const pose = md && md.bones ? new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1) : null; if (pose) pose.setUsage(THREE.DynamicDrawUsage);
  const b = new THREE.InstancedMesh(instanced(geo, anim, pose), mat, MAX), o = new THREE.InstancedMesh(instanced(hull, anim, pose), line || outlineMat(), MAX);
  for (const m of [b, o]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  return SETS[key] = { b, o, n: 0, w: W.UNIT_WIDTH[ti], anim, pose, clips: md && md.bones ? md.clips : null, real: !!md };
}
export const sets = () => SETS;
function drop(prefix) { for (const k in SETS) if (k.startsWith(prefix)) { const s = SETS[k]; scene.remove(s.b, s.o); s.b.dispose(); s.o.dispose(); delete SETS[k]; } }

// a single creep as its own object (the dock pictures)
export function single(kind, ti, teamCol) {
  const md = model(kind, ti); if (!md) return W.unit(W.UNIT_KINDS[kind], ti, teamCol).children[0];
  const g = new THREE.Group(), m = new THREE.Mesh(md.geo, LOOK.toonMaterial({ map: md.mat.map })); g.add(m); LOOK.addOutline(g, 1.6); return g;
}

// every clip sampled at 30 fps into bone matrices in the space of the creep's geometry (scale and turn applied), one
// texture row a frame: M = T * bindMatrixInverse * boneMatrix * bindMatrix * T^-1, T the transform baked into geo
export const FPS = 30;
const NOBAKE = typeof location !== 'undefined' && /[?&]bend=1/.test(location.search);   // ?bend=1: the old bend animation (fallback check, frame time comparison)
function bakeClips(g, mesh, d) {
  const T = new THREE.Matrix4().makeRotationY(d.turn || 0).multiply(new THREE.Matrix4().makeScale(d.scale || 1, d.scale || 1, d.scale || 1)).multiply(mesh.matrixWorld.clone());
  const Ti = T.clone().invert(), sk = mesh.skeleton, nb = sk.bones.length, mixer = new THREE.AnimationMixer(g.scene), clips = {}, rows = [];
  const order = ['walk', 'attack', 'death', 'idle', 'hit'].filter((n) => g.animations.some((c) => c.name === n));
  const M = new THREE.Matrix4(), B = new THREE.Matrix4();
  for (const name of order) {
    const clip = g.animations.find((c) => c.name === name), n = Math.max(1, Math.round(clip.duration * FPS)) + 1, act = mixer.clipAction(clip);
    mixer.stopAllAction(); act.reset().play();
    const info = d.clips && d.clips[name] || {}; clips[name] = { start: rows.length, frames: n, sec: clip.duration, loop: !!info.loop, hit: info.hit };
    for (let f = 0; f < n; f++) {
      act.time = Math.min(clip.duration, f / FPS); mixer.update(0); g.scene.updateMatrixWorld(true); sk.update();
      const row = new Float32Array(nb * 12);
      for (let b = 0; b < nb; b++) {
        B.fromArray(sk.boneMatrices, b * 16); M.copy(T).multiply(mesh.bindMatrixInverse).multiply(B).multiply(mesh.bindMatrix).multiply(Ti);
        const e = M.elements; for (let i = 0; i < 3; i++) { row[b * 12 + i * 4] = e[i]; row[b * 12 + i * 4 + 1] = e[4 + i]; row[b * 12 + i * 4 + 2] = e[8 + i]; row[b * 12 + i * 4 + 3] = e[12 + i]; }
      }
      rows.push(row);
    }
  }
  const data = new Float32Array(nb * 12 * rows.length); rows.forEach((r, i) => data.set(r, i * nb * 12));
  const tex = new THREE.DataTexture(data, nb * 3, rows.length, THREE.RGBAFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  return { tex, clips };
}
// the texture row a creep shows: clip name and seconds into it (loops wrap, one-shots hold their last frame)
export function row(clips, name, sec) {
  const c = clips[name] || clips.idle || clips.walk; let f = Math.floor(sec * FPS + 1e-4);
  f = c.loop ? ((f % (c.frames - 1)) + (c.frames - 1)) % (c.frames - 1) : Math.max(0, Math.min(c.frames - 1, f));
  return c.start + f;
}

// loads every creep model listed in units.json; missing file or list = the procedural bodies stay
export async function load(base, onReady) {
  let j; try { j = await (await fetch(base + 'units.json')).json(); } catch (e) { return 0; }
  info = j; const L = new GLTFLoader(); let n = 0;
  await Promise.all(Object.entries(j.units || {}).map(async ([key, d]) => {
    try {
      const g = await L.loadAsync(base + d.file); let mesh = null; g.scene.updateMatrixWorld(true); g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld); if (d.scale) geo.scale(d.scale, d.scale, d.scale); if (d.turn) geo.rotateY(d.turn);
      let bake = null; if (mesh.isSkinnedMesh && g.animations.length && !NOBAKE) { try { bake = bakeClips(g, mesh, d); } catch (e) { console.warn('creep clips', key, e.message); } }
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].concat(bake ? ['skinIndex', 'skinWeight'] : []).includes(k)) geo.deleteAttribute(k);
      const map = mesh.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
      MODELS[key] = { key, geo, hull: LOOK.hullGeometry(geo), bones: bake && bake.tex, clips: bake && bake.clips,
        mat: creepMaterial({ map, sat: d.sat, contrast: d.contrast, top: (d.height || 1.2) * (d.scale || 1), bones: bake && bake.tex }) };
      const [kn, bn] = key.split('_'); drop(KEYS.indexOf(kn) + '_' + BODY.indexOf(bn) + '_'); n++; if (onReady) onReady(key);
    } catch (e) { console.warn('creep model', key, e.message); }
  }));
  return n;
}
