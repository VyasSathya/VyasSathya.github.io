// The thumbling on the hill. Loads after first paint; the 2D thumbling stays when motion is reduced, the
// connection is slow or there is no WebGL. He waves once, then breathes and looks at the pointer or finger;
// a tap makes him wave again. Rendering stops when he is off screen or the tab is hidden.
const stage = document.getElementById('stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const slow = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

if (stage && !reduce && !slow && hasWebGL() && !/[?&]still\b/.test(location.search)) {
  const go = () => start().catch((e) => console.warn('thumbling stays 2D:', e));
  const later = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200));
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
}

async function start() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(20, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0xc9a77f, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-0.6, 1.2, 4); // mostly frontal: keeps the carved belly whorl soft
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff1dc, 0.7);
  rim.position.set(2, 1.5, -2);
  scene.add(rim);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(new URL('models/thumbling-wave.glb', document.baseURI).href);
  const root = new THREE.Group();
  const model = gltf.scene;
  root.add(model);
  scene.add(root);
  // no normal map: the carved belly whorl reads softer
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.normalMap = null; o.material.needsUpdate = true; } } });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  model.scale.setScalar(s);
  model.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  cam.position.set(0, 0.6, 3.55);
  cam.lookAt(0, 0.6, 0); // frame bottom sits just under his feet, so the stage's bottom edge is the ground

  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  const wave = clip ? mixer.clipAction(clip) : null;
  if (wave) { wave.setLoop(THREE.LoopOnce, 1); wave.clampWhenFinished = true; }
  const head = model.getObjectByName('Head');
  const neck = model.getObjectByName('neck');
  // the look is added on top of the pose each frame, from the bind pose when the clip has no track for the bone
  const rest = [head, neck].filter(Boolean).map((b) => [b, b.quaternion.clone()]);

  stage.appendChild(renderer.domElement);
  function fit() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    cam.aspect = r.width / Math.max(1, r.height);
    cam.updateProjectionMatrix();
  }
  fit();
  new ResizeObserver(fit).observe(stage);

  // where he looks: pointer anywhere on the page, finger on touch
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  function aim(e) {
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth * 0.45)));
    look.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight * 0.6)));
  }
  addEventListener('pointermove', aim, { passive: true });
  addEventListener('pointerdown', aim, { passive: true });
  document.addEventListener('pointerleave', () => { look.tx = 0; look.ty = 0; });

  let hop = 0;
  renderer.domElement.addEventListener('click', () => {
    hop = 1;
    if (wave) { wave.reset(); wave.play(); }
  });

  let visible = true, running = false, last = performance.now(), t = 0, first = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; kick(); }).observe(stage);
  document.addEventListener('visibilitychange', kick);
  function kick() { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    for (const [b, q] of rest) b.quaternion.copy(q);
    mixer.update(dt);
    look.x += (look.tx - look.x) * Math.min(1, dt * 5);
    look.y += (look.ty - look.y) * Math.min(1, dt * 5);
    root.rotation.y = look.x * 0.32;
    if (head) { head.rotation.y += look.x * 0.25; head.rotation.x += look.y * 0.16; }
    if (neck) { neck.rotation.y += look.x * 0.15; }
    const breathe = 1 + Math.sin(t * 2.1) * 0.012;
    hop = Math.max(0, hop - dt * 2.2);
    const h = Math.sin(hop * Math.PI);
    root.position.y = h * 0.08;
    root.scale.set(1 / Math.sqrt(breathe) * (1 + h * 0.03), breathe * (1 - h * 0.02), 1 / Math.sqrt(breathe));
    renderer.render(scene, cam);
    if (first) {
      first = false;
      stage.classList.add('live');
      if (wave) setTimeout(() => wave.play(), 450);
    }
    requestAnimationFrame(frame);
  }
  kick();
}
