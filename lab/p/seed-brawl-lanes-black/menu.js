// Seed Brawl Lanes: the app screens around the match. Home, Road, Deck, Heroes, Result, Unlock reveal, Settings and
// the first run. Progress and the road live in meta.js (window.SBL_META). The heroes and creeps on these screens are
// the game's own models drawn live by the game's renderer (main.js hands it over in its MENU HOOK block); while a
// screen is up this module renders the frame, and the match takes the renderer back when Play is pressed.
// Spec: work/meta/SPEC.md. Layout is a 874 x 402 design box (iPhone landscape points) scaled to the stage.
const META = window.SBL_META, SB = window.SBL;
let V = null, THREE = null, LOOK = null, UNITS = null, W = null;
const $ = id => document.getElementById(id), stage = $('stage');
const BW = 874, BH = 402;
const CREEP_W = [0.42, 0.6, 0.52, 0.5, 0.9];
const KIND_NAMES = ['Thorn', 'Spitter', 'Runner'], BODY_NAMES = ['', 'Grunt', 'Brute', 'Splasher', 'Flyer', 'Colossus'];

// ---- small svg glyphs in the game's ink and gold
const SVG = {
  trophy: '<svg viewBox="0 0 40 40"><path d="M11 6h18v6c0 7-4 12-9 12s-9-5-9-12z" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/><path d="M11 9H5c0 6 3 9 7 9M29 9h6c0 6-3 9-7 9" fill="none" stroke="#1a1320" stroke-width="3" stroke-linecap="round"/><path d="M17 24h6l1 6h-8z" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/><rect x="11" y="30" width="18" height="6" rx="2" fill="#ffc83d" stroke="#1a1320" stroke-width="3"/><path d="M15 10v5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></svg>',
  gear: '<svg viewBox="0 0 40 40"><path d="M20 4l3 5 6-2 1 6 6 1-2 6 5 3-5 3 2 6-6 1-1 6-6-2-3 5-3-5-6 2-1-6-6-1 2-6-5-3 5-3-2-6 6-1 1-6 6 2z" fill="#e6e0d2" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="20" r="6" fill="#4a3f55" stroke="#1a1320" stroke-width="3"/></svg>',
  back: '<svg viewBox="0 0 40 40"><path d="M24 8L11 20l13 12" fill="none" stroke="#1a1320" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 8L11 20l13 12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  road: '<svg viewBox="0 0 40 40"><path d="M6 32c6-14 22-6 28-22" fill="none" stroke="#1a1320" stroke-width="9" stroke-linecap="round"/><path d="M6 32c6-14 22-6 28-22" fill="none" stroke="#ffc83d" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 7"/><circle cx="34" cy="10" r="5" fill="#ffc83d" stroke="#1a1320" stroke-width="3"/><circle cx="6" cy="32" r="4" fill="#6fe04a" stroke="#1a1320" stroke-width="3"/></svg>',
  hand: '<svg viewBox="0 0 54 54"><path d="M20 30V10a4 4 0 018 0v14l9 2c4 1 6 4 5 8l-3 12H22l-9-11c-2-3 1-6 4-4z" fill="#fff8e8" stroke="#1a1320" stroke-width="3.5" stroke-linejoin="round"/></svg>',
};

// ---- sound: the game's player, UI tier; respects the setting
function snd(id) { try { if (window.SBL_SOUND && window.SBL_SOUND.player) window.SBL_SOUND.player.play(id, { ui: true }); } catch (e) { } }
function music(name, after) { try { const m = window.SBL_SOUND.player.music; if (after !== undefined) m.stinger(name, after); else if (m.want !== name || !m.cur) m.set(name); } catch (e) { } }
function applySound() { try { const p = window.SBL_SOUND && window.SBL_SOUND.player; if (p && p.setSound) { p.setSound(META.state.settings.sound); p.setMusic(META.state.settings.music); } } catch (e) { } }

// ---- layout: the design box scaled into the stage, centred
let VW = 1, VH = 1, MS = 1, OX = 0, OY = 0, box = null, back = null, root = null;
function layout() {
  VW = stage.offsetWidth || innerWidth; VH = stage.offsetHeight || innerHeight;
  MS = Math.min(VW / BW, VH / BH); OX = (VW - BW * MS) / 2; OY = (VH - BH * MS) / 2;
  if (box) box.style.transform = `translate(${OX}px,${OY}px) scale(${MS})`;
}
const el = (tag, cls, html, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (css) e.style.cssText = css; return e; };
const at = (x, y, w, h) => `left:${x}px;top:${y}px;` + (w ? `width:${w}px;` : '') + (h ? `height:${h}px;` : '');
const delay = ms => `animation-delay:${ms}ms;`;
// a button: tap on click (touch makes one), a pressed look while held, a sound
function btn(cls, html, css, fn, sound) {
  const b = el('div', 'at tap mb ' + cls, html, css); b.setAttribute('role', 'button');
  b.addEventListener('pointerdown', () => b.classList.add('down'));
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('down'));
  onTap(b, e => { if (b.dataset.off) return; snd(sound || 'menu_tap'); fn && fn(); });
  return b;
}
// a tap is a pointer down and up on the same element without a drag. The browser's own click after a touch can land on
// another element when the pressed button moves (its press animation), so taps fire on pointerup; a click only counts
// when no tap fired just before it (a keyboard or script click).
let lastTap = 0;
function onTap(t, fn) {
  let down = null;
  t.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  t.addEventListener('pointerup', e => { if (!down || e.pointerId !== down.id) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (d > 14) return; e.stopPropagation(); lastTap = performance.now(); fn(e); });
  t.addEventListener('pointercancel', () => { down = null; });
  t.addEventListener('click', e => { e.stopPropagation(); if (performance.now() - lastTap < 700) return; fn(e); });
}

// ---- pictures of the real models, drawn once by the game's renderer (transparent, for tiles and the road)
const pics = {};
function snapScene(sc, cam, size) {
  const r = V.renderer, prevClear = r.getClearAlpha(); r.setSize(size, size, false); LOOK.setOutlineViewport(size, size); r.setClearColor(0, 0);
  r.render(sc, cam); const url = r.domElement.toDataURL('image/png'); r.setClearColor(0, prevClear); V.resize(); return url;
}
function creepPic(id, size = 200) {
  const key = id + ':' + size; if (pics[key]) return pics[key];
  const { kind, tier } = META.parse(id), ti = tier - 1, sc = new THREE.Scene(); LOOK.addLights(sc);
  const body = UNITS.single(kind, ti, LOOK.palette.team.blue); sc.add(body); body.rotation.y = .45;
  const bx = new THREE.Box3().setFromObject(body), h = Math.max(.3, bx.max.y - bx.min.y), w = Math.max(.3, bx.max.x - bx.min.x), cy = (bx.max.y + bx.min.y) / 2;
  const c = new THREE.PerspectiveCamera(24, 1, .05, 80), d = Math.max(h, w) * 2.9; c.position.set(0, cy + h * .45, d); c.lookAt(0, cy, 0);
  const url = snapScene(sc, c, size);
  if (UNITS.model(kind, ti)) pics[key] = url;   // a procedural stand-in is not kept: the real model may still be loading
  return url;
}
const heroPicP = {};
function heroPic(id) {
  if (heroPicP[id]) return heroPicP[id];
  return heroPicP[id] = LOOK.loadHero(V.CAST[id] || 'cat', { ring: false, shadow: false }).then(H => {
    const sc = new THREE.Scene(); LOOK.addLights(sc); sc.add(H.root);
    const r = V.rigOf(H); V.setBone(r, 'UpperArm_L', 0, 0, -r.dnL); V.setBone(r, 'UpperArm_R', 0, 0, r.dnR); V.setBone(r, 'Forearm_L', 0, -.3, 0); V.setBone(r, 'Forearm_R', 0, .3, 0);
    const c = new THREE.PerspectiveCamera(28, 1, .1, 50), h = H.size.height; c.position.set(.7 * h, h * .95, 2.9 * h); c.lookAt(0, h * .55, 0);
    return snapScene(sc, c, 240);
  });
}
function setImg(img, p) { if (typeof p === 'string') img.src = p; else p.then(u => { img.src = u; }); }
// the creep models load after the page; pictures taken before that show the stand-in bodies, so screens redraw once
const modelsReady = () => META.allCreeps().every(id => { const { kind, tier } = META.parse(id); return !!UNITS.model(kind, tier - 1); });
let readyWait = null;
function whenModels(fn) { if (modelsReady()) return; const t0 = performance.now(); if (!readyWait) readyWait = new Promise(ok => { const k = () => modelsReady() || performance.now() - t0 > 15000 ? ok() : setTimeout(k, 200); k(); }); const sc = screen; readyWait.then(() => { if (screen === sc && modelsReady()) fn(); }); }
const rewardPic = r => r.type === 'hero' ? heroPic(r.id) : creepPic(r.id);
const nameOf = id => { const h = SB.HEROES.find(h => h.id === id); if (h) return h.name; const { kind, tier } = META.parse(id); return KIND_NAMES[kind] + ' ' + BODY_NAMES[tier]; };
const costOf = id => SB.costOf ? SB.costOf(META.parse(id).tier) : [0, 1, 2, 3, 5, 8][META.parse(id).tier];

// ---- the live 3D stage: its own scene and camera, drawn on the game's canvas behind the screen's buttons
let scene3 = null, cam3 = null, island = null, slots = [], heroes3 = [], extras = [];
const clock = { t: 0 };
function makeIsland() {
  const g = new THREE.Group(), P = LOOK.palette;
  const top = LOOK.toonMaterial({ color: P.grassA }), side = LOOK.toonMaterial({ color: P.soil });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.1, .55, 56), [side, top, side]); cyl.position.y = -.275; g.add(cyl);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.45, .08, 56), LOOK.toonMaterial({ color: P.grassEdge })); lip.position.y = -.03; g.add(lip);
  LOOK.addOutline(g, 2.2);
  const bushAt = [[-3.0, -1.4, 1.1], [-2.2, -2.5, 1.25], [2.4, -2.3, 1.2], [3.05, -1.2, 1.0], [-.9, -3.0, .95], [1.0, -3.05, 1.0]];
  bushAt.forEach(([x, z, s], i) => { const b = W.bush(i * 5 + 3); b.scale.setScalar(s); b.position.set(x, 0, z); g.add(b); });
  const pod = W.seedPod(); pod.scale.setScalar(.75); pod.position.set(-2.6, 0, .3); g.add(pod);
  for (const [x, z, k] of [[2.75, .4, 1], [2.95, -.45, 2]]) { const w = W.wall('rock', k, 0); w.scale.set(.75, .8, .75); w.position.set(x, 0, z); g.add(w); }
  return g;
}
function init3() {
  scene3 = new THREE.Scene(); LOOK.addLights(scene3);
  cam3 = new THREE.PerspectiveCamera(22, 1, .1, 200);
  island = makeIsland(); scene3.add(island);
}
// point the camera so `target` lands on design point (dx, dy) at `ppt` design pixels per tile, looking down `pitch`
function aim(target, dx, dy, ppt, pitch) {
  const s = MS, sx = OX + dx * s, sy = OY + dy * s, D = VH / (2 * Math.tan(cam3.fov * Math.PI / 360) * ppt * s), p = pitch * Math.PI / 180;
  cam3.position.set(target.x, target.y + Math.sin(p) * D, target.z + Math.cos(p) * D); cam3.lookAt(target);
  cam3.aspect = VW / VH; cam3.setViewOffset(VW, VH, VW / 2 - sx, VH / 2 - sy, VW, VH); cam3.updateProjectionMatrix();
}
let camAim = null;
// a live hero, posed every frame by the game's own pose code
async function liveHero(id, opt = {}) {
  const H = await LOOK.loadHero(V.CAST[id] || 'cat', { team: opt.ring === false ? undefined : LOOK.palette.team.you, ring: opt.ring !== false, shadow: true });
  const h = { fireT: 0, supT: 0, dead: false };
  const v = { h, id, grp: H.root, body: H.body, s0: H.body.scale.x, rig: V.rigOf(H), by0: H.body.position.y, bz0: H.body.position.z, rx0: H.body.rotation.x, wk: 0, ph: 0, at: 0, su: 0, dd: 0, cd: 0, sd: Math.random() * 9, fire: 0, pop: 0, ht: H.size.height, w: H.size.width, born: clock.t, spin: 0, turn: 0, cheer: opt.cheer || 0 };
  return v;
}
function tickLive(v, dt) {
  const h = v.h; V.pose(v, dt, 0, clock.t); v.fire = h.fireT; if (h.fireT > 0) h.fireT = 0;
  if (v.cheer && clock.t - (v.lastCheer || 0) > v.cheer) { v.lastCheer = clock.t + Math.random() * .4; h.supT += 1; }
  const k = Math.min(1, (clock.t - v.born) / .28), drop = 1 - k;                          // drop in, squash on landing
  v.grp.position.y = (v.y0 || 0) + drop * drop * 1.4;
  const sq = k < 1 ? 1 : Math.max(0, 1 - (clock.t - v.born - .28) / .18);
  v.body.scale.set(v.s0 * (1 + .12 * sq * (k >= 1 ? 1 : 0)), v.s0 * (1 - .14 * sq * (k >= 1 ? 1 : 0)), v.s0 * (1 + .12 * sq * (k >= 1 ? 1 : 0)));
  v.spin += (v.turn - v.spin) * Math.min(1, dt * 8); v.grp.rotation.y = (v.face || 0) + v.spin;
}
function poke(v) { if (!v) return; v.h.fireT = .3; snd((v.id === 'shade' ? 'shade' : v.id) + '_atk'); }
// a creep from your deck standing on the island: hop and breathe by transform
function liveCreep(id, x, z, face) {
  const { kind, tier } = META.parse(id), ti = tier - 1, body = UNITS.single(kind, ti, LOOK.palette.team.blue), g = new THREE.Group();
  const s = CREEP_W[ti] * 1.5; body.scale.setScalar(s); g.add(body);
  const ring = LOOK.teamRing(CREEP_W[ti] * .62, LOOK.palette.team.blue); g.add(ring);
  g.position.set(x, 0, z); g.rotation.y = face; g.userData = { body, ti, s, ph: Math.random() * 6, real: !!UNITS.model(kind, ti), id, x, z, face };
  return g;
}
function tickCreep(g) {
  const u = g.userData, t = clock.t + u.ph, b = u.body;
  if (u.ti === 3) { b.position.y = 1.0 + Math.sin(t * 2.4) * .12; b.rotation.x = .25; }
  else { const k = Math.abs(Math.sin(t * (u.ti === 0 ? 3.2 : 1.8))); b.position.y = k * .05; b.scale.set(u.s * (1 + .03 * (1 - k)), u.s * (1 - .04 * (1 - k)) , u.s * (1 + .03 * (1 - k))); }
}
function clear3() { for (const v of heroes3) scene3.remove(v.grp); heroes3 = []; for (const g of slots) scene3.remove(g); slots = []; for (const x of extras) scene3.remove(x); extras = []; island.visible = false; camAim = null; }

// ---- screens
let screen = '', active = false, pending = null, lastOutcome = null, queue = [];
// the new background fades in over the old one (never over an empty frame); the same background stays as it is
function setBack(kind, extra) {
  const cls = 'bg ' + kind + (extra ? ' ' + extra : ''), cur = back.lastElementChild;
  if (cur && cur.className.replace(' on', '') === cls) return;
  const b = el('div', cls); back.appendChild(b);
  if (kind === 'reveal') { const r = el('div', 'rays' + (extra === 'hero' ? ' hero' : '')); b.appendChild(r); }
  if (!cur) b.classList.add('on'); else requestAnimationFrame(() => b.classList.add('on'));
  setTimeout(() => { while (back.firstElementChild && back.firstElementChild !== b && back.lastElementChild === b) back.firstElementChild.remove(); }, 420);
}
function newScreen(name) { screen = name; box.innerHTML = ''; const s = el('div', 'scr'); box.appendChild(s); return s; }
function trophyChip(x, y, go, n) {
  const c = el('div', 'at chip' + (go ? ' tap' : ''), SVG.trophy + '<span>' + (n === undefined ? META.state.trophies : n) + '</span>', at(x, y));
  if (go) onTap(c, () => { snd('card_tap'); go(); }); return c;
}
// the road bar: progress from the last mark to the next, the next reward at its end
function roadBar(x, y, w, t, go) {
  const b = el('div', 'at rbar' + (go ? ' tap' : ''), '', at(x, y, w)), trk = el('div', 'trk'), fill = el('div', 'fill'), num = el('div', 'num o');
  trk.append(fill, num); b.appendChild(trk);
  const rew = el('div', 'rew'), img = el('img'); img.alt = ''; rew.appendChild(img); b.appendChild(rew);
  if (go) onTap(b, () => { snd('card_tap'); go(); });
  const set = tt => {
    const n = META.next(tt), p = META.progress(tt); fill.style.width = (p * 100) + '%'; fill.classList.toggle('zero', p <= 0);
    num.textContent = n ? Math.floor(tt) + ' / ' + n.at : Math.floor(tt);
    const r = n ? n.rewards[0] : null; rew.style.visibility = r ? '' : 'hidden';
    if (r && b.dataset.rid !== r.id) { b.dataset.rid = r.id; rew.className = 'rew ' + (r.type === 'hero' ? 'hero' : ''); setImg(img, rewardPic(r)); }
  };
  let cur = t; const set2 = tt => { cur = tt; set(tt); }; set(t); b.set = set2; whenModels(() => { b.dataset.rid = ''; set(cur); }); return b;
}
function backBtn(fn) { return btn('ink', SVG.back, at(62, 8, 48, 44) + 'border-radius:12px', fn); }

// Home: hero big on the island with the deck around him, Play under the right thumb (Brawl Stars lobby)
async function showHome(opt = {}) {
  const s = newScreen('home'); setBack('home'); clear3(); island.visible = true;
  const st = META.state, unseen = META.unseen(), heroIds = META.unlocked().heroes;
  s.appendChild(trophyChip(62, 8, showRoad)); s.lastChild.classList.add('in-drop'); s.lastChild.style.cssText += delay(120);
  const rb = roadBar(206, 8, 470, st.trophies, showRoad); rb.classList.add('in-drop'); rb.style.cssText += delay(160); s.appendChild(rb);
  const g = btn('ink ico', SVG.gear, at(764, 8, 48, 44) + delay(200), showSettings); g.classList.add('in-drop'); s.appendChild(g);
  const rail = [['Heroes', showHeroes, unseen.some(id => heroIds.includes(id))], ['Deck', showDeck, unseen.some(id => !heroIds.includes(id))], ['Road', showRoad, false]];
  rail.forEach(([name, fn, dot], i) => {
    const b = btn('rail in-pop', '', at(62, 96 + i * 88, 76, 76) + delay(200 + i * 60), fn); b.dataset.name = name.toLowerCase();
    if (i === 0) { const im = el('img'); setImg(im, heroPic(st.hero)); b.appendChild(im); }
    else if (i === 1) { const im = el('img'); im.src = creepPic(st.deck[0], 160); b.appendChild(im); }
    else b.insertAdjacentHTML('beforeend', SVG.road);
    b.appendChild(el('div', 'lbl o', name)); if (dot) b.appendChild(el('div', 'dot'));
    s.appendChild(b);
  });
  whenModels(() => { const im = s.querySelector('[data-name="deck"] img'); if (im) im.src = creepPic(st.deck[0], 160); rb.dataset.rid = ''; rb.set(st.trophies); });
  const hdef = SB.HEROES.find(h => h.id === st.hero) || SB.HEROES[0];
  const plate = el('div', 'at plate o tap in-rise', hdef.name, at(350, 334, 200) + delay(320)); onTap(plate, () => { snd('card_tap'); showHeroes(); }); s.appendChild(plate);
  const hit = el('div', 'at tap', '', at(330, 70, 240, 260)); s.appendChild(hit); dragTurn(hit, () => heroes3[0]);
  const play = btn('gold play pulse in-rise', '<span>Play</span>', at(596, 284, 216, 84) + delay(380), play_, 'play_press'); play.id = 'mPlay'; s.appendChild(play);
  if (opt.hand === undefined ? st.played === 1 : opt.hand) { const hd = el('div', 'hand', SVG.hand, 'left:700px;top:330px'); s.appendChild(hd); }
  // the 3D: hero at the front, the six of the deck in an arc behind him
  const v = await liveHero(st.hero); if (screen !== 'home') return;
  v.grp.position.set(0, 0, .8); v.grp.scale.setScalar(1.75); scene3.add(v.grp); heroes3.push(v);
  const arc = [[-2.35, -.55], [-1.6, -1.45], [-.6, -1.95], [.6, -1.95], [1.6, -1.45], [2.35, -.55]];
  st.deck.forEach((id, i) => { const [x, z] = arc[i], g = liveCreep(id, x, z, Math.atan2(-x, 3 - z) * .6); g.userData.born = clock.t + .35 + i * .05; scene3.add(g); slots.push(g); });
  camAim = () => aim(new THREE.Vector3(0, 1.1, .3), 450, 206, 86, 16);
}
function dragTurn(hitEl, getV) {
  let id = null, x0 = 0, s0 = 0, moved = 0;
  const px = e => stage.classList.contains('rot') ? e.clientY : e.clientX;
  hitEl.addEventListener('pointerdown', e => { const v = getV(); if (!v) return; id = e.pointerId; x0 = px(e); s0 = v.turn; moved = 0; try { hitEl.setPointerCapture(id); } catch (err) { } });
  hitEl.addEventListener('pointermove', e => { if (e.pointerId !== id) return; const v = getV(); if (!v) return; const d = (px(e) - x0) / MS; moved = Math.max(moved, Math.abs(d)); v.turn = s0 + d * .02; });
  const up = e => { if (e.pointerId !== id) return; id = null; const v = getV(); if (!v) return; if (moved < 6) poke(v); v.turn = Math.round(v.turn / (Math.PI * 2)) * Math.PI * 2; };
  hitEl.addEventListener('pointerup', up); hitEl.addEventListener('pointercancel', up);
}

// Road: a long horizontal track you drag, the rewards standing on it, you marked on it (Brawl Stars trophy road)
function showRoad() {
  const s = newScreen('road'); setBack('plain'); clear3();
  const st = META.state, marks = META.marks(), STEP = 176, X0 = 150;
  s.appendChild(backBtn(() => showHome()));
  s.appendChild(trophyChip(122, 8));
  s.appendChild(el('div', 'at title o', 'Trophy Road', at(270, 14)));
  const road = el('div', 'road'), inner = el('div', 'in'); road.appendChild(inner); s.appendChild(road);
  const xs = [X0, ...marks.map((m, i) => X0 + (i + 1) * STEP)], ats = [0, ...marks.map(m => m.at)], W_ = xs[xs.length - 1] + 260;
  inner.style.width = W_ + 'px';
  inner.appendChild(el('div', 'ground'));
  const xOf = t => { for (let i = 0; i < ats.length - 1; i++) if (t < ats[i + 1]) return xs[i] + (t - ats[i]) / (ats[i + 1] - ats[i]) * STEP; return xs[xs.length - 1] + Math.min(1, (t - ats[ats.length - 1]) / 400) * 120; };
  inner.appendChild(el('div', 'trk', '', `left:${X0 - 20}px;width:${W_ - X0 - 60}px`));
  const yx = xOf(st.trophies); inner.appendChild(el('div', 'fill', '', `left:${X0 - 20}px;width:${Math.max(26, yx - X0 + 20)}px`));
  let popEl = null;
  const nextAt = (META.next(st.best) || {}).at;
  marks.forEach((m, i) => {
    const x = xs[i + 1], got = m.at <= st.best;
    inner.appendChild(el('div', 'node' + (got ? ' got' : ''), '', `left:${x}px`));
    inner.appendChild(el('div', 'lab', SVG.trophy + m.at, `left:${x}px`));
    const r = m.rewards[0], hero = r.type === 'hero', w = hero ? 156 : 136, h = hero ? 180 : 152;
    const wrap = el('div', 'rw tap in-pop' + (m.at === nextAt ? ' next' : ''), '', `left:${x}px;` + delay(Math.min(500, i * 35)));
    const t = el('div', (hero ? 'ht' : 'ct k' + META.parse(r.id).kind) + (got ? '' : ' lock'), '', `width:${w}px;height:${h}px`);
    const img = el('img'); img.alt = ''; if (!hero) img.style.cssText = `width:${w - 6}px;height:${w - 6}px`; setImg(img, rewardPic(r)); t.appendChild(img);
    t.appendChild(el('div', 'nm o', nameOf(r.id)));
    wrap.appendChild(t); inner.appendChild(wrap);
    onTap(wrap, e => {
      e.stopPropagation(); snd('ui_tap'); if (popEl) popEl.remove();
      popEl = el('div', 'pop', `<div class="t o">${nameOf(r.id)}</div><div class="s">${hero ? 'Hero' : BODY_NAMES[META.parse(r.id).tier] + ' / ' + KIND_NAMES[META.parse(r.id).kind]}</div>`, `left:${x - 110}px;top:2px`);
      if (got) popEl.appendChild(btn('gold', 'Use', 'position:relative;width:100%', () => hero ? showHeroes(r.id) : showDeck(r.id)));
      inner.appendChild(popEl);
    });
  });
  onTap(inner, () => { if (popEl) { popEl.remove(); popEl = null; } });
  inner.appendChild(el('div', 'end', '<svg viewBox="0 0 40 40" width="40" height="40"><path d="M10 36V4" stroke="#1a1320" stroke-width="4"/><path d="M11 5h20l-5 7 5 7H11z" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/></svg>', `left:${xs[xs.length - 1] + 120}px`));
  const you = el('div', 'you', '', `left:${yx}px`), yim = el('img'); setImg(yim, heroPic(st.hero)); you.appendChild(yim); inner.appendChild(you);
  requestAnimationFrame(() => { road.scrollLeft = Math.max(0, yx - BW * .4); });
  whenModels(() => { const keep = road.scrollLeft; showRoad(); requestAnimationFrame(() => { const r = box.querySelector('.road'); if (r) r.scrollLeft = keep; }); });
}

// Deck: your six on the left, every creep on the right as kinds by bodies; tap one, tap a slot (Clash Royale deck)
function showDeck(holdId) {
  const s = newScreen('deck'); setBack('plain'); clear3();
  const st = META.state, u = META.unlocked().creeps;
  s.appendChild(backBtn(() => showHome()));
  s.appendChild(el('div', 'at title o', 'Deck', at(124, 14)));
  let held = null;   // {from:'col'|'deck', id, slot}
  const deckEls = [], colEls = {};
  const draw = () => {
    st.deck.forEach((id, i) => fillTile(deckEls[i], id, true));
    for (const id of META.allCreeps()) { const t = colEls[id]; t.classList.toggle('used', st.deck.includes(id)); t.querySelector('.chk').style.display = st.deck.includes(id) ? '' : 'none'; }
    const wig = !!held; deckEls.forEach(d => d.classList.toggle('wig', wig && held.from === 'col')); for (const id of u) colEls[id].classList.toggle('wig', wig && held.from === 'deck' && !st.deck.includes(id));
    deckEls.forEach((d, i) => d.classList.toggle('held', !!held && held.from === 'deck' && held.slot === i)); for (const id in colEls) colEls[id].classList.toggle('held', !!held && held.from === 'col' && held.id === id);
  };
  const fillTile = (t, id, inDeck) => {
    const { kind, tier } = META.parse(id); if (t.dataset.id === id) return; t.dataset.id = id; t.className = 'ct tap k' + kind + (inDeck ? '' : '');
    t.innerHTML = ''; const img = el('img'); img.style.cssText = 'width:78px;height:78px'; img.src = creepPic(id); t.append(img, el('div', 'nm o', '<small>' + KIND_NAMES[kind] + '</small>' + BODY_NAMES[tier]), el('div', 'cost', costOf(id)));
  };
  for (let i = 0; i < 6; i++) {
    const t = el('div', 'ct tap in-drop', '', at(62 + (i % 3) * 92, 64 + Math.floor(i / 3) * 142, 86, 128) + delay(i * 40)); t.dataset.slot = i; s.appendChild(t); deckEls.push(t);
    onTap(t, () => {
      snd('ui_tap');
      if (held && held.from === 'col') { META.swap(i, held.id); held = null; flash(t); }
      else if (held && held.from === 'deck' && held.slot !== i) { const d = st.deck.slice(), a = d[held.slot]; d[held.slot] = d[i]; d[i] = a; META.setDeck(d); held = null; }
      else held = held && held.slot === i ? null : { from: 'deck', slot: i, id: st.deck[i] };
      draw();
    });
  }
  META.allCreeps().forEach((id, n) => {
    const { kind, tier } = META.parse(id), col = tier - 1, row = kind, ok = u.includes(id);
    const t = el('div', 'ct tap in-pop k' + kind + (ok ? '' : ' lock'), '', at(366 + col * 90, 64 + row * 98, 82, 88) + delay(150 + row * 60 + col * 20)); t.dataset.id = id;
    const img = el('img'); img.style.cssText = ok ? 'width:60px;height:60px' : 'width:66px;height:66px'; img.src = creepPic(id); t.appendChild(img);
    if (ok) { t.append(el('div', 'nm o', '<small>' + KIND_NAMES[kind] + '</small>' + BODY_NAMES[tier]), el('div', 'cost', costOf(id))); if (!st.seen.includes(id)) t.appendChild(el('div', 'dot')); }
    else t.appendChild(el('div', 'mk', SVG.trophy + META.markFor(id)));
    t.appendChild(el('div', 'chk', '', 'display:none'));
    onTap(t, () => {
      if (!ok) { snd('ui_tap'); t.classList.remove('nope'); void t.offsetWidth; t.classList.add('nope'); return; }
      snd('ui_tap'); META.markSeen(id); const dt = t.querySelector('.dot'); if (dt) dt.remove();
      if (held && held.from === 'deck') { META.swap(held.slot, id); flash(deckEls[held.slot]); held = null; }
      else if (st.deck.includes(id)) held = null;
      else held = held && held.id === id ? null : { from: 'col', id };
      draw();
    });
    s.appendChild(t); colEls[id] = t;
  });
  if (holdId && u.includes(holdId) && !st.deck.includes(holdId)) { held = { from: 'col', id: holdId }; META.markSeen(holdId); }
  draw();
  whenModels(() => { for (const t of [...deckEls, ...Object.values(colEls)]) { const im = t.querySelector('img'), id = t.dataset.id; if (im && id) im.src = creepPic(id, 200); } });
}
function flash(t) { t.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,1.6,.5,1)' }); }

// Heroes: the nine, locked ones dark with the mark that opens them; the picked one live beside his kit
async function showHeroes(focusId) {
  const s = newScreen('heroes'); setBack('home'); clear3(); island.visible = true;
  const st = META.state, u = META.unlocked().heroes; let cur = typeof focusId === 'string' && SB.HEROES.some(h => h.id === focusId) ? focusId : st.hero;
  s.appendChild(backBtn(() => showHome()));
  const tiles = [];   // in the order they open: yours first, then by the road mark that opens each
  SB.HEROES.slice().sort((a, b) => (META.markFor(a.id) || 0) - (META.markFor(b.id) || 0)).forEach((h, i) => {
    const ok = u.includes(h.id), t = el('div', 'ht tap in-pop' + (ok ? '' : ' lock'), '', at(124 + (i % 3) * 102, 10 + Math.floor(i / 3) * 124, 96, 116) + delay(i * 25)); t.dataset.id = h.id;
    const img = el('img'); setImg(img, heroPic(h.id)); t.appendChild(img);
    t.appendChild(ok ? el('div', 'nm o', h.name) : el('div', 'mk', SVG.trophy + META.markFor(h.id)));
    if (ok && !st.seen.includes(h.id)) t.appendChild(el('div', 'dot'));
    onTap(t, () => { snd('card_tap'); show(h.id); });
    s.appendChild(t); tiles.push(t);
  });
  const info = el('div', 'at in-right hinfo', '', at(626, 10, 196) + delay(120)); s.appendChild(info);
  const pick = btn('gold', 'Pick', at(626, 306, 196, 62) + 'font-size:24px', () => { if (META.setHero(cur)) { META.markSeen(cur); showHome(); } }, 'ui_play'); pick.id = 'mPick'; s.appendChild(pick);
  const hit = el('div', 'at tap', '', at(448, 40, 180, 300)); s.appendChild(hit); dragTurn(hit, () => heroes3[0]);
  camAim = () => aim(new THREE.Vector3(0, .8, 0), 538, 200, 120, 14);
  let token = 0;
  async function show(id) {
    cur = id; const h = SB.HEROES.find(x => x.id === id), ok = u.includes(id); tiles.forEach(t => t.classList.toggle('on', t.dataset.id === id));
    info.innerHTML = `<div class="title o" style="font-size:26px">${h.name}</div><div class="kit o" style="margin-top:4px"><b>${SB.hpOf ? SB.hpOf(h) : h.hp} health</b></div>` +
      `<div class="kit" style="margin-top:6px"><b class="o">${h.adesc.split(':')[0]}</b>${SB.say(h, h.adesc).split(':').slice(1).join(':').trim()}</div>` +
      `<div class="kit" style="margin-top:6px"><b class="o">${h.sup.name}</b>${SB.say(h, h.sup.desc).split(':').slice(1).join(':').trim()}</div>`;
    pick.style.display = ok ? '' : 'none';
    if (!ok) { info.insertAdjacentHTML('beforeend', `<div class="kit o" style="margin-top:8px;display:flex;align-items:center;gap:4px;font-size:16px">${SVG.trophy.replace('<svg', '<svg width="24" height="24"')} ${META.markFor(id)}</div>`); }
    if (ok) META.markSeen(id);
    const my = ++token; const v = await liveHero(id); if (my !== token || screen !== 'heroes') return;
    for (const o of heroes3) scene3.remove(o.grp); heroes3 = [v]; v.grp.scale.setScalar(1.25); scene3.add(v.grp);
    if (!ok) v.grp.traverse(o => { if (o.isMesh && !o.userData.isHull && o.material && o.material.isMaterial) { o.material = o.material.clone(); o.material.color = new THREE.Color(0x2a2232); o.material.map = null; } });
  }
  show(cur);
}

// Result: banner and trophy change at top left, your team big, the road bar filling (Brawl Stars end screen)
async function showResult(rec, G) {
  const out = rec.result, s = newScreen('result'); setBack('result', out); clear3(); island.visible = true;
  const ban = el('div', 'at in-left', `<div class="banner ${out}"><span class="big">${out === 'win' ? 'Victory!' : out === 'loss' ? 'Defeat' : 'Draw'}</span></div>`, at(62, 16)); s.appendChild(ban);
  const dl = el('div', 'at delta o in-fade' + (rec.delta < 0 ? ' neg' : ''), SVG.trophy + '<span>0</span>', at(70, 100) + delay(500)); s.appendChild(dl);
  const rb = roadBar(62, 300, 400, rec.before); rb.classList.add('in-rise'); rb.style.cssText += delay(600); s.appendChild(rb);
  music(out === 'win' ? 'stinger_win' : out === 'loss' ? 'stinger_lose' : 'menu', 'menu');
  const home = btn('ink', 'Home', at(486, 304, 130, 62) + 'font-size:20px;visibility:hidden', () => next(() => showHome())); home.id = 'mHome'; s.appendChild(home);
  const again = btn('gold play', '<span>Play again</span>', at(632, 296, 180, 74) + 'font-size:22px;visibility:hidden', () => next(play_), 'play_press'); again.id = 'mAgain'; s.appendChild(again);
  let skip = false; s.addEventListener('pointerdown', () => { skip = true; });
  const queueReveal = rec.unlocks.slice();
  const next = then => { if (queueReveal.length) showReveal(queueReveal.shift(), () => next(then)); else then(); };
  // heroes: your three, you in the middle
  const team = G && G.heroes ? G.heroes.filter(h => h.team === G.me.team) : [];
  const ids = team.length ? [team.find(h => h === G.me), ...team.filter(h => h !== G.me)].map(h => h.def.id) : [META.state.hero];
  const pos = [[0, 0, 1.2], [-1.55, -.8, 1], [1.55, -.8, 1]];
  camAim = () => aim(new THREE.Vector3(0, .8, -.3), 630, 190, 118, 13);
  ids.forEach(async (id, i) => { const v = await liveHero(id, { cheer: out === 'win' ? 1.6 + i * .3 : 0 }); if (screen !== 'result') return; v.grp.position.set(pos[i][0], 0, pos[i][1]); v.grp.scale.setScalar(pos[i][2]); v.face = -pos[i][0] * .18; v.born = clock.t + .25 + i * .12; scene3.add(v.grp); heroes3.push(v); });
  // count-up, then the bar
  const t0 = performance.now(), num = dl.querySelector('span'), n = rec.delta;
  await new Promise(ok => { const step = () => { const k = skip ? 1 : Math.min(1, Math.max(0, (performance.now() - t0 - 700) / 600)); const v = Math.round(n * k); num.textContent = (n > 0 ? '+' : n < 0 ? '' : '') + v; if (k >= 1) ok(); else { if (Math.round(n * k) % 3 === 0 && k > 0) snd('trophy_tick'); requestAnimationFrame(step); } }; step(); });
  const t1 = performance.now(); if (rec.after !== rec.before) snd('road_fill');
  await new Promise(ok => { const step = () => { const k = skip ? 1 : Math.min(1, (performance.now() - t1) / 800), e = 1 - (1 - k) * (1 - k), tt = rec.before + (rec.after - rec.before) * e; rb.set(rec.crossed.length && tt >= rec.crossed[0].at ? rec.crossed[0].at - .01 : tt); if (k >= 1) ok(); else requestAnimationFrame(step); }; step(); });
  if (screen !== 'result') return;
  if (rec.crossed.length) { rb.set(rec.crossed[0].at - .01); rb.querySelector('.trk').classList.add('flash'); snd('level_up'); await new Promise(ok => setTimeout(ok, skip ? 200 : 700)); if (screen !== 'result') return; showReveal(queueReveal.shift(), () => showResultAfter(rec, G, queueReveal)); return; }
  rb.set(rec.after);
  for (const b of [home, again]) { b.style.visibility = ''; b.classList.add('in-pop'); }
}
// after a reveal: back to the result's end state
function showResultAfter(rec, G, rest) {
  if (rest.length) return showReveal(rest.shift(), () => showResultAfter(rec, G, rest));
  showResult({ ...rec, unlocks: [], crossed: [], before: rec.after, delta: rec.delta, _again: true }, G).then(() => { });
}

// Unlock reveal: the seed shakes, bursts, the new one turns in big on the left, its name stamps in on the right
async function showReveal(r, then) {
  const hero = r.type === 'hero', s = newScreen('reveal'); setBack('reveal', hero ? 'hero' : ''); clear3();
  META.markSeen(r.id);
  const pod = makeSeed(); scene3.add(pod); extras.push(pod);
  camAim = () => aim(new THREE.Vector3(0, .78, 0), 268, 206, hero ? 190 : 165, 9);
  const txt = el('div', 'at', '', at(470, 60, 350)); s.appendChild(txt);
  const main = btn('gold', hero ? 'Pick' : 'Add to deck', at(632, 300, 180, 66) + 'font-size:22px;visibility:hidden', () => { if (hero) { META.setHero(r.id); } leave(hero ? null : r.id); }, 'ui_play'); main.id = 'mMain';
  const later = btn('ink', 'Later', at(486, 304, 130, 62) + 'font-size:20px;visibility:hidden', () => leave(null)); later.id = 'mLater';
  s.append(main, later);
  const hit = el('div', 'at tap', '', at(150, 40, 300, 320)); s.appendChild(hit);
  let opened = false, fast = false; hit.addEventListener('pointerdown', () => { fast = true; });
  function leave(deckId) { if (deckId) showDeck(deckId); else then(); }
  const t0 = performance.now(), T = k => fast ? k * .35 : k;
  // shakes
  for (const at_ of [300, 700, 1100]) { await waitUntil(() => performance.now() - t0 > T(at_)); pod.userData.shake = performance.now(); snd('unlock_shake'); }
  await waitUntil(() => performance.now() - t0 > T(1400)); if (screen !== 'reveal') return;
  scene3.remove(pod); burst(); snd('unlock_burst'); opened = true;
  // the reward
  let model;
  if (hero) { const v = await liveHero(r.id, { ring: false }); v.grp.scale.setScalar(1.25); v.turnIn = clock.t; heroes3.push(v); model = v.grp; dragTurn(hit, () => v); }
  else { const g = liveCreep(r.id, 0, 0, 0); const ti = g.userData.ti; g.scale.setScalar(Math.min(2.4, 1.5 / Math.max(.6, CREEP_W[ti] * 1.5))); g.userData.turnIn = clock.t; slots.push(g); model = g;
    const v = { turn: 0, h: {}, grp: g }; dragTurn(hit, () => null); }
  if (screen !== 'reveal') return; scene3.add(model); model.userData.spinIn = clock.t;
  await new Promise(ok => setTimeout(ok, fast ? 150 : 450));
  const kindTag = hero ? '<div class="tag">Hero</div>' : `<div class="tag">${BODY_NAMES[META.parse(r.id).tier]}</div><div class="tag">${KIND_NAMES[META.parse(r.id).kind]}</div><div class="tag cost">${costOf(r.id)}</div>`;
  txt.innerHTML = `<div class="newtag in-left"><span>${hero ? 'New hero!' : 'New creep!'}</span></div><div class="rname big stamp" style="margin-top:12px;animation-delay:.15s">${nameOf(r.id)}</div><div class="tags in-fade" style="margin-top:12px;animation-delay:.35s">${kindTag}</div>`;
  await new Promise(ok => setTimeout(ok, fast ? 150 : 500));
  for (const b of [main, later]) { b.style.visibility = ''; b.classList.add('in-pop'); }
}
const waitUntil = f => new Promise(ok => { const k = () => f() ? ok() : requestAnimationFrame(k); k(); });
function makeSeed() {
  const g = new THREE.Group(), P = LOOK.palette;
  const seed = new THREE.Mesh(new THREE.SphereGeometry(.7, 32, 24), LOOK.toonMaterial({ color: P.seed })); seed.scale.set(.85, 1.12, .85); seed.position.y = .82; g.add(seed);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 10, 40), LOOK.toonMaterial({ color: P.seedDark })); band.rotation.x = Math.PI / 2; band.position.y = .68; g.add(band);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 10), LOOK.toonMaterial({ color: P.leaf })); leaf.position.set(.12, 1.72, 0); leaf.rotation.z = -.5; g.add(leaf);
  const leaf2 = leaf.clone(); leaf2.position.set(-.12, 1.68, 0); leaf2.rotation.z = .6; g.add(leaf2);
  LOOK.addOutline(g, 2.6); g.userData = { seed: true, shake: 0 }; return g;
}
let parts = [];
function burst() {
  const geo = new THREE.IcosahedronGeometry(.11, 0), cols = [0xffc83d, 0xfff0a0, 0x6cc84a, 0xf2b640];
  for (let i = 0; i < 34; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: cols[i % 4] })), a = Math.random() * 6.283, sp = 2 + Math.random() * 3;
    m.position.set(0, .9, 0); m.userData = { v: new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 4, Math.sin(a) * sp * .5), life: .7 + Math.random() * .4 };
    scene3.add(m); parts.push(m);
  }
}
function tickParts(dt) { for (let i = parts.length - 1; i >= 0; i--) { const m = parts[i], u = m.userData; u.life -= dt; if (u.life <= 0) { scene3.remove(m); parts.splice(i, 1); continue; } u.v.y -= 9 * dt; m.position.addScaledVector(u.v, dt); m.scale.setScalar(Math.min(1, u.life / .25)); m.rotation.x += dt * 6; } }

// Settings: sound, and reset progress behind a hold
function showSettings() {
  const prev = screen, s = box.firstChild, layer = el('div', 'at', '', at(0, 0, BW, BH)); s.appendChild(layer);
  const dim = el('div', 'dim in-fade'); layer.appendChild(dim);
  const p = el('div', 'panel in-pop', '', at(237, 66, 400, 250)); layer.appendChild(p);
  p.appendChild(el('div', 'row o', '<span style="font-size:24px">Settings</span>'));
  const r1 = el('div', 'row o', '<span>Sound</span>'), sw = el('div', 'sw tap' + (META.state.settings.sound ? ' on' : ''), '<i></i>'); r1.appendChild(sw); p.appendChild(r1);
  onTap(sw, e => { e.stopPropagation(); META.state.settings.sound = !META.state.settings.sound; META.save(); sw.classList.toggle('on', META.state.settings.sound); applySound(); snd('menu_tap'); }); sw.id = 'mSound';
  const r0 = el('div', 'row o', '<span>Music</span>'), mw = el('div', 'sw tap' + (META.state.settings.music ? ' on' : ''), '<i></i>'); r0.appendChild(mw); p.insertBefore(r0, r1); mw.id = 'mMusic';
  onTap(mw, e => { e.stopPropagation(); META.state.settings.music = !META.state.settings.music; META.save(); mw.classList.toggle('on', META.state.settings.music); applySound(); snd('menu_tap'); });
  const r2 = el('div', 'row o', '<span>Reset progress</span>'), hold = el('div', 'tap mb red hold', '<div class="bar"></div><span style="position:relative">Hold</span>', 'position:relative;width:110px;height:44px'); r2.appendChild(hold); p.appendChild(r2);
  let ht = null, h0 = 0; const bar = hold.firstChild;
  const stop = () => { hold.classList.remove('down'); if (ht) cancelAnimationFrame(ht); ht = null; bar.style.width = '0'; };
  hold.addEventListener('pointerdown', e => { e.stopPropagation(); hold.classList.add('down'); h0 = performance.now(); const k = () => { const f = (performance.now() - h0) / 1500; bar.style.width = Math.min(100, f * 100) + '%'; if (f >= 1) { stop(); META.reset(); snd('ui_play'); firstRun(); } else ht = requestAnimationFrame(k); }; k(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, stop);
  const x = btn('ink', '<span class="o" style="font-size:22px">X</span>', at(604, 50, 46, 46) + 'border-radius:23px', () => layer.remove()); layer.appendChild(x);
  onTap(dim, () => { snd('menu_tap'); layer.remove(); });
}

// ---- into a match and back out
function play_() {
  const ms = META.matchStart(SB.HEROES); pending = ms;
  active = false; root.hidden = true; back.hidden = true; clear3(); screen = ''; const lb = $('labels'); if (lb) lb.style.visibility = '';
  V.startMatch(ms.heroIndex, false, { deck: ms.deck, pool: ms.pool, botLevel: ms.botLevel, heroes: ms.heroes });
}
function outcomeOf(G) {
  const r = G.result; if (r && typeof r === 'object') return !r.winner ? 'draw' : (r.mine !== undefined ? (r.mine ? 'win' : 'loss') : (r.winner === G.me.team ? 'win' : 'loss'));
  const o = G.over; if (o === 'Draw') return 'draw'; const w = o === 'Blue wins' ? 1 : 2; return w === G.me.team ? 'win' : 'loss';
}
const handled = new WeakSet(); let endAt = 0, endG = null;
function watch() {   // called every frame while a match runs
  const G = SB.G; if (!G || !G.over || handled.has(G)) { if (endG && performance.now() > endAt) { const g = endG; endG = null; finish(g); } return; }
  handled.add(G); endG = G; endAt = performance.now() + 1100;
  const ov = $('over'); if (ov) ov.style.visibility = 'hidden';
}
function finish(G) {
  const ov = $('over'); if (ov) { ov.hidden = true; ov.style.visibility = ''; }
  const hud = $('hud'); if (hud) hud.hidden = true; const es = $('endStamp'); if (es) es.hidden = true;
  const rec = META.record(outcomeOf(G)); lastOutcome = rec;
  enterMenu(); showResult(rec, G);
}
function enterMenu() { music('menu'); active = true; root.hidden = false; back.hidden = false; const lb = $('labels'); if (lb) lb.style.visibility = 'hidden'; const p = $('pick'); if (p) p.hidden = true; layout(); }
function firstRun() {
  enterMenu(); const s = newScreen('splash'); setBack('home'); clear3();
  s.appendChild(el('div', 'at splash', '<div class="big stamp">Seed Brawl</div>', at(0, 120, BW, 120)));
  setTimeout(() => { if (screen === 'splash') play_(); }, 900);
}

// ---- the frame while a screen is up
let lastT = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now; clock.t += dt;
  layout(); if (camAim) camAim();
  for (const v of heroes3) tickLive(v, dt);
  for (const g of slots) { tickCreep(g); const u = g.userData; if (u.born) { const k = Math.min(1, Math.max(0, (clock.t - u.born) / .3)); g.scale.setScalar((g.userData.base || (g.userData.base = g.scale.x)) * (k < 1 ? 1 - Math.pow(1 - k, 3) * (1 - .0001) : 1)); g.visible = clock.t >= u.born; }
    if (u.spinIn !== undefined) { const k = Math.min(1, (clock.t - u.spinIn) / .6), e = 1 - Math.pow(1 - k, 3); g.rotation.y = -Math.PI * 2 * (1 - e) + Math.sin(clock.t * .8) * .25 * e; } }
  for (const v of heroes3) if (v.turnIn !== undefined) { const k = Math.min(1, (clock.t - v.turnIn) / .6), e = 1 - Math.pow(1 - k, 3); v.face = -Math.PI * 2 * (1 - e); }
  for (const x of extras) if (x.userData.seed) { const a = (performance.now() - x.userData.shake) / 300, k = a < 1 ? Math.sin(a * Math.PI * 4) * (1 - a) : 0; x.rotation.z = k * .35; x.position.y = Math.abs(k) * .1; x.rotation.y += dt * .6; }
  tickParts(dt);
  // creeps whose real model arrived after they were placed get swapped in
  for (let i = 0; i < slots.length; i++) { const g = slots[i], u = g.userData; if (!u.real && u.id && UNITS.model(META.parse(u.id).kind, u.ti)) { const n = liveCreep(u.id, u.x, u.z, u.face); scene3.remove(g); scene3.add(n); slots[i] = n; } }
  W.tickAll(scene3, clock.t, dt);
  const r = V.renderer; r.setClearColor(0, 0); r.clear(); r.render(scene3, cam3);
}

// ---- keyboard: Enter is the gold button, Escape goes back
function onKey(e) {
  if (!active) return; const k = e.key;
  if (k === 'Enter') { const g = box.querySelector('#mPlay,#mAgain,#mMain,#mPick'); if (g && g.style.visibility !== 'hidden') { e.preventDefault(); e.stopImmediatePropagation(); g.click(); } }
  else if (k === 'Escape' && screen !== 'home') { e.preventDefault(); e.stopImmediatePropagation(); showHome(); }
  else e.stopImmediatePropagation();
}

// ---- start: main.js calls this from its MENU HOOK block with the pieces of the game it shares
export async function init(view) {
  V = view; THREE = V.THREE; LOOK = V.LOOK; UNITS = V.UNITS; W = V.W;
  const qs = new URLSearchParams(location.search);
  if (qs.has('hero') || qs.has('nomenu')) {   // the old test paths (lanes-shot, clips) open a match directly: no menu
    return;
  }
  back = el('div'); back.id = 'menuBack'; stage.insertBefore(back, stage.firstChild);
  root = el('div'); root.id = 'menu'; box = el('div', 'mbox'); root.appendChild(box); stage.appendChild(root);
  init3(); META.load(); applySound(); layout(); addEventListener('resize', layout); addEventListener('keydown', onKey, true);
  if (qs.has('meta')) { META.setTrophies(+qs.get('meta') || 0); META.state.firstRun = false; META.save(); }
  const loop = (a, b, c) => { if (active) frame(); else { V.frame(a, b, c); watch(); } };
  V.renderer.setAnimationLoop(loop);
  if (window.GAME) window.GAME.hold = v => V.renderer.setAnimationLoop(v ? null : loop);
  window.SBL_MENU = { show, meta: META, get screen() { return screen; }, get active() { return active; }, test: {
    end(result) { const G = SB.G; if (!G || G.over) return false; const me = G.me.team, other = me === 1 ? 2 : 1, w = result === 'draw' ? 0 : result === 'win' ? me : other;
      G.over = w === 0 ? 'Draw' : w === 1 ? 'Blue wins' : 'Red wins'; G.result = { winner: w, by: 'base', base: [G.base[1].hp, G.base[2].hp], mine: w === me }; return true; } } };
  const p = $('pick'); if (p) p.hidden = true;
  const first = qs.get('menu');
  if (first) return show(first);
  if (META.state.firstRun) firstRun(); else { enterMenu(); showHome({ hand: META.state.played === 1 }); }
}
// for screenshots and tests: ?menu=home | road | deck | heroes | settings | result-win | result-loss | reveal:<id>
function show(name) {
  enterMenu(); const [n, arg] = String(name).split(':');
  if (n === 'home') return showHome(); if (n === 'road') return showRoad(); if (n === 'deck') return showDeck(arg); if (n === 'heroes') return showHeroes(arg);
  if (n === 'settings') { showHome(); return setTimeout(showSettings, 50); }
  if (n === 'first') return firstRun();
  if (n.startsWith('result')) { const out = n.split('-')[1] || 'win', t = META.state.trophies, nx = META.next(t), after = out === 'win' ? t + 30 : Math.max(META.floor(), t - 12);
    const crossed = nx && after >= nx.at ? [nx] : []; return showResult({ result: out, before: t, after, delta: after - t, crossed, unlocks: crossed.flatMap(c => c.rewards) }, null); }
  if (n === 'reveal') { const id = arg || 'thorn_3'; return showReveal({ type: SB.HEROES.some(h => h.id === id) ? 'hero' : 'creep', id }, () => showHome()); }
  return showHome();
}
