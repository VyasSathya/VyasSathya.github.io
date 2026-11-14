// Seed Brawl shared look. One module for heroes, units and world so line weight, shading and palette match.
//
// Rules this file holds (from styles/bs-supercell/style.toml and docs/research/supercell-art-style.md section 8):
// - 3 band cel shading (MeshToonMaterial + a 3 step ramp), warm fresnel rim on the lit side, no PBR, no normal maps.
// - Dark inverted-hull outline whose width is set in SCREEN terms (a fraction of screen height), so a small mouse,
//   a big elephant, a unit and a wall all get the same line weight on any phone.
// - Blob shadow (decal, no real-time shadows), team colour only on the floor ring (and unit accents).
// - Texture pass is done IN THE SHADER (no processed copies on disk): the baked albedo gets a saturation and
//   contrast lift so the cel bands read, and the GLB's normal and metal/rough maps are dropped (they put small
//   noisy shading back on top of the bands, the "muddy clay" look of the review renders).
// - sRGB: renderer.outputColorSpace = SRGB, albedo maps tagged SRGB (GLTFLoader does it, we re-assert), palette
//   hex values are sRGB and three's ColorManagement converts them to linear.
// Cost per hero: one toon material + one outline pass (2 draw calls), no post-processing.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

THREE.ColorManagement.enabled = true;

// ---------------------------------------------------------------- palette
// World values sit in a mid band and lower saturation; heroes (their own textures, lifted) are the brightest,
// most saturated things on screen. Team colours from the research (HUD blue 0x0099FF, red 0xFF0000), softened a
// touch so the ring is not a pure-red laser on the grass.
export const palette = {
  outline: 0x1d1424,          // warm near-black, never pure black
  rim: 0xffe2b0,              // warm rim light
  sky: 0x8fb46a,              // clear colour behind the map edge
  grassA: 0x86a565, grassB: 0x7f9e5f, grassEdge: 0x6f8c52,
  dirt: 0xb8946a, dirtDark: 0x9a7650, soil: 0x6e4a33, soilTop: 0x5a3b28,
  rock: 0x9c938a, rockTop: 0xb9b0a4, rockDark: 0x7f766e,
  hedge: 0x4d7d3e, hedgeTop: 0x5f9349,
  bush: 0x3f9a45, bushLight: 0x58b552, bushDark: 0x2f7a3a,
  leaf: 0x6cc84a, leafDark: 0x3f9a3a, stem: 0x6a9a3a, bark: 0x8a5a36, barkDark: 0x6c4429,
  bloom: 0xff7ab8, bloomCenter: 0xffd34d, petal2: 0xfff1f6,
  seed: 0xf2b640, seedDark: 0xc98a24, seedGlow: 0xfff0a0,
  pod: 0x9ad04a, podDark: 0x6aa83a, podSeed: 0xffc23d,
  glass: 0xbfeef0, frame: 0xf4f1e6, roof: 0xe8e3d2, wood: 0xa8774c,
  // units: off-green body colours so they never sink into the grass
  thorn: 0x9b6ad6, thornSpike: 0xfff3c8, spitter: 0xff8a4c, spitterMouth: 0x7a2e1c, runner: 0xffd04a, runnerLeg: 0x7a5a2e,
  eye: 0xffffff, pupil: 0x1d1424,
  team: { blue: 0x1e96ff, red: 0xff3b30, you: 0x2bdc3a, neutral: 0xd8d2c4 },
};

// ---------------------------------------------------------------- toon ramp
// 3 bands: shade, mid, lit. Values are linear (the ramp is a data texture, not sRGB).
function makeRamp(vals) {
  const d = new Uint8Array(vals.length * 4);
  vals.forEach((v, i) => { d.set([v, v, v, 255], i * 4); });
  const t = new THREE.DataTexture(d, vals.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
export const toonRamp = makeRamp([120, 196, 255]);

// ---------------------------------------------------------------- lights
// One key light and one hemisphere fill for the whole game. The rim term is in the shader, not a light.
export const RIM_DIR = new THREE.Vector3(-0.55, 0.65, -0.5).normalize(); // world space, from behind-left-above
export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x7a8a9a, 1.25);
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
  sun.position.set(-4, 10, 7);
  scene.add(hemi, sun);
  return { hemi, sun };
}

// ---------------------------------------------------------------- toon material
// opts: map, color, vertexColors, sat (saturation lift, default 1.25 for textures), contrast, rim (strength),
//       emissive. Returns a MeshToonMaterial with the rim and texture pass injected.
export function toonMaterial(opts = {}) {
  const m = new THREE.MeshToonMaterial({
    map: opts.map || null,
    color: opts.color !== undefined ? opts.color : 0xffffff,
    vertexColors: !!opts.vertexColors,
    gradientMap: toonRamp,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    transparent: !!opts.transparent, opacity: opts.opacity !== undefined ? opts.opacity : 1,
  });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  const u = {
    uSat: { value: opts.sat !== undefined ? opts.sat : (opts.map ? 1.3 : 1.0) },
    uCon: { value: opts.contrast !== undefined ? opts.contrast : (opts.map ? 1.08 : 1.0) },
    uRim: { value: opts.rim !== undefined ? opts.rim : 0.55 },
    uRimCol: { value: new THREE.Color(palette.rim) },
    uRimDir: { value: RIM_DIR },
  };
  m.userData.look = u;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSat; uniform float uCon; uniform float uRim; uniform vec3 uRimCol; uniform vec3 uRimDir;`)
      // texture pass: lift saturation and contrast of the (linear) albedo after it is sampled
      .replace('#include <map_fragment>', `#include <map_fragment>
{ float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = max(mix(vec3(l), diffuseColor.rgb, uSat), 0.0);
  diffuseColor.rgb = clamp((diffuseColor.rgb - 0.18) * uCon + 0.18, 0.0, 1.0); }`)
      // warm rim: banded fresnel, only on faces turned toward the rim direction, added after lighting
      .replace('#include <opaque_fragment>', `{
  vec3 vd = normalize(vViewPosition);
  float fr = 1.0 - clamp(dot(normal, vd), 0.0, 1.0);
  vec3 rd = normalize((viewMatrix * vec4(uRimDir, 0.0)).xyz);
  float side = clamp(dot(normal, rd) * 0.8 + 0.35, 0.0, 1.0);
  float rim = smoothstep(0.62, 0.70, fr) * side;
  outgoingLight += uRimCol * rim * uRim * (0.35 + 0.65 * diffuseColor.rgb);
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'seedtoon';
  return m;
}

// ---------------------------------------------------------------- outline
// Width is in pixels at a 390 px tall screen (the phone landscape height in CSS px), scaled with screen height,
// so the line is the same share of the screen on every phone and for every object size.
export const OUTLINE_PX = 2.0;            // default width for heroes and world pieces
const outlineShared = { uAspect: { value: 16 / 9 }, uScale: { value: 1 } };
export function setOutlineViewport(width, height) { outlineShared.uAspect.value = width / Math.max(1, height); }
const outlineCache = new Map();
export function outlineMaterial(width = OUTLINE_PX, color = palette.outline) {
  const key = width + ':' + color;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.ShaderMaterial({
    uniforms: { uW: { value: width }, uCol: { value: new THREE.Color(color) }, uAspect: outlineShared.uAspect, uScale: outlineShared.uScale },
    vertexShader: `
#include <common>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
uniform float uW; uniform float uAspect; uniform float uScale;
void main() {
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  // push the hull a little away from the camera in view space so it does not poke through creases on the front
  mv.xyz += normalize(mv.xyz) * 0.03;
  vec4 clip = projectionMatrix * mv;
  vec3 nv = normalize(normalMatrix * objectNormal);
  vec2 sd = (projectionMatrix * vec4(nv, 0.0)).xy * vec2(uAspect, 1.0);
  float L = length(sd);
  if (L > 1e-5) {
    sd /= L;
    // 2.0 / 390.0 converts px at a 390 px screen height to NDC; x is divided by aspect to stay isotropic
    clip.xy += sd * vec2(1.0 / uAspect, 1.0) * (uW * uScale * 2.0 / 390.0) * clip.w;
  }
  gl_Position = clip;
}`,
    fragmentShader: `uniform vec3 uCol;
void main() {
  gl_FragColor = vec4(uCol, 1.0);
  #include <colorspace_fragment>
}`,
    side: THREE.BackSide,
  });
  outlineCache.set(key, m);
  return m;
}

// Outline geometry: same vertices but with smooth (averaged) normals, so hard-edged boxes and cylinders, and
// UV seams on the scanned heroes, do not split the hull open. Cached per source geometry.
const hullGeoCache = new WeakMap();
export function hullGeometry(geo) {
  if (hullGeoCache.has(geo)) return hullGeoCache.get(geo);
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    if (name === 'normal' || name === 'uv' || name === 'uv1' || name === 'uv2' || name === 'color' || name === 'tangent') continue;
    g.setAttribute(name, geo.attributes[name]);
  }
  if (geo.index) g.setIndex(geo.index);
  let m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  hullGeoCache.set(geo, m);
  return m;
}

// Adds an outline hull next to every mesh under `object` (skinned or static). Returns the hull meshes.
export function addOutline(object, width = OUTLINE_PX, color = palette.outline) {
  const add = [];
  object.traverse((o) => { if (o.isMesh && !o.userData.isHull && !o.userData.noOutline) add.push(o); });
  const hulls = [];
  for (const o of add) {
    const geo = hullGeometry(o.geometry);
    let h;
    if (o.isSkinnedMesh) { h = new THREE.SkinnedMesh(geo, outlineMaterial(width, color)); h.bind(o.skeleton, o.bindMatrix); }
    else h = new THREE.Mesh(geo, outlineMaterial(width, color));
    h.userData.isHull = true;
    h.position.copy(o.position); h.quaternion.copy(o.quaternion); h.scale.copy(o.scale);
    h.frustumCulled = o.frustumCulled;
    h.renderOrder = o.renderOrder;
    o.parent.add(h);
    hulls.push(h);
  }
  return hulls;
}

// ---------------------------------------------------------------- decals
function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.72, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
let _blobTex = null;
const blobMats = new Map();
// Hard-edged fake shadow, slightly squashed and pushed back like the reference blob (skew toward away-from-sun).
export function blobShadow(r = 0.5, opacity = 0.3) {
  _blobTex = _blobTex || blobTexture();
  if (!blobMats.has(opacity)) blobMats.set(opacity, new THREE.MeshBasicMaterial({ color: 0x1d2410, alphaMap: _blobTex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2 * 0.85), blobMats.get(opacity));
  m.rotation.x = -Math.PI / 2; m.position.set(0.04 * r, 0.012, 0.06 * r); m.renderOrder = 1;
  m.userData.noOutline = true;
  return m;
}
// Team floor ring: a thick ring with a darker inner edge so it reads on bright and dark ground.
export function teamRing(r = 0.5, color = palette.team.blue) {
  const grp = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshBasicMaterial({ color: c, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.88, r, 40), mat);
  const edge = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.06, 40), new THREE.MeshBasicMaterial({ color: palette.outline, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  for (const m of [ring, edge]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.018; m.renderOrder = 2; m.userData.noOutline = true; grp.add(m); }
  grp.userData.noOutline = true;
  return grp;
}

// ---------------------------------------------------------------- heroes
const loader = new GLTFLoader();
let heroBase = 'assets/heroes/';
export function setHeroBase(url) { heroBase = url.endsWith('/') ? url : url + '/'; }
let rosterP = null;
export function heroRoster() { if (!rosterP) rosterP = fetch(heroBase + 'heroes.json').then((r) => r.json()); return rosterP; }
const gltfCache = new Map();
const heroMatCache = new Map();

// loadHero(id, {team, ring, shadow, outline}) -> {root, body, mixer, clips, size, info}
//   root: group with feet at y=0 and the hero facing +Z (toward the camera). Rotate root.rotation.y = PI to face up the map.
//   size: {width, height} in tiles from heroes.json; the model is scaled so its height matches.
export async function loadHero(id, opts = {}) {
  const roster = await heroRoster();
  const info = roster.heroes.find((h) => h.id === id);
  if (!info) throw new Error('unknown hero ' + id);
  if (!gltfCache.has(id)) gltfCache.set(id, loader.loadAsync(heroBase + (info.file || id + '.glb')));
  const gltf = await gltfCache.get(id);
  const body = SkeletonUtils.clone(gltf.scene);
  // one shared toon material per hero
  if (!heroMatCache.has(id)) {
    let src = null; gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o.material; });
    heroMatCache.set(id, toonMaterial({ map: src && src.map, sat: info.sat, contrast: info.contrast }));
  }
  const mat = heroMatCache.get(id);
  body.traverse((o) => { if (o.isMesh) { o.material = mat; o.frustumCulled = false; } });
  // measure at bind pose, then scale to the roster height and put the feet on the floor
  body.updateMatrixWorld(true);
  const box = new THREE.Box3();
  body.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  const raw = box.getSize(new THREE.Vector3());
  const s = info.height / raw.y;
  // centre on the feet, not the bounding box (T-pose arms, tails and props make the box lopsided)
  const fc = new THREE.Vector3(), v = new THREE.Vector3(); let fn = 0;
  body.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y < box.min.y + raw.y * 0.12) { fc.add(v); fn++; } } });
  if (fn) fc.divideScalar(fn); else box.getCenter(fc);
  body.scale.setScalar(s);
  body.position.set(-fc.x * s, -box.min.y * s, -fc.z * s);
  if (opts.outline !== false) addOutline(body, opts.outlineWidth || OUTLINE_PX);
  const root = new THREE.Group();
  root.add(body);
  if (opts.shadow !== false) root.add(blobShadow(info.width * 0.62));
  if (opts.ring !== false) root.add(teamRing(info.width * 0.68, opts.team !== undefined ? opts.team : palette.team.blue));
  root.userData.hero = info;
  const mixer = new THREE.AnimationMixer(body);
  const clips = {};
  for (const c of gltf.animations) clips[c.name] = c;
  return { root, body, mixer, clips, size: { width: info.width, height: info.height }, info, raw };
}

// ---------------------------------------------------------------- game camera
// The 21 tile map width fills the screen width at the focus point; pitch 58 degrees down; 30 degree fov.
export const MAP_W = 21;
export function placeGameCamera(cam, renderer, focus = new THREE.Vector3(), opts = {}) {
  const w = opts.width || innerWidth, h = opts.height || innerHeight;
  const a = w / h; cam.aspect = a; cam.fov = opts.fov || 30; cam.updateProjectionMatrix();
  const span = opts.span || MAP_W;
  const hfov = 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * a), d = (span / 2) / Math.tan(hfov / 2);
  const p = (opts.pitch || 58) * Math.PI / 180, yaw = (opts.yaw || 0) * Math.PI / 180;
  cam.position.set(focus.x + Math.sin(yaw) * Math.cos(p) * d, focus.y + Math.sin(p) * d, focus.z + Math.cos(yaw) * Math.cos(p) * d);
  cam.lookAt(focus);
  if (renderer) renderer.setSize(w, h, false);
  setOutlineViewport(w, h);
}

export { THREE };
