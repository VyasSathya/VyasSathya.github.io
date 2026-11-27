/*
 * Thumbyard Replay for the web (canvas 2D and Three.js games).
 * Same behaviour and call names as the Unity package com.thumbyard.replay (camelCase here).
 * Classic script: sets window.ThumbyardReplay. In Node: module.exports (tests).
 *
 * Off by default. Nothing is allocated, no input is bound and nothing is drawn until the dev switch is on
 * (ThumbyardReplay.setDev(true), or the hidden switch). The switch is remembered in localStorage
 * under "thumbyard.replay.dev".
 *
 * Spec: C:/Dev/toybox/unity-kit/replay/SPEC.md. Needs: C:/Dev/toybox/unity-kit/replay/web-needs.md.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else if (root) root.ThumbyardReplay = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  var KEY = 'thumbyard.replay.dev';
  var MAGIC = 0x50525954; // "TYRP" little-endian
  var FORMAT_VERSION = 1;
  var EPS = 1e-4;

  // T slots (Float64Array per instance, so the record path stores no boxed numbers)
  var T_LAST = 0;   // time of the last recorded sample (s)
  var T_NOW = 1;    // latest time seen by update() or record() (s)
  var T_MOMENT = 2; // time of the kept moment (s)
  var T_UPD = 3;    // time of the last update() (s)
  var T_LOOP = 4;   // time of the last own-loop frame (s)
  var T_PROMPT = 5; // prompt visible until (s)

  var api = {};
  api.version = '1.0.0';
  api.storageKey = KEY;
  /** Optional storage override ({getItem, setItem}); default window.localStorage. */
  api.storage = null;
  /** Optional mobile check override (function returning bool); default reads navigator. */
  api.isMobile = null;

  var dev = { loaded: false, on: false };
  var taps = { n: 0, first: 0 };
  var instances = [];
  var current = null;

  function nowMs() {
    if (root && root.performance && typeof root.performance.now === 'function') return root.performance.now();
    return Date.now();
  }

  function store() {
    if (api.storage) return api.storage;
    try { return root && root.localStorage ? root.localStorage : null; } catch (e) { return null; }
  }

  function loadDev() {
    if (dev.loaded) return;
    dev.loaded = true;
    try {
      var s = store();
      dev.on = !!(s && s.getItem(KEY) === '1');
    } catch (e) {
      dev.on = false;
    }
  }

  /** True when the dev switch is on (remembered on this device). */
  api.isDev = function () { loadDev(); return dev.on; };

  /** Turn the dev switch on or off. Off ends any replay and frees every buffer. */
  api.setDev = function (on) {
    loadDev();
    on = !!on;
    try { var s = store(); if (s) s.setItem(KEY, on ? '1' : '0'); } catch (e) { /* storage blocked */ }
    var changed = dev.on !== on;
    dev.on = on;
    var list = instances.slice();
    for (var i = 0; i < list.length; i++) list[i]._devChanged(on, changed);
  };

  api.toggleDev = function () { api.setDev(!api.isDev()); };

  /** Hidden switch: five calls within 2 s toggle the dev switch. Call it from any widget. */
  api.tapCount = 5;
  api.tapWindowMs = 2000;
  api.holdSeconds = 3;
  api.registerTap = function (atMs) {
    var t = typeof atMs === 'number' ? atMs : nowMs();
    if (taps.n === 0 || t - taps.first > api.tapWindowMs) { taps.n = 0; taps.first = t; }
    taps.n++;
    if (taps.n >= api.tapCount) { taps.n = 0; api.toggleDev(); return true; }
    return false;
  };

  /** Make a replay for one game. See README.md for every option. */
  api.create = function (opts) {
    var r = new Replay(opts || {});
    instances.push(r);
    current = r;
    return r;
  };

  /** The replay made last (and not destroyed), or null. */
  api.current = function () { return current; };

  // Facade over the current replay, like the Unity static Replay class.
  api.noteEvent = function (who, name, why, x, y, z) { if (current) current.noteEvent(who, name, why, x, y, z); };
  api.isPlaying = function () { return !!(current && current.isPlaying()); };
  api.canBegin = function () { return !!(current && current.canBegin()); };
  api.begin = function () { return !!(current && current.begin()); };
  api.end = function () { if (current) current.end(); };

  /** Tests only: forget the cached switch, taps and instances. */
  api._resetForTests = function (o) {
    o = o || {};
    for (var i = instances.length - 1; i >= 0; i--) instances[i].destroy();
    instances = [];
    current = null;
    dev.loaded = false;
    dev.on = false;
    taps.n = 0;
    taps.first = 0;
    api.storage = o.storage || null;
    api.isMobile = o.isMobile || null;
  };

  function mobileNow(win) {
    if (typeof api.isMobile === 'function') return !!api.isMobile();
    var nav = (win && win.navigator) || (root && root.navigator) || null;
    if (!nav) return false;
    var ua = String(nav.userAgent || '');
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    // iPadOS reports a Mac user agent.
    if (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1) return true;
    return false;
  }

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  // ===================================================================================================
  function Replay(o) {
    loadDev();
    this.o = o;
    this.cameraKind = o.camera === '3d' ? '3d' : '2d';
    this.stride = Math.max(1, o.stride | 0 || 4);
    this.maxEntities = Math.max(1, o.maxEntities | 0 || 64);
    this.keyField = o.keyField === undefined ? 0 : (o.keyField | 0);
    if (this.keyField >= this.stride) this.keyField = -1;
    this.posFields = o.posFields || (this.cameraKind === '3d' ? [1, 2, 3] : [1, 2]);
    this.maxKeys = Math.max(1, o.maxKeys | 0 || 4096);
    this.sampleHz = num(o.sampleHz, 60);
    this.maxHz = Math.max(1, num(o.maxHz, 120));
    this.bufferSeconds = num(o.bufferSeconds, 6);
    this.beforeSeconds = num(o.beforeSeconds, 2.5);
    this.afterSeconds = num(o.afterSeconds, 2.5);
    this.radius = num(o.radius, 0);
    this.eventsPerFrame = Math.max(0, o.eventsPerFrame === undefined ? 16 : (o.eventsPerFrame | 0));
    this.mode = o.mode === 'online' ? 'online' : 'offline';
    this.slowSpeed = num(o.slowSpeed, 1 / 3);
    this.slowWindow = num(o.slowWindow, 0.5);
    this.orbitDegPerSec = num(o.orbitDegPerSec, 30);
    this.framePadding = num(o.framePadding, 1.5);
    this.zoomIn = num(o.zoomIn, 1.3);
    this.promptSeconds = num(o.promptSeconds, 4);
    this.padButton = o.padButton === undefined ? 17 : (o.padButton | 0);
    if (this.padButton === 8) {
      // Button 8 is Xbox View / Back: the games use it (Fur Frenzy pause, Round Em Up). Never bound.
      if (root && root.console) root.console.warn('ThumbyardReplay: button 8 is never bound; using 17.');
      this.padButton = 17;
    }
    this.pollGamepad = !!o.pollGamepad;
    this.ownLoop = !!o.ownLoop;
    this.win = o.window !== undefined ? o.window : (typeof window !== 'undefined' ? window : null);
    this.doc = o.document !== undefined ? o.document : (typeof document !== 'undefined' ? document : null);
    this.overlayParent = o.overlay || null;
    this.touch = o.touch !== undefined ? !!o.touch :
      !!(this.win && (('ontouchstart' in this.win) || (this.win.navigator && this.win.navigator.maxTouchPoints > 0)));

    this._T = new Float64Array(8);
    this._T[T_LAST] = -Infinity;
    this._hasUpd = false;
    this._hasLoop = false;

    this._data = null; // all buffers allocated together in _ensure()
    this._bytes = 0;
    this._listeners = 0;
    this._keysBound = false;
    this._tapBound = false;
    this._keyHeld = false;
    this._padHeld = false;
    this._press = false;
    this._endReq = false;
    this._beginReq = false;
    this._hold = 0;
    this._holdFired = false;
    this._padPrev = false;
    this._playing = false;
    this._paused = false;
    this._collecting = false;
    this._momentCount = 0;
    this._who = ''; this._name = ''; this._why = ''; this._what = '';
    this._mx = 0; this._my = 0; this._mz = 0;
    this._level = null;
    this._pending = null;
    this._ui = null;
    this._promptShown = false;
    this._cam = null;
    this._rafId = 0;
    this._ownRunning = false;
    this._clipStop = null;
    this._warnedEv = false;
    this._destroyed = false;

    var self = this;
    this._onKey = function (e) { self._key(e); };
    this._onEndTap = function () { if (self._playing) self._endReq = true; };
    this._onSwitchTap = function () { api.registerTap(); };
    this._onPromptTap = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      if (e && e.preventDefault) e.preventDefault();
      self._beginReq = true;
    };
    this._loop = function (ms) { self._loopFrame(ms); };

    // The tap element is the dev switch itself, so it is the one listener bound while off (only when given).
    this.tapElement = o.tapElement || null;
    if (this.tapElement && this.tapElement.addEventListener) {
      this.tapElement.addEventListener('pointerdown', this._onSwitchTap, false);
      this._listeners++;
    }
    if (dev.on) this._setKeys(true);
  }

  var P = Replay.prototype;

  // ---------------------------------------------------------------- state queries

  /** True while a replay plays. Games gate their own input and sim step on this. */
  P.isPlaying = function () { return this._playing; };

  /** True when a kept moment exists on the current level and nothing plays. */
  P.canBegin = function () {
    return dev.on && !this._playing && this._data !== null && this._momentCount >= 2 && this._sameLevel();
  };

  P.hasMoment = function () { return this._momentCount > 0; };
  P.isDev = function () { return dev.on; };
  P.setDev = function (on) { api.setDev(on); };
  P.registerTap = function (atMs) { return api.registerTap(atMs); };

  /** The replay camera handed to drawFrame / render ({x, y, zoom} in 2D, a camera in 3D). */
  P.camera = function () { return this._playing ? this._cam : null; };

  P.playbackTime = function () { return this._playT || 0; };
  P.momentTime = function () { return this._T[T_MOMENT]; };

  P.stats = function () {
    return {
      allocated: this._data !== null,
      bytes: this._bytes,
      liveFrames: this._data ? this._liveCount : 0,
      liveCapacity: this._data ? this._liveCap : 0,
      momentFrames: this._momentCount,
      momentCapacity: this._data ? this._momentCap : 0,
      freeSlots: this._data ? this._freeCount : 0,
      oldestLiveTime: this._data && this._liveCount ? this._time[this._live[this._head]] : NaN,
      firstMomentTime: this._momentCount ? this._time[this._moment[0]] : NaN,
      lastMomentTime: this._momentCount ? this._time[this._moment[this._momentCount - 1]] : NaN,
      collecting: this._collecting,
      listeners: this._listeners,
      keysBound: this._keysBound
    };
  };

  P._sameLevel = function () {
    if (!this.o.level) return true;
    return this.o.level() === this._level;
  };

  // ---------------------------------------------------------------- buffers

  P._ensure = function () {
    if (this._data) return;
    var hz = this.sampleHz > 0 ? this.sampleHz : this.maxHz;
    var liveCap = Math.ceil(this.bufferSeconds * hz) + 1;
    var momentCap = Math.ceil((this.beforeSeconds + this.afterSeconds) * hz) + 2;
    var pool = liveCap + momentCap;
    var fs = this.stride * this.maxEntities;
    var ec = this.eventsPerFrame;
    this._fs = fs;
    this._ec = ec;
    this._gap = this.sampleHz > 0 ? 0.75 / this.sampleHz : 0;
    this._liveCap = liveCap;
    this._momentCap = momentCap;
    this._pool = pool;
    this._data = new Float32Array(pool * fs);
    this._time = new Float64Array(pool);
    this._count = new Int32Array(pool);
    this._ref = new Uint8Array(pool);
    this._free = new Int32Array(pool);
    for (var i = 0; i < pool; i++) this._free[i] = pool - 1 - i;
    this._freeCount = pool;
    this._live = new Int32Array(liveCap);
    this._head = 0;
    this._liveCount = 0;
    this._moment = new Int32Array(momentCap);
    this._momentCount = 0;
    this._evCount = new Int32Array(pool);
    this._ev = new Float32Array(pool * ec * 4);
    this._pend = new Float32Array(Math.max(1, ec) * 4);
    this._pendCount = 0;
    this._out = new Float32Array(fs);
    this._mStamp = new Int32Array(this.maxKeys);
    this._mIndex = new Int32Array(this.maxKeys);
    this._stamp = 0;
    this._center = new Float64Array(3);
    this._fieldMode = new Uint8Array(this.stride);
    for (var f = 0; f < this.stride; f++) this._fieldMode[f] = 1; // 0 step, 1 lerp, 2 angle (radians)
    if (this.keyField >= 0) this._fieldMode[this.keyField] = 0;
    var sf = this.o.stepFields || [], af = this.o.angleFields || [];
    for (var s = 0; s < sf.length; s++) if (sf[s] >= 0 && sf[s] < this.stride) this._fieldMode[sf[s]] = 0;
    for (var a = 0; a < af.length; a++) if (af[a] >= 0 && af[a] < this.stride) this._fieldMode[af[a]] = 2;
    this._names = [];
    this._nameIds = new Map();
    this.frame = { buf: this._out, count: 0, stride: this.stride, t: 0, momentT: 0, alpha: 0, slow: false };
    this._T[T_LAST] = -Infinity;
    this._bytes = this._data.byteLength + this._time.byteLength + this._count.byteLength + this._ref.byteLength +
      this._free.byteLength + this._live.byteLength + this._moment.byteLength + this._evCount.byteLength +
      this._ev.byteLength + this._pend.byteLength + this._out.byteLength + this._mStamp.byteLength +
      this._mIndex.byteLength + this._center.byteLength + this._fieldMode.byteLength;
  };

  P._freeBuffers = function () {
    if (this._playing) this.end();
    this._collecting = false;
    this._pending = null;
    this._momentCount = 0;
    this._hidePrompt();
    this._data = null; this._time = null; this._count = null; this._ref = null; this._free = null;
    this._live = null; this._moment = null; this._evCount = null; this._ev = null; this._pend = null;
    this._out = null; this._mStamp = null; this._mIndex = null; this._center = null; this._fieldMode = null;
    this._names = null; this._nameIds = null; this.frame = null;
    this._liveCount = 0; this._freeCount = 0; this._pendCount = 0;
    this._bytes = 0;
    this._T[T_LAST] = -Infinity;
  };

  P._release = function (slot) {
    if (--this._ref[slot] === 0) this._free[this._freeCount++] = slot;
  };

  // ---------------------------------------------------------------- recording

  /**
   * Record one sample at this frame's timestamp (ms, the rAF time). Call it after the sim step.
   * Samples at most sampleHz times a second (0 = every call); keeps the real time of each sample.
   * Returns true when a sample was stored. No allocation in steady state.
   */
  P.record = function (ms) {
    if (!dev.on) return false;
    if (this._playing && this.mode === 'offline') return false;
    if (this._data === null) this._ensure();
    var T = this._T;
    var t = ms * 0.001;
    if (t > T[T_NOW]) T[T_NOW] = t;
    var last = T[T_LAST];
    if (t <= last) return false;
    if (this._gap > 0 && t - last < this._gap) return false;

    if (this._liveCount === this._liveCap) {
      this._release(this._live[this._head]);
      this._head = (this._head + 1) % this._liveCap;
      this._liveCount--;
    }
    var slot = this._free[--this._freeCount];
    var base = slot * this._fs;
    var n = 0;
    var cap = this.o.capture;
    if (cap) n = cap(this._data, base, this.maxEntities, this.radius) | 0;
    if (n < 0) n = 0;
    if (n > this.maxEntities) n = this.maxEntities;
    if (this.radius > 0 && this.o.center && n > 0) n = this._filter(base, n);

    // events noted since the last sample ride on this one
    var ec = this._ec, pc = this._pendCount;
    this._evCount[slot] = pc;
    if (pc > 0) {
      var eb = slot * ec * 4, pend = this._pend, ev = this._ev;
      for (var i = 0, m = pc * 4; i < m; i++) ev[eb + i] = pend[i];
      this._pendCount = 0;
    }

    this._time[slot] = t;
    this._count[slot] = n;
    this._ref[slot] = 1;
    this._live[(this._head + this._liveCount) % this._liveCap] = slot;
    this._liveCount++;
    T[T_LAST] = t;

    if (this._collecting) {
      if (this._momentCount < this._momentCap) {
        this._ref[slot]++;
        this._moment[this._momentCount++] = slot;
      }
      if (t >= T[T_MOMENT] + this.afterSeconds - EPS || this._momentCount >= this._momentCap) {
        this._collecting = false;
        this._momentReady();
      }
    }
    return true;
  };

  P._filter = function (base, n) {
    var c = this._center;
    this.o.center(c);
    var r2 = this.radius * this.radius;
    var pf = this.posFields, st = this.stride, d = this._data;
    var px = pf[0], py = pf[1], pz = pf.length > 2 ? pf[2] : -1;
    var keep = 0;
    for (var k = 0; k < n; k++) {
      var o = base + k * st;
      var dx = d[o + px] - c[0], dy = d[o + py] - c[1], dz = pz >= 0 ? d[o + pz] - c[2] : 0;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      if (keep !== k) { var w = base + keep * st; for (var f = 0; f < st; f++) d[w + f] = d[o + f]; }
      keep++;
    }
    return keep;
  };

  /** An effect event (home, combo, throw, bang, ...) that rides the next sample and re-fires on playback. */
  P.event = function (name, x, y, z) {
    if (!dev.on || this._ec === 0) return false;
    if (this._data === null) this._ensure();
    if (this._ec === 0) return false;
    if (this._pendCount >= this._ec) {
      if (!this._warnedEv && root && root.console) {
        this._warnedEv = true;
        root.console.warn('ThumbyardReplay: more than eventsPerFrame events in one sample; extras dropped.');
      }
      return false;
    }
    var id = this._intern(name);
    var p = this._pend, i = this._pendCount * 4;
    p[i] = id; p[i + 1] = num(x, 0); p[i + 2] = num(y, 0); p[i + 3] = num(z, 0);
    this._pendCount++;
    return true;
  };

  P._intern = function (name) {
    name = String(name);
    var id = this._nameIds.get(name);
    if (id === undefined) { id = this._names.length; this._names.push(name); this._nameIds.set(name, id); }
    return id;
  };

  // ---------------------------------------------------------------- moments

  /** Note the moment to keep: who did it, what it was, why it matters, and where (world units). */
  P.noteEvent = function (who, name, why, x, y, z) {
    if (!dev.on) return;
    if (this._data === null) this._ensure();
    var m = { t: this._T[T_NOW], who: who == null ? '' : String(who), name: name == null ? '' : String(name),
      why: why == null ? '' : String(why), x: num(x, 0), y: num(y, 0), z: num(z, 0) };
    if (this._playing) { this._pending = m; return; }
    this._keep(m);
  };

  P._keep = function (m) {
    this._releaseMoment();
    var T = this._T;
    T[T_MOMENT] = m.t;
    this._who = m.who; this._name = m.name; this._why = m.why;
    this._what = m.who && m.name ? m.who + ' ' + m.name : (m.who || m.name);
    this._mx = m.x; this._my = m.y; this._mz = m.z;
    this._level = this.o.level ? this.o.level() : null;
    var from = m.t - this.beforeSeconds, to = m.t + this.afterSeconds;
    for (var k = 0; k < this._liveCount; k++) {
      var slot = this._live[(this._head + k) % this._liveCap];
      var st = this._time[slot];
      if (st < from - EPS || st > to + EPS) continue;
      if (this._momentCount >= this._momentCap) break;
      this._ref[slot]++;
      this._moment[this._momentCount++] = slot;
    }
    this._collecting = T[T_NOW] < to - EPS;
    if (!this._collecting) this._momentReady();
  };

  P._momentReady = function () {
    if (this._momentCount >= 2 && this.touch && this.promptSeconds > 0 && this.overlayParent)
      this._T[T_PROMPT] = this._T[T_NOW] + this.promptSeconds;
  };

  P._releaseMoment = function () {
    for (var i = 0; i < this._momentCount; i++) this._release(this._moment[i]);
    this._momentCount = 0;
    this._collecting = false;
    this._T[T_PROMPT] = 0;
    this._hidePrompt();
  };

  /** Drop the kept moment (call it on a level change if the game has no level() option). */
  P.clearMoment = function () {
    if (this._playing) this.end();
    if (this._data) this._releaseMoment();
    this._pending = null;
  };

  // ---------------------------------------------------------------- playback

  /** Start the replay of the kept moment. False when there is none on this level. */
  P.begin = function () {
    if (!this.canBegin()) return false;
    this._collecting = false;
    this._hidePrompt();
    this._playing = true;
    this._press = false; this._endReq = false; this._beginReq = false;
    var M = this._moment, n = this._momentCount;
    this._playT = this._time[M[0]];
    this._playEnd = this._time[M[n - 1]];
    this._cursor = 0;
    this._fired = -1;

    this._paused = false;
    if (this.mode === 'offline') {
      if (this.o.pause) this.o.pause();
      this._paused = true;
    }
    if (this.o.save) this.o.save();

    this._computeFrame();
    this._pickSubject();
    this._camBegin();
    this._fireEvents();
    if (this.o.onBegin) this.o.onBegin(this.info());
    if (this.o.apply) this.o.apply(this.frame);
    this._showReplay();
    this._bindEndTap(true);
    if (this.ownLoop) this._startLoop();
    return true;
  };

  /** Who / what / why / where of the kept moment. */
  P.info = function () {
    return { who: this._who, name: this._name, why: this._why, what: this._what,
      x: this._mx, y: this._my, z: this._mz, t: this._T[T_MOMENT], slow: !!(this.frame && this.frame.slow) };
  };

  /** Advance playback by dt real seconds. Returns false once the replay has ended. */
  P.playStep = function (dt) {
    if (!this._playing) return false;
    dt = num(dt, 0);
    if (dt < 0) dt = 0;
    var mt = this._T[T_MOMENT];
    var wasSlow = Math.abs(this._playT - mt) <= this.slowWindow;
    this._playT += dt * (wasSlow ? this.slowSpeed : 1);
    if (this._playT > this._playEnd) this._playT = this._playEnd;
    var M = this._moment, n = this._momentCount, time = this._time;
    while (this._cursor + 1 < n && time[M[this._cursor + 1]] <= this._playT) this._cursor++;
    this._fireEvents();
    this._computeFrame();
    this._camUpdate(dt, false);
    if (this.o.apply) this.o.apply(this.frame);
    if (this.frame.slow !== wasSlow || dt === 0) this._showReplay();
    if (this._playT >= this._playEnd) { this.end(); return false; }
    return true;
  };

  /** Draw the current replay frame through the game: render(cam) or drawFrame(dt, cam). */
  P.draw = function (dt) {
    if (!this._playing) return;
    if (this.o.render) this.o.render(this._cam);
    else if (this.o.drawFrame) this.o.drawFrame(num(dt, 0), this._cam);
  };

  /** End the replay now and put everything back (restore once, resume, onEnd). */
  P.end = function () {
    if (!this._playing) return;
    this._playing = false;
    this._bindEndTap(false);
    this._stopLoop();
    this._press = false; this._endReq = false; this._beginReq = false;
    try { if (this.o.restore) this.o.restore(); } finally {
      if (this._paused) { this._paused = false; if (this.o.resume) this.o.resume(); }
      if (this.o.onEnd) this.o.onEnd(this.info());
      this._hideReplay();
      if (this._pending && this._data) { var m = this._pending; this._pending = null; this._keep(m); }
      if (this._clipStop) { var f = this._clipStop; this._clipStop = null; f(); }
    }
  };

  P._fireEvents = function () {
    var cb = this.o.onEvent;
    var M = this._moment;
    while (this._fired < this._cursor) {
      this._fired++;
      if (!cb) continue;
      var slot = M[this._fired], c = this._evCount[slot];
      if (c === 0) continue;
      var eb = slot * this._ec * 4, ev = this._ev;
      for (var i = 0; i < c; i++) {
        var o = eb + i * 4;
        cb(this._names[ev[o] | 0], ev[o + 1], ev[o + 2], ev[o + 3]);
      }
    }
  };

  P._computeFrame = function () {
    var M = this._moment, n = this._momentCount, time = this._time;
    var a = M[this._cursor], b = a, alpha = 0;
    if (this._cursor + 1 < n) {
      b = M[this._cursor + 1];
      var ta = time[a], tb = time[b];
      alpha = tb > ta ? (this._playT - ta) / (tb - ta) : 0;
      if (alpha < 0) alpha = 0; else if (alpha > 1) alpha = 1;
    }
    var d = this._data, out = this._out, st = this.stride, fs = this._fs, kf = this.keyField;
    var mode = this._fieldMode, mk = this.maxKeys;
    var baseA = a * fs, nA = this._count[a], baseB = b * fs, nB = this._count[b];
    var stamp = 0;
    if (b !== a && kf >= 0) {
      stamp = ++this._stamp;
      if (stamp >= 0x7fffffff) { this._mStamp.fill(0); stamp = this._stamp = 1; }
      for (var j = 0; j < nB; j++) {
        var kb = d[baseB + j * st + kf], ki = kb | 0;
        if (ki === kb && ki >= 0 && ki < mk) { this._mStamp[ki] = stamp; this._mIndex[ki] = j; }
      }
    }
    for (var k = 0; k < nA; k++) {
      var oa = baseA + k * st, oo = k * st, ob = -1;
      if (b !== a) {
        if (kf >= 0) {
          var key = d[oa + kf], kk = key | 0;
          if (kk === key && kk >= 0 && kk < mk && this._mStamp[kk] === stamp) ob = baseB + this._mIndex[kk] * st;
        } else if (k < nB) ob = baseB + k * st;
      }
      for (var f = 0; f < st; f++) {
        var va = d[oa + f];
        if (ob >= 0) {
          var md = mode[f];
          if (md === 1) va += (d[ob + f] - va) * alpha;
          else if (md === 2) {
            var diff = d[ob + f] - va;
            diff = diff - 2 * Math.PI * Math.floor((diff + Math.PI) / (2 * Math.PI));
            va += diff * alpha;
          }
        }
        out[oo + f] = va;
      }
    }
    var fr = this.frame;
    fr.count = nA;
    fr.t = this._playT;
    fr.momentT = this._T[T_MOMENT];
    fr.alpha = alpha;
    fr.slow = Math.abs(this._playT - this._T[T_MOMENT]) <= this.slowWindow;
  };

  // ---------------------------------------------------------------- replay camera

  P._isActor = function (off) {
    return !this.o.isActor || !!this.o.isActor(this._out, off);
  };

  P._posOf = function (off, outArr) {
    var pf = this.posFields, o = this._out;
    outArr[0] = o[off + pf[0]];
    outArr[1] = o[off + pf[1]];
    outArr[2] = pf.length > 2 ? o[off + pf[2]] : 0;
  };

  P._pickSubject = function () {
    // computeFrame ran on the first frame; walk to the frame nearest the moment to pick the subject.
    var M = this._moment, n = this._momentCount, time = this._time, mt = this._T[T_MOMENT];
    var best = 0, bestDt = Infinity;
    for (var i = 0; i < n; i++) { var dd = Math.abs(time[M[i]] - mt); if (dd < bestDt) { bestDt = dd; best = i; } }
    var slot = M[best], base = slot * this._fs, cnt = this._count[slot], st = this.stride, d = this._data;
    var pf = this.posFields, kf = this.keyField;
    var bestD = Infinity, subj = -1;
    for (var k = 0; k < cnt; k++) {
      var o = base + k * st;
      if (this.o.isActor && !this.o.isActor(d, o)) continue;
      var dx = d[o + pf[0]] - this._mx, dy = d[o + pf[1]] - this._my;
      var dz = pf.length > 2 ? d[o + pf[2]] - this._mz : 0;
      var dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestD) { bestD = dist; subj = k; }
    }
    this._subjectKey = subj >= 0 && kf >= 0 ? d[base + subj * st + kf] : NaN;
    this._subjectIndex = subj;
    this._sp = this._sp || new Float64Array(3);
    this._op = this._op || new Float64Array(3);
    this._focus = this._focus || new Float64Array(3);
    this._sp[0] = this._mx; this._sp[1] = this._my; this._sp[2] = this._mz;
  };

  /** Subject position and the nearest other actor in the current frame; returns separation (or -1). */
  P._frameSubject = function () {
    var out = this._out, st = this.stride, n = this.frame.count, kf = this.keyField;
    var si = -1;
    if (kf >= 0 && this._subjectKey === this._subjectKey) {
      for (var k = 0; k < n; k++) if (out[k * st + kf] === this._subjectKey) { si = k; break; }
    } else if (kf < 0 && this._subjectIndex >= 0 && this._subjectIndex < n) si = this._subjectIndex;
    if (si >= 0) this._posOf(si * st, this._sp);
    var sp = this._sp, op = this._op, bestD = Infinity, tmp0 = 0, tmp1 = 0, tmp2 = 0;
    for (var j = 0; j < n; j++) {
      if (j === si) continue;
      var off = j * st;
      if (kf >= 0 && out[off + kf] === this._subjectKey) continue;
      if (!this._isActor(off)) continue;
      this._posOf(off, op);
      var dx = op[0] - sp[0], dy = op[1] - sp[1], dz = op[2] - sp[2];
      var dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestD) { bestD = dist; tmp0 = op[0]; tmp1 = op[1]; tmp2 = op[2]; }
    }
    if (bestD === Infinity) { op[0] = sp[0]; op[1] = sp[1]; op[2] = sp[2]; return -1; }
    op[0] = tmp0; op[1] = tmp1; op[2] = tmp2;
    return Math.sqrt(bestD);
  };

  P._camBegin = function () {
    var live = this.o.gameCamera ? this.o.gameCamera() : null;
    if (this.cameraKind === '3d') {
      if (live && typeof live.clone === 'function') {
        if (this._cam && this._cam !== live && typeof this._cam.copy === 'function') this._cam.copy(live, false);
        else this._cam = live.clone(false);
        if (this._cam.updateProjectionMatrix) this._cam.updateProjectionMatrix();
      } else if (!this._cam || this._cam.isReplayCamera !== true) {
        this._cam = { isReplayCamera: true, fov: 50, position: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } };
      }
      var sep = this._frameSubject();
      var sp = this._sp;
      var lp = live && live.position ? live.position : null;
      var fov = num(this._cam.fov, 50);
      var ld = lp ? Math.sqrt((lp.x - sp[0]) * (lp.x - sp[0]) + (lp.y - sp[1]) * (lp.y - sp[1]) +
        (lp.z - sp[2]) * (lp.z - sp[2])) : 0;
      this._minDist = num(this.o.minDistance, ld > 0 ? ld * 0.6 : 6);
      var pitch = this.o.pitchDeg;
      if (typeof pitch !== 'number') {
        pitch = ld > 0 ? Math.asin(Math.max(-1, Math.min(1, (lp.y - sp[1]) / ld))) * 180 / Math.PI : 25;
        if (pitch < 10) pitch = 10; else if (pitch > 70) pitch = 70;
      }
      this._pitch = pitch * Math.PI / 180;
      this._angle = lp ? Math.atan2(lp.x - sp[0], lp.z - sp[2]) : 0;
      this._fovRad = fov * Math.PI / 180;
      this._dist = this._minDist;
      this._camUpdate(0, true, sep);
    } else {
      if (!this._cam || this._cam.isReplayCamera !== true) this._cam = { isReplayCamera: true, x: 0, y: 0, zoom: 1 };
      this._baseZoom = live && typeof live.zoom === 'number' ? live.zoom : 1;
      this._camUpdate(0, true);
    }
  };

  P._camUpdate = function (dt, snap, sepIn) {
    var sep = sepIn === undefined ? this._frameSubject() : sepIn;
    var sp = this._sp, op = this._op, F = this._focus, c = this._cam;
    var fx = sp[0], fy = sp[1], fz = sp[2];
    if (sep >= 0) { fx = (sp[0] + op[0]) * 0.5; fy = (sp[1] + op[1]) * 0.5; fz = (sp[2] + op[2]) * 0.5; }
    var k = snap ? 1 : 1 - Math.exp(-5 * dt);
    if (snap) { F[0] = fx; F[1] = fy; F[2] = fz; }
    else { F[0] += (fx - F[0]) * k; F[1] += (fy - F[1]) * k; F[2] += (fz - F[2]) * k; }
    var s = sep > 0 ? sep : 0;
    if (this.cameraKind === '3d') {
      var need = (s * 0.5 + this.framePadding) / Math.tan(Math.max(0.05, this._fovRad * 0.5));
      var dist = Math.max(this._minDist, need);
      // widen at once (keep both in frame), close in gently
      this._dist = snap || dist > this._dist ? dist : this._dist + (dist - this._dist) * k;
      if (!snap) this._angle += this.orbitDegPerSec * Math.PI / 180 * dt;
      var cp = Math.cos(this._pitch), d = this._dist;
      var px = F[0] + Math.sin(this._angle) * cp * d;
      var py = F[1] + Math.sin(this._pitch) * d;
      var pz = F[2] + Math.cos(this._angle) * cp * d;
      if (c.position && typeof c.position.set === 'function') c.position.set(px, py, pz);
      else { c.position.x = px; c.position.y = py; c.position.z = pz; }
      if (typeof c.lookAt === 'function') c.lookAt(F[0], F[1], F[2]);
      if (c.target) { c.target.x = F[0]; c.target.y = F[1]; c.target.z = F[2]; }
      if (typeof c.updateMatrixWorld === 'function') c.updateMatrixWorld(true);
    } else {
      var z = this._baseZoom * this.zoomIn;
      if (this.o.viewSize) {
        var v = this.o.viewSize();
        var span = s + 2 * this.framePadding;
        if (v && span > 0) {
          var fit = Math.min(v.w / span, v.h / span);
          if (fit < z) z = fit;
        }
      }
      c.x = F[0]; c.y = F[1];
      c.zoom = snap || z < c.zoom ? z : c.zoom + (z - c.zoom) * k;
    }
  };

  // ---------------------------------------------------------------- per-frame driver and inputs

  /**
   * Call once per frame from the game loop, before the sim step, with the rAF timestamp (ms).
   * Returns true while a replay plays (it stepped and drew this frame): skip the sim step and the game draw.
   */
  P.update = function (ms) {
    var T = this._T, t = ms * 0.001;
    var dt = this._hasUpd ? t - T[T_UPD] : 0;
    this._hasUpd = true;
    T[T_UPD] = t;
    if (dt < 0) dt = 0; else if (dt > 0.25) dt = 0.25;
    if (t > T[T_NOW]) T[T_NOW] = t;
    var title = this.o.isTitle ? !!this.o.isTitle() : false;
    if (!dev.on) {
      // Hidden switch: the trigger key is listened to only while the title screen shows.
      if (this.o.isTitle) this._setKeys(title);
      if (this.pollGamepad && title) this._pollPad();
      if (title) this._holdTick(dt); else { this._hold = 0; this._holdFired = false; }
      return false;
    }
    if (this.pollGamepad) this._pollPad();
    if (title) this._holdTick(dt); else { this._hold = 0; this._holdFired = false; }
    if (!dev.on) return false; // the hold just turned it off
    if (this._ownRunning) return this._playing;
    return this._frame(dt);
  };

  P._frame = function (dt) {
    if (this._playing) {
      if (this._press || this._endReq) { this.end(); return false; }
      if (!this.playStep(dt)) return false;
      this.draw(dt);
      return true;
    }
    if ((this._press || this._beginReq) && this.canBegin()) {
      this._press = false; this._beginReq = false;
      if (this.begin()) {
        if (this._ownRunning) return true;
        this.draw(0);
        return true;
      }
    }
    this._press = false; this._beginReq = false;
    var T = this._T;
    var prompt = T[T_PROMPT] > 0 && T[T_NOW] < T[T_PROMPT] && this.canBegin();
    if (prompt !== this._promptShown) { if (prompt) this._showPrompt(); else this._hidePrompt(); }
    return false;
  };

  P._holdTick = function (dt) {
    if (this._keyHeld || this._padHeld) {
      this._hold += dt;
      if (!this._holdFired && this._hold >= api.holdSeconds) {
        this._holdFired = true;
        api.toggleDev();
      }
    } else {
      this._hold = 0;
      this._holdFired = false;
    }
  };

  /**
   * Game-supplied button edge (the game's own pad code, e.g. Round Em Up HerdPad).
   * Only padButton (17, the PlayStation touchpad) counts; button 8 (Xbox View) never does.
   */
  P.padEdge = function (button, down) {
    if (button === 8 || button !== this.padButton) return;
    if (down) {
      this._padHeld = true;
      if (dev.on) this._press = true;
    } else this._padHeld = false;
  };

  P._pollPad = function () {
    var nav = (this.win && this.win.navigator) || null;
    if (!nav || typeof nav.getGamepads !== 'function') return;
    var pads = nav.getGamepads(), down = false;
    for (var i = 0; pads && i < pads.length; i++) {
      var p = pads[i];
      if (p && p.buttons && p.buttons.length > this.padButton && p.buttons[this.padButton].pressed) { down = true; break; }
    }
    if (down !== this._padPrev) { this._padPrev = down; this.padEdge(this.padButton, down); }
  };

  P._key = function (e) {
    var isTrig = e.code === 'Backquote' || e.key === '`';
    var isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (e.type === 'keyup') { if (isTrig) this._keyHeld = false; return; }
    if (e.type !== 'keydown') return;
    if (isTrig) {
      this._keyHeld = true;
      if (dev.on && !e.repeat) {
        this._press = true;
        if (this._playing || this.canBegin()) this._swallow(e);
      }
    } else if (isEnter && this._playing) {
      this._endReq = true;
      this._swallow(e);
    }
  };

  P._swallow = function (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    else if (e.stopPropagation) e.stopPropagation();
  };

  P._setKeys = function (on) {
    var w = this.win;
    if (!w || !w.addEventListener || on === this._keysBound) return;
    if (on) {
      w.addEventListener('keydown', this._onKey, true);
      w.addEventListener('keyup', this._onKey, true);
      this._listeners += 2;
    } else {
      w.removeEventListener('keydown', this._onKey, true);
      w.removeEventListener('keyup', this._onKey, true);
      this._listeners -= 2;
      this._keyHeld = false;
    }
    this._keysBound = on;
  };

  P._bindEndTap = function (on) {
    var target = this.o.endTapTarget || this.overlayParent;
    if (!target || !target.addEventListener || on === this._tapBound) return;
    if (on) { target.addEventListener('pointerdown', this._onEndTap, false); this._listeners++; }
    else { target.removeEventListener('pointerdown', this._onEndTap, false); this._listeners--; }
    this._tapBound = on;
  };

  P._devChanged = function (on, changed) {
    if (on) {
      this._setKeys(true);
    } else {
      this._freeBuffers();
      this._setKeys(false);
      this._removeUi();
    }
    if (changed) this._toast(on ? 'Replay dev: on' : 'Replay dev: off');
  };

  // ---------------------------------------------------------------- own loop (games whose pause stops their loop)

  P._raf = function (fn) {
    var r = this.o.requestFrame || (this.win && this.win.requestAnimationFrame && this.win.requestAnimationFrame.bind(this.win));
    return r ? r(fn) : 0;
  };

  P._startLoop = function () {
    this._ownRunning = true;
    this._hasLoop = false;
    this._rafId = this._raf(this._loop);
  };

  P._stopLoop = function () {
    if (!this._ownRunning) return;
    this._ownRunning = false;
    var c = this.o.cancelFrame || (this.win && this.win.cancelAnimationFrame && this.win.cancelAnimationFrame.bind(this.win));
    if (c && this._rafId) c(this._rafId);
    this._rafId = 0;
  };

  P._loopFrame = function (ms) {
    if (!this._ownRunning) return;
    var T = this._T, t = ms * 0.001;
    var dt = this._hasLoop ? t - T[T_LOOP] : 0;
    this._hasLoop = true;
    T[T_LOOP] = t;
    if (dt < 0) dt = 0; else if (dt > 0.25) dt = 0.25;
    if (this.pollGamepad) this._pollPad();
    this._frame(dt);
    if (this._ownRunning && this._playing) this._rafId = this._raf(this._loop);
  };

  // ---------------------------------------------------------------- overlay (inside the parent the game passes)

  P._uiEnsure = function () {
    if (this._ui) return this._ui;
    var doc = this.doc, parent = this.overlayParent;
    if (!doc || !parent || !doc.createElement) return null;
    var rootEl = doc.createElement('div');
    rootEl.setAttribute('data-thumbyard-replay', '');
    var s = rootEl.style;
    s.position = 'absolute'; s.left = '0'; s.top = '0'; s.right = '0'; s.bottom = '0';
    s.pointerEvents = 'none'; s.zIndex = '2147483000';
    s.fontFamily = 'Inter, Geist, system-ui, -apple-system, Segoe UI, sans-serif';
    var label = doc.createElement('div');
    var ls = label.style;
    ls.position = 'absolute'; ls.top = '12px'; ls.left = '50%'; ls.transform = 'translateX(-50%)';
    ls.padding = '6px 12px'; ls.borderRadius = '8px'; ls.background = 'rgba(12,12,14,0.62)';
    ls.color = '#fff'; ls.textAlign = 'center'; ls.display = 'none'; ls.whiteSpace = 'nowrap';
    var title = doc.createElement('div');
    title.style.font = '700 13px/1.2 inherit'; title.style.letterSpacing = '0.14em';
    var sub = doc.createElement('div');
    sub.style.font = '500 12px/1.3 inherit'; sub.style.opacity = '0.82'; sub.style.marginTop = '2px';
    label.appendChild(title); label.appendChild(sub);
    var prompt = doc.createElement('button');
    prompt.type = 'button';
    prompt.textContent = 'Replay';
    var ps = prompt.style;
    ps.position = 'absolute'; ps.right = '16px'; ps.bottom = '16px'; ps.pointerEvents = 'auto';
    ps.padding = '10px 16px'; ps.border = '1px solid rgba(255,255,255,0.28)'; ps.borderRadius = '10px';
    ps.background = 'rgba(12,12,14,0.62)'; ps.color = '#fff'; ps.font = '600 14px/1 inherit'; ps.display = 'none';
    var toast = doc.createElement('div');
    var ts = toast.style;
    ts.position = 'absolute'; ts.bottom = '16px'; ts.left = '50%'; ts.transform = 'translateX(-50%)';
    ts.padding = '6px 12px'; ts.borderRadius = '8px'; ts.background = 'rgba(12,12,14,0.62)'; ts.color = '#fff';
    ts.font = '500 12px/1.3 inherit'; ts.display = 'none';
    rootEl.appendChild(label); rootEl.appendChild(prompt); rootEl.appendChild(toast);
    parent.appendChild(rootEl);
    this._ui = { root: rootEl, label: label, title: title, sub: sub, prompt: prompt, toast: toast, promptBound: false,
      toastTimer: 0 };
    return this._ui;
  };

  P._showReplay = function () {
    var ui = this._uiEnsure();
    if (!ui) return;
    ui.title.textContent = this.frame && this.frame.slow ? 'REPLAY (slow)' : 'REPLAY';
    ui.sub.textContent = this._what + (this._why ? '  ' + this._why : '');
    ui.sub.style.display = this._what || this._why ? 'block' : 'none';
    ui.label.style.display = 'block';
  };

  P._hideReplay = function () {
    if (this._ui) this._ui.label.style.display = 'none';
  };

  P._showPrompt = function () {
    var ui = this._uiEnsure();
    this._promptShown = true;
    if (!ui) return;
    if (!ui.promptBound) { ui.prompt.addEventListener('pointerdown', this._onPromptTap, false); ui.promptBound = true; this._listeners++; }
    ui.prompt.style.display = 'block';
  };

  P._hidePrompt = function () {
    this._promptShown = false;
    var ui = this._ui;
    if (!ui) return;
    ui.prompt.style.display = 'none';
    if (ui.promptBound) { ui.prompt.removeEventListener('pointerdown', this._onPromptTap, false); ui.promptBound = false; this._listeners--; }
  };

  P._toast = function (text) {
    var ui = this._uiEnsure();
    if (!ui) { if (root && root.console && root.console.info) root.console.info('ThumbyardReplay: ' + text); return; }
    ui.toast.textContent = text;
    ui.toast.style.display = 'block';
    var self = this;
    if (ui.toastTimer) clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(function () {
      if (self._ui === ui) ui.toast.style.display = 'none';
      ui.toastTimer = 0;
      if (!dev.on) self._removeUi();
    }, 2000);
  };

  P._removeUi = function () {
    var ui = this._ui;
    if (!ui) return;
    if (ui.toastTimer && ui.toast.style.display !== 'none') return; // removed when the toast ends
    this._hidePrompt();
    if (ui.root.parentNode) ui.root.parentNode.removeChild(ui.root);
    this._ui = null;
  };

  // ---------------------------------------------------------------- dump / load (bug evidence)

  function asciiJson(obj) {
    return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, function (c) {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  /** The kept window as an ArrayBuffer (the caller saves it). Null when nothing is kept. */
  P.dump = function () {
    if (!this._data || this._momentCount < 1) return null;
    var M = this._moment, n = this._momentCount, st = this.stride, ec = this._ec;
    var used = [], map = {};
    var bodyBytes = 0, i, k;
    for (i = 0; i < n; i++) {
      var slot = M[i], c = this._evCount[slot], eb = slot * ec * 4;
      bodyBytes += 16 + this._count[slot] * st * 4 + c * 16;
      for (k = 0; k < c; k++) {
        var id = this._ev[eb + k * 4] | 0;
        if (map[id] === undefined) { map[id] = used.length; used.push(this._names[id]); }
      }
    }
    var header = asciiJson({
      format: 'thumbyard-replay', v: FORMAT_VERSION, stride: st, frames: n,
      momentT: this._T[T_MOMENT], x: this._mx, y: this._my, z: this._mz,
      who: this._who, name: this._name, why: this._why, events: used
    });
    var hl = header.length, pad = (4 - (hl % 4)) % 4;
    var buf = new ArrayBuffer(8 + hl + pad + bodyBytes);
    var dv = new DataView(buf), u8 = new Uint8Array(buf);
    dv.setUint32(0, MAGIC, true);
    dv.setUint32(4, hl, true);
    for (i = 0; i < hl; i++) u8[8 + i] = header.charCodeAt(i);
    var p = 8 + hl + pad;
    for (i = 0; i < n; i++) {
      var s = M[i], cnt = this._count[s], ev = this._evCount[s], base = s * this._fs, eo = s * ec * 4;
      dv.setFloat64(p, this._time[s], true); p += 8;
      dv.setUint32(p, cnt, true); p += 4;
      dv.setUint32(p, ev, true); p += 4;
      for (k = 0; k < cnt * st; k++) { dv.setFloat32(p, this._data[base + k], true); p += 4; }
      for (k = 0; k < ev; k++) {
        dv.setFloat32(p, map[this._ev[eo + k * 4] | 0], true);
        dv.setFloat32(p + 4, this._ev[eo + k * 4 + 1], true);
        dv.setFloat32(p + 8, this._ev[eo + k * 4 + 2], true);
        dv.setFloat32(p + 12, this._ev[eo + k * 4 + 3], true);
        p += 16;
      }
    }
    return buf;
  };

  /** Restore a kept window from dump(). The dev switch must be on. Returns true on success. */
  P.load = function (buf) {
    if (!dev.on || !buf) return false;
    if (buf.buffer && !(buf instanceof ArrayBuffer)) buf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    if (buf.byteLength < 8) return false;
    var dv = new DataView(buf), u8 = new Uint8Array(buf);
    if (dv.getUint32(0, true) !== MAGIC) return false;
    var hl = dv.getUint32(4, true);
    if (8 + hl > buf.byteLength) return false;
    var hs = '';
    for (var i = 0; i < hl; i++) hs += String.fromCharCode(u8[8 + i]);
    var h;
    try { h = JSON.parse(hs); } catch (e) { return false; }
    if (!h || h.format !== 'thumbyard-replay' || h.v !== FORMAT_VERSION || h.stride !== this.stride) return false;
    this._ensure();
    if (h.frames > this._momentCap || h.frames < 1) return false;
    // validate before touching state
    var st = this.stride, ec = this._ec, p = 8 + hl + ((4 - (hl % 4)) % 4), q = p, f;
    for (f = 0; f < h.frames; f++) {
      if (q + 16 > buf.byteLength) return false;
      var c0 = dv.getUint32(q + 8, true), e0 = dv.getUint32(q + 12, true);
      if (c0 > this.maxEntities || e0 > ec) return false;
      q += 16 + c0 * st * 4 + e0 * 16;
      if (q > buf.byteLength) return false;
    }
    if (this._playing) this.end();
    this._releaseMoment();
    this._pending = null;
    var ids = [];
    for (i = 0; i < (h.events || []).length; i++) ids.push(this._intern(h.events[i]));
    for (f = 0; f < h.frames; f++) {
      var slot = this._free[--this._freeCount];
      var t = dv.getFloat64(p, true), cnt = dv.getUint32(p + 8, true), ev = dv.getUint32(p + 12, true);
      p += 16;
      var base = slot * this._fs, k;
      for (k = 0; k < cnt * st; k++) { this._data[base + k] = dv.getFloat32(p, true); p += 4; }
      var eo = slot * ec * 4;
      for (k = 0; k < ev; k++) {
        this._ev[eo + k * 4] = ids[dv.getFloat32(p, true) | 0];
        this._ev[eo + k * 4 + 1] = dv.getFloat32(p + 4, true);
        this._ev[eo + k * 4 + 2] = dv.getFloat32(p + 8, true);
        this._ev[eo + k * 4 + 3] = dv.getFloat32(p + 12, true);
        p += 16;
      }
      this._time[slot] = t;
      this._count[slot] = cnt;
      this._evCount[slot] = ev;
      this._ref[slot] = 1;
      this._moment[this._momentCount++] = slot;
    }
    this._T[T_MOMENT] = num(h.momentT, this._time[this._moment[0]]);
    this._who = String(h.who || ''); this._name = String(h.name || ''); this._why = String(h.why || '');
    this._what = this._who && this._name ? this._who + ' ' + this._name : (this._who || this._name);
    this._mx = num(h.x, 0); this._my = num(h.y, 0); this._mz = num(h.z, 0);
    this._level = this.o.level ? this.o.level() : null;
    this._collecting = false;
    return true;
  };

  // ---------------------------------------------------------------- clip export (PC only)

  /**
   * Record the replay to a video Blob: canvas.captureStream + MediaRecorder. PC only; refuses on phones and
   * tablets. Starts the replay itself; the game loop (or ownLoop) drives it; resolves when it ends.
   * opts: fps (60), mimeType, bitsPerSecond (8e6).
   */
  P.exportClip = function (canvas, opts) {
    opts = opts || {};
    var self = this;
    var P0 = typeof Promise !== 'undefined' ? Promise : null;
    if (!P0) throw new Error('ThumbyardReplay.exportClip: no Promise');
    if (mobileNow(this.win)) return P0.reject(new Error('ThumbyardReplay.exportClip: PC only'));
    var MR = (this.win && this.win.MediaRecorder) || (typeof MediaRecorder !== 'undefined' ? MediaRecorder : null);
    if (!canvas || typeof canvas.captureStream !== 'function' || !MR)
      return P0.reject(new Error('ThumbyardReplay.exportClip: captureStream or MediaRecorder missing'));
    if (!this.canBegin()) return P0.reject(new Error('ThumbyardReplay.exportClip: no kept moment'));
    var types = opts.mimeType ? [opts.mimeType] :
      ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    var mime = '';
    for (var i = 0; i < types.length; i++) {
      if (!MR.isTypeSupported || MR.isTypeSupported(types[i])) { mime = types[i]; break; }
    }
    return new P0(function (resolve, reject) {
      var stream = canvas.captureStream(opts.fps || 60);
      var rec;
      try {
        rec = new MR(stream, mime ? { mimeType: mime, videoBitsPerSecond: opts.bitsPerSecond || 8e6 } :
          { videoBitsPerSecond: opts.bitsPerSecond || 8e6 });
      } catch (e) { reject(e); return; }
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = function (e) { reject((e && e.error) || e); };
      rec.onstop = function () {
        var tracks = stream.getTracks ? stream.getTracks() : [];
        for (var j = 0; j < tracks.length; j++) tracks[j].stop();
        var B = (self.win && self.win.Blob) || Blob;
        resolve(new B(chunks, { type: mime || (chunks[0] && chunks[0].type) || 'video/webm' }));
      };
      self._clipStop = function () {
        // let the last frame reach the recorder
        setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, 120);
      };
      rec.start(250);
      if (!self.begin()) { self._clipStop = null; rec.stop(); reject(new Error('ThumbyardReplay.exportClip: begin failed')); }
    });
  };

  // ---------------------------------------------------------------- teardown

  /** End, unbind everything, free the buffers and remove the overlay. */
  P.destroy = function () {
    if (this._destroyed) return;
    if (this._playing) this.end();
    this._freeBuffers();
    this._setKeys(false);
    this._bindEndTap(false);
    if (this.tapElement && this.tapElement.removeEventListener) {
      this.tapElement.removeEventListener('pointerdown', this._onSwitchTap, false);
      this._listeners--;
    }
    if (this._ui && this._ui.toastTimer) { clearTimeout(this._ui.toastTimer); this._ui.toastTimer = 0; }
    this._removeUi();
    this._destroyed = true;
    var i = instances.indexOf(this);
    if (i >= 0) instances.splice(i, 1);
    if (current === this) current = instances.length ? instances[instances.length - 1] : null;
  };

  api.Replay = Replay;
  return api;
});
