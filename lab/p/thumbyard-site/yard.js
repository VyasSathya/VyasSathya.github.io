// The yard in 3D. The fingerprint hill (same geometry as brand/kit/src/fingerprint.py) is built as round clay
// ridges that rise out of the flat mark, the thumbling stands on its crest, the flag flies, and every product
// on the page has a small flag of its own colour planted on the hill.
// Loads after first paint. The flat hill and the 2D thumbling stay when motion is reduced, the connection is
// slow or there is no WebGL. Rendering stops when the yard is off screen or the tab is hidden.
const yard = document.getElementById('yard');
const stage = document.getElementById('stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

if (yard && stage && !reduce && !slow && hasWebGL() && !/[?&]still\b/.test(location.search)) {
  const go = () => start().catch((e) => console.warn('the yard stays flat:', e));
  const later = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200));
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}

// ---- the fingerprint, 512 frame (fingerprint.py). World: x right, y up (= -svg y), z toward the viewer.
const W = 22, CX = 254, CY0 = 330, STEP_X = 33, STEP_Y = 37, RISE = 4;
const ARCS = [
  [6, 204, 336, 'hill'], [5, 178, 362, 'hill'], [4, 236, 388, 'hill'], [4, 150, 222, 'ink'],
  [3, 160, 300, 'ink'], [3, 316, 410, 'ink'], [3, 116, 146, 'ink'],
];
const ring = (k) => [CX, CY0 - RISE * k, 20 + STEP_X * k, 24 + STEP_Y * k];
const DEPTH = 9;                       // how far each ring steps toward the viewer
const zOf = (k) => (6 - k) * DEPTH;
const TOP_Y = -(ring(6)[1] - ring(6)[3]);   // world y of the crest line
const SVG_SCALE = 2.35;                // hill_svg() in build_site.py
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

async function start() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');

  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'yard3d';
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(18, 1, 10, 6000);

  // light: soft sky, a frontal key, and one sun from above that throws the thumbling's shadow down the ridges
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0xc9a77f, 1.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(CX - 260, 420, 1500);
  key.target.position.set(CX, -220, 0);
  scene.add(key, key.target);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.05);
  sun.position.set(CX - 150, 620, 330);
  sun.target.position.set(CX + 20, -200, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -330; sc.right = 330; sc.top = 380; sc.bottom = -380; sc.near = 50; sc.far = 1600;
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 1.2; sun.shadow.radius = 5;
  scene.add(sun, sun.target);

  // everything turns a little around the middle of the hill
  const pivot = new THREE.Group();
  const PIV = new THREE.Vector3(CX, -250, 20);
  pivot.position.copy(PIV);
  scene.add(pivot);
  const world = new THREE.Group();
  world.position.copy(PIV).multiplyScalar(-1);
  pivot.add(world);

  // ---- ridges
  const css = getComputedStyle(document.documentElement);
  const tok = (n, d) => (css.getPropertyValue(n).trim() || d);
  const MOSS = '#6E8E2E', ACCENT = '#D9472F';
  const mossMat = new THREE.MeshStandardMaterial({ color: MOSS, roughness: 0.82, metalness: 0 });
  const inkMat = new THREE.MeshStandardMaterial({ color: tok('--ridge', '#2A231C'), roughness: 0.7, metalness: 0 });
  const paint = () => inkMat.color.set(getComputedStyle(document.documentElement).getPropertyValue('--ridge').trim() || '#2A231C');
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  class ArcCurve3 extends THREE.Curve {
    constructor(k, a0, a1) { super(); this.k = k; this.a0 = a0 * Math.PI / 180; this.a1 = a1 * Math.PI / 180; }
    getPoint(t, out = new THREE.Vector3()) {
      const [cx, cy, rx, ry] = ring(this.k);
      const a = this.a0 + (this.a1 - this.a0) * t;
      return out.set(cx + rx * Math.cos(a), -(cy + ry * Math.sin(a)), zOf(this.k));
    }
  }
  class CoreCurve extends THREE.Curve {   // the whorl: an elliptical spiral from ring 0.3 to ring 2
    getPoint(t, out = new THREE.Vector3()) {
      const k0 = 0.3, k1 = 2.0, tEnd = 214 * Math.PI / 180;
      const k = k0 + (k1 - k0) * t;
      const a = tEnd - 2 * Math.PI * (k1 - k);
      const [cx, cy, rx, ry] = ring(k);
      return out.set(cx + rx * Math.cos(a), -(cy + ry * Math.sin(a)), zOf(k));
    }
  }
  const R = W / 2;
  const capGeo = new THREE.SphereGeometry(R, 20, 14);
  const ridges = new THREE.Group();     // scaled in z from flat to full relief
  world.add(ridges);
  function ridge(curve, mat) {
    const len = curve.getLength();
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, Math.round(len / 5)), R, 18, false), mat);
    tube.castShadow = true; tube.receiveShadow = true;
    ridges.add(tube);
    for (const t of [0, 1]) {
      const cap = new THREE.Mesh(capGeo, mat);
      cap.position.copy(curve.getPoint(t));
      cap.castShadow = true; cap.receiveShadow = true;
      ridges.add(cap);
    }
  }
  ridge(new CoreCurve(), inkMat);
  for (const [k, a0, a1, role] of ARCS) ridge(new ArcCurve3(k, a0, a1), role === 'hill' ? mossMat : inkMat);

  // a point on ring k at svg angle deg, and the outward normal there
  function onRing(k, deg) {
    const [cx, cy, rx, ry] = ring(k), a = deg * Math.PI / 180;
    const p = new THREE.Vector3(cx + rx * Math.cos(a), -(cy + ry * Math.sin(a)), zOf(k));
    const n = new THREE.Vector3(Math.cos(a) / rx, -Math.sin(a) / ry, 0).normalize();
    return { p, n };
  }

  // grass tufts on the crest ridge, where the mark has them
  const blade = new THREE.ConeGeometry(1, 1, 7);
  blade.translate(0, 0.5, 0);
  function tuft(deg, flip) {
    const { p, n } = onRing(6, deg);
    const g = new THREE.Group();
    g.position.copy(p).addScaledVector(n, R * 0.55);
    for (const [dx, h, half] of [[-11, 17, 4.5], [1, 25, 5], [12, 14, 4]]) {
      const m = new THREE.Mesh(blade, mossMat);
      m.position.x = (flip ? -1 : 1) * dx;
      m.scale.set(half, h, half * 0.8);
      m.rotation.z = (flip ? 1 : -1) * 0.1;
      m.castShadow = true;
      g.add(m);
    }
    world.add(g);
    return g;
  }
  const tufts = [tuft(230, false), tuft(312, true)];

  // ---- flags: a pole and a pennant that ripples
  function pennant(w, h, color) {
    const N = 14, pos = new Float32Array((N + 1) * 2 * 3), idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, hh = (1 - u) * h / 2;
      pos.set([u * w, hh, 0, u * w, -hh, 0], i * 6);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide }));
    m.castShadow = true;
    m.userData = { w, N, phase: Math.random() * 6 };
    return m;
  }
  function ripple(m, t, gust) {
    const { w, N, phase } = m.userData, p = m.geometry.attributes.position;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const z = Math.sin(u * 4.6 - t * 5.2 + phase) * w * 0.11 * u * gust;
      p.setZ(i * 2, z); p.setZ(i * 2 + 1, z);
    }
    p.needsUpdate = true;
    m.geometry.computeVertexNormals();
  }
  function flag(base, up, poleH, poleR, w, h, poleMat, color) {
    const g = new THREE.Group();
    g.position.copy(base);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(poleR, poleR, poleH, 12), poleMat);
    pole.position.y = poleH / 2; pole.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(poleR, 12, 8), poleMat);
    knob.position.y = poleH;
    const cloth = pennant(w, h, color);
    cloth.position.set(poleR * 0.6, poleH - h / 2 - poleR * 0.4, 0);
    g.add(pole, knob, cloth);
    g.userData = { cloth, bounce: 0 };
    world.add(g);
    return g;
  }
  // the yard's own flag, where hill_svg() draws it
  const mainFlag = flag(new THREE.Vector3(CX - 150 / SVG_SCALE, TOP_Y - 32 / SVG_SCALE + R * 0.4, 0), new THREE.Vector3(0, 1, 0),
    150 / SVG_SCALE + 6, 2.7, 66 / SVG_SCALE, 44 / SVG_SCALE, mossMat, ACCENT);

  // one small flag per product on the page, in the colour of its plot
  const plots = [...document.querySelectorAll('.plot')];
  const inkPole = inkMat;
  const SLOTS = [[6, 236], [6, 302], [5, 246], [5, 296], [4, 270], [4, 246], [4, 294], [5, 271]];   // all inside the part of the hill a narrow yard shows
  const flags = plots.slice(0, SLOTS.length).map((li, i) => {
    const [k, deg] = SLOTS[i];
    const { p, n } = onRing(k, deg);
    const up = n.clone().lerp(new THREE.Vector3(0, 1, 0), 0.55).normalize();
    const color = (li.style.getPropertyValue('--flag') || '').trim() || ACCENT;
    const base = p.clone().addScaledVector(n, R * 0.45); base.z += R * 0.95;   // on the front of its ridge, clear of the one behind
    const f = flag(base, up, 44, 1.9, 23, 15, inkPole, color);
    f.userData.li = li;
    f.userData.href = (li.querySelector('a.name') || {}).href;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(17, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 30; hit.userData.flag = f;
    f.add(hit);
    f.userData.hit = hit;
    return f;
  });
  const allFlags = [mainFlag, ...flags];

  // ---- the thumbling
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('models/thumbling-wave.glb', document.baseURI).href);
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true;
    if (o.material) { o.material.normalMap = null; o.material.needsUpdate = true; }   // the carved belly whorl reads softer
  });
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  model.scale.setScalar(s);
  model.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  const root = new THREE.Group();        // look, hop, squash, spin
  root.add(model);
  const thumb = new THREE.Group();       // place and size on the crest
  thumb.add(root);
  thumb.position.set(CX + 22, TOP_Y + R * 0.72, 4);
  world.add(thumb);

  // his hello: a short talking clip (made from the same model, on blue) keyed into the scene in his place.
  // Loaded on the first tap. Frame 1024 px, he stands 880 px tall with 40 px under his feet.
  let talking = false, helloVideo = null, helloPlane = null;
  function hello() {
    if (talking) return true;
    if (!helloVideo) {
      const v = document.createElement('video');
      v.src = new URL('models/hello.mp4', document.baseURI).href;
      v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.NoColorSpace;   // passed straight through, the clip is already display colour
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex } }, transparent: true, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D map; varying vec2 vUv;
          void main(){
            vec4 c = texture2D(map, vUv);
            float other = max(c.r, c.g);
            float a = 1.0 - smoothstep(0.03, 0.2, c.b - other);
            c.b = min(c.b, other);
            gl_FragColor = vec4(c.rgb, a);
          }`,
      });
      helloPlane = new THREE.Mesh(new THREE.PlaneGeometry(1024 / 880, 1024 / 880), mat);
      helloPlane.position.set(0, 512 / 880 - 40 / 880, 0.02);
      helloPlane.visible = false;
      thumb.add(helloPlane);
      v.addEventListener('playing', () => { talking = true; });
      const done = () => { if (talking) { talking = false; hop = 1; if (wave) { wave.reset(); wave.play(); } } };
      v.addEventListener('ended', done); v.addEventListener('pause', done); v.addEventListener('error', done);
      helloVideo = v;
    }
    try { helloVideo.currentTime = 0; } catch (e) { /* not loaded yet */ }
    const p = helloVideo.play();
    if (p && p.catch) p.catch(() => { talking = false; hop = 1; if (wave) { wave.reset(); wave.play(); } });
    return true;
  }
  window.__hello = hello;

  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  const wave = clip ? mixer.clipAction(clip) : null;
  if (wave) { wave.setLoop(THREE.LoopOnce, 1); wave.clampWhenFinished = true; }
  const head = model.getObjectByName('Head');
  const neck = model.getObjectByName('neck');
  const rest = [head, neck].filter(Boolean).map((b) => [b, b.quaternion.clone()]);

  // ---- fit: the 3D hill lands exactly on the flat one it replaces
  const hillSvg = yard.querySelector('.hill');
  yard.appendChild(canvas);
  let ppu = 1;
  const centre = new THREE.Vector3();
  function fit() {
    const yr = yard.getBoundingClientRect();
    const w = Math.max(1, yr.width), h = Math.max(1, yr.height);
    renderer.setSize(w, h, false);
    const hr = hillSvg.getBoundingClientRect();
    const k = hr.width / 1000;
    ppu = SVG_SCALE * k;
    const crestX = hr.left - yr.left + 500 * k, crestY = hr.top - yr.top + 300 * k;
    centre.set(CX + (w / 2 - crestX) / ppu, TOP_Y - (h / 2 - crestY) / ppu, 0);
    const dist = (h / ppu / 2) / Math.tan(cam.fov * Math.PI / 360);
    cam.aspect = w / h;
    cam.position.set(centre.x, centre.y, dist);
    cam.lookAt(centre.x, centre.y, 0);
    cam.near = Math.max(10, dist - 900); cam.far = dist + 1200;
    cam.updateProjectionMatrix();
    // he fills the sky above the crest without leaving the frame
    const room = crestY / ppu;
    thumb.scale.setScalar(Math.max(96, Math.min(214, room * 0.8)));
  }
  fit();
  new ResizeObserver(fit).observe(yard);

  // ---- pointer: he looks at it, the hill leans a little toward it, flags answer
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const lean = { x: 0, y: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  let hot = null, held = null;
  function screenOf(obj, dy = 0) {
    obj.getWorldPosition(tmp); tmp.y += dy; tmp.project(cam);
    const r = canvas.getBoundingClientRect();
    return [r.left + (tmp.x + 1) / 2 * r.width, r.top + (1 - tmp.y) / 2 * r.height];
  }
  function aimAt(x, y) {
    const [hx, hy] = screenOf(thumb, thumb.scale.y * 0.75);
    look.tx = Math.max(-1, Math.min(1, (x - hx) / (innerWidth * 0.4)));
    look.ty = Math.max(-1, Math.min(1, (y - hy) / (innerHeight * 0.55)));
  }
  function setHot(f) {
    if (hot === f) return;
    if (hot) hot.userData.li.classList.remove('hot');
    hot = f;
    if (hot) { hot.userData.li.classList.add('hot'); hot.userData.bounce = 1; }
    canvas.style.cursor = hot ? 'pointer' : '';
  }
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hits = ray.intersectObjects(flags.map((f) => f.userData.hit), false);
    return hits.length ? hits[0].object.userData.flag : null;
  }
  function overThumb(e) {
    const [hx, hy] = screenOf(thumb, thumb.scale.y * 0.5);
    const rad = thumb.scale.y * ppu * 0.42;
    return Math.hypot(e.clientX - hx, e.clientY - hy) < rad;
  }
  addEventListener('pointermove', (e) => {
    if (!held) aimAt(e.clientX, e.clientY);
    if (e.pointerType !== 'touch') {
      setHot(pick(e));
      if (!hot && !held) canvas.style.cursor = overThumb(e) ? 'grab' : '';
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { look.tx = 0; look.ty = 0; setHot(null); });

  // drag him to spin him, let go and he swings back; a tap makes him hop and wave
  const spin = { a: 0, v: 0 };
  let hop = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const f = pick(e);
    if (f) { held = { flag: f, x: e.clientX, y: e.clientY }; return; }
    if (overThumb(e)) {
      held = { x: e.clientX, y: e.clientY, last: e.clientX, moved: 0 };
      if (e.pointerType !== 'touch') { canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!held || held.flag) return;
    const dx = e.clientX - held.last;
    held.last = e.clientX; held.moved += Math.abs(dx);
    spin.a += dx * 0.012; spin.v = dx * 0.6;
  });
  function release(e) {
    if (!held) return;
    const h = held; held = null;
    canvas.style.cursor = '';
    if (h.flag) {
      if (Math.hypot(e.clientX - h.x, e.clientY - h.y) < 8 && h.flag.userData.href) location.href = h.flag.userData.href;
      return;
    }
    if (h.moved < 6) hello();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { held = null; });

  // a product row under the pointer or with focus: its flag jumps and he looks over at it
  let rowFlag = null;
  for (const f of flags) {
    const li = f.userData.li;
    const on = () => { rowFlag = f; f.userData.bounce = 1; };
    const off = () => { if (rowFlag === f) rowFlag = null; };
    li.addEventListener('pointerenter', on); li.addEventListener('pointerleave', off);
    li.addEventListener('focusin', on); li.addEventListener('focusout', off);
  }

  // ---- run
  let visible = true, running = false, last = performance.now(), t = 0, born = -1, waved = false;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; kick(); }).observe(yard);
  document.addEventListener('visibilitychange', kick);
  function kick() { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    if (born < 0) { born = t; yard.classList.add('live3d'); }
    const age = t - born;

    // the flat mark swells into ridges, then the flags and the tufts come up, then he lands
    const relief = 0.03 + 0.97 * ease((age - 0.25) / 1.1);
    ridges.scale.z = relief;
    for (const g of tufts) g.scale.setScalar(Math.max(0.001, back((age - 0.9) / 0.5)));
    allFlags.forEach((f, i) => {
      const u = f.userData;
      const up = back((age - 0.75 - i * 0.07) / 0.55);
      u.bounce = Math.max(0, u.bounce - dt * 1.8);
      const b = Math.sin(u.bounce * Math.PI * 3) * u.bounce;
      f.scale.set(1, Math.max(0.001, up) * (1 + b * 0.16), 1);
      ripple(u.cloth, t, 0.75 + 0.25 * Math.sin(t * 0.7 + i) + b * 1.5);
    });
    const land = (age - 1.15) / 0.6;
    const drop = land < 0 ? 1 : Math.max(0, 1 - ease(land));
    const squashIn = land > 0 && land < 1.6 ? Math.sin(Math.min(1, land / 1.6) * Math.PI * 2) * Math.exp(-land * 2.2) * 0.12 : 0;
    thumb.visible = land > -0.2;
    root.visible = !talking;
    if (helloPlane) helloPlane.visible = talking;
    if (!waved && land > 1 && wave) { waved = true; wave.play(); }

    for (const [b, q] of rest) b.quaternion.copy(q);
    mixer.update(dt);

    if (rowFlag && !held) { const [fx, fy] = screenOf(rowFlag, 30); aimAt(fx, fy); }
    look.x += (look.tx - look.x) * Math.min(1, dt * 5);
    look.y += (look.ty - look.y) * Math.min(1, dt * 5);
    if (!held || held.flag) { spin.v += (-spin.a * 60 - spin.v * 7) * dt; spin.a += spin.v * dt; }
    root.rotation.y = look.x * 0.32 + spin.a;
    if (head) { head.rotation.y += look.x * 0.25; head.rotation.x += look.y * 0.16; }
    if (neck) { neck.rotation.y += look.x * 0.15; }
    const breathe = 1 + Math.sin(t * 2.1) * 0.012;
    hop = Math.max(0, hop - dt * 2.2);
    const h = Math.sin(hop * Math.PI);
    root.position.y = h * 0.08 + drop * 1.6;
    const sq = breathe * (1 - h * 0.02) * (1 - squashIn);
    root.scale.set((1 / Math.sqrt(breathe)) * (1 + h * 0.03) * (1 + squashIn * 0.6), sq, (1 / Math.sqrt(breathe)) * (1 + squashIn * 0.6));

    // the hill leans with the pointer and turns a little as the page scrolls past it
    const scrolled = Math.min(1, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    const settle = ease((age - 0.2) / 1.4);
    lean.x += ((look.tx * 0.085 + (scrolled - 0.15) * 0.3) * settle - lean.x) * Math.min(1, dt * 3);
    lean.y += ((-look.ty * 0.04 - 0.07) * settle - lean.y) * Math.min(1, dt * 3);
    pivot.rotation.y = lean.x;
    pivot.rotation.x = lean.y;

    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  kick();
}
