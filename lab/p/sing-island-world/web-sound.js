/* WebSound: one sound API for a game page that runs in a browser and inside an iOS app shell.
   Shared copy: C:/Dev/toybox/app-kit/ios-web-sound (README there). Page side of swift/WebSound.swift.

   In the app, the app plays the sounds (so they play in silent mode and leave the player's music playing) and this
   page only sends it the cues. That happens when the app says it holds every file the page needs (window.__snd).
   Anywhere else (a browser, an older build that lacks a file) the page plays everything itself with WebAudio.

   const snd = WebSound({
     files: ['jump', 'land', 'music', 'menu'],        // names without folder or extension
     loops: ['music', 'menu'],                        // files that loop; they start silent
     music: ['music', 'menu'],                        // loops on the Music switch; everything else is on the Sound switch
     loopPoints: { music: [0.1, 34.905] },            // [start, length] in seconds; default is the file less 30 ms each end
     variants: { jump: 3 },                           // jump, jump_2, jump_3 picked at random
     vol: 1.3, path: 'sfx/', ext: '.m4a', query: '?v=4',
   });
   snd.start();                      // at load, and again on the first touch (a browser keeps sound off until a touch)
   snd.play('jump', 0.8, 1.05);      // name, level 0 to 2, speed; a 4th value starts it that many seconds late
   snd.loop('music', 0.42, 0.05);    // every frame: moves that loop's level a part of the way to the target
   snd.switches(soundOn, musicOn);   // the two switches; remember them yourself
   snd.native                        // true when the app is playing the sound
*/
function WebSound(o) {
  const FILES = o.files, LOOPS = o.loops || [], MUS = o.music || [], LP = o.loopPoints || {}, VAR = o.variants || {};
  const VOL = o.vol === undefined ? 1 : o.vol, PATH = o.path || 'sfx/', EXT = o.ext || '.m4a', Q = o.query || '';
  const S = { c: null, g: null, m: null, buf: {}, loops: {}, lv: {}, ls: {}, id: 0, sound: true, music: true, told: false, hush: null };
  const NS = (() => {
    try {
      const h = window.webkit.messageHandlers[o.handler || 'snd'], l = window.__snd;
      return h && l && FILES.every(f => l.includes(f)) ? h : null;
    } catch (e) { return null; }
  })();
  const nat = m => { try { NS.postMessage(m); } catch (e) {} };

  /* A page's own sound on an iPhone follows the ring switch unless the page says it is playback, and playback stops
     the phone's own music. Both switches off hands the phone's audio back. Not used when the app plays the sound. */
  function sessionType() {
    try { if (!NS && navigator.audioSession) navigator.audioSession.type = !S.sound && !S.music ? 'ambient' : 'playback'; } catch (e) {}
  }

  function gains() {
    const s = S.sound ? VOL : 0, m = S.music ? VOL : 0;
    sessionType();
    if (NS) nat({ t: 'g', s, m });
    else if (S.g) { S.g.gain.value = s; S.m.gain.value = m; }
  }

  function startLoop(n) {
    const b = S.buf[n], s = S.c.createBufferSource(), g = S.c.createGain(), l = LP[n] || [0.03, b.duration - 0.06];
    s.buffer = b; s.loop = true; s.loopStart = l[0]; s.loopEnd = l[0] + l[1];
    g.gain.value = 0;
    s.connect(g); g.connect(MUS.includes(n) ? S.m : S.g);
    s.start(0, l[0]);
    S.loops[n] = g;
  }

  function fetchFile(f) {
    const x = new XMLHttpRequest();
    x.open('GET', PATH + f + EXT + Q);
    x.responseType = 'arraybuffer';
    x.onload = () => {
      if (x.response) S.c.decodeAudioData(x.response, d => { S.buf[f] = d; if (LOOPS.includes(f)) startLoop(f); }, () => {});
    };
    x.onerror = () => {};
    x.send();
  }

  function start() {
    if (NS) {
      if (!S.told) { S.told = true; nat({ t: 'init', lp: LP, loops: LOOPS, mus: MUS }); gains(); }
      return;
    }
    if (S.c) { if (S.c.state != 'running') S.c.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    sessionType();
    S.c = new A(); S.g = S.c.createGain(); S.m = S.c.createGain();
    gains();
    /* everything goes through one limiter, so a hit on top of the music cannot clip */
    const lim = S.c.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.12;
    S.g.connect(lim); S.m.connect(lim); lim.connect(S.c.destination);
    for (const f of FILES) fetchFile(f);
  }

  /* Returns a handle with stop(). In the app, stop() only drops a sound that was asked for late and has not started. */
  function play(n, vol, rate, late) {
    const k = VAR[n] ? (i => i ? n + '_' + (i + 1) : n)(Math.floor(Math.random() * VAR[n])) : n;
    if (NS) {
      const id = ++S.id;
      nat({ t: 'p', n: k, v: vol === undefined ? 1 : vol, r: rate || 1, d: late || 0, id });
      return { stop() { nat({ t: 'x', id }); } };
    }
    if (!S.c) return;
    const b = S.buf[k];
    if (!b) return;
    const s = S.c.createBufferSource(), g = S.c.createGain();
    s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = vol === undefined ? 1 : vol;
    s.connect(g); g.connect(S.g);
    s.start(late ? S.c.currentTime + late : 0);
    return s;
  }

  /* Call every frame. The app is told only when the level has moved enough to hear. */
  function loop(n, v, k) {
    if (S.hush) v = S.hush[n] || 0;
    if (NS) {
      const c = S.lv[n] || 0;
      let x = c + (v - c) * (k || 0.15);
      if (Math.abs(x - v) < 0.003) x = v;
      S.lv[n] = x;
      const sent = S.ls[n];
      if (sent === undefined || Math.abs(x - sent) > 0.004 || (x == v && sent != x)) { S.ls[n] = x; nat({ t: 'l', n, v: x }); }
      return;
    }
    const g = S.loops[n];
    if (g) g.gain.value += (v - g.gain.value) * (k || 0.15);
  }

  function switches(sound, music) { S.sound = !!sound; S.music = !!music; gains(); }

  document.addEventListener('visibilitychange', () => {
    if (NS) nat({ t: 'on', v: document.hidden ? 0 : 1 });
    else if (S.c) { if (document.hidden) S.c.suspend(); else S.c.resume(); }
  });

  /* The simulator check (app launched with -soundrec): each file alone, and the app logs how loud it came out.
     Call it from your QA run with nothing else playing; read the SND_CUE lines in the log. */
  async function walk() {
    if (!NS) return;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const quiet = async ms => { nat({ t: 'hush' }); await wait(ms); nat({ t: 'meter', n: '' }); };
    S.hush = {};
    await quiet(2500); await wait(700); nat({ t: 'meter', n: 'quiet' });
    for (const f of FILES) {
      if (LOOPS.includes(f)) {
        nat({ t: 'l', n: f, v: 0.5 }); await wait(1500);
        nat({ t: 'meter', n: f });
        nat({ t: 'l', n: f, v: 0 }); S.lv[f] = S.ls[f] = 0;
        await quiet(1800);
      } else {
        nat({ t: 'p', n: f, v: 0.8, r: 1, d: 0, id: 0 }); await wait(700);
        nat({ t: 'meter', n: f });
        await quiet(350);
      }
    }
    S.hush = null;
  }

  return {
    native: !!NS, start, play, loop, switches, walk,
    now: () => NS || !S.c ? performance.now() / 1000 : S.c.currentTime,
    stopRecording: () => { if (NS) nat({ t: 'recstop' }); },
    state: () => ({ native: !!NS, context: S.c ? S.c.state : null, loaded: Object.keys(S.buf).length, files: FILES.length, sound: S.sound, music: S.music }),
  };
}
if (typeof module !== 'undefined') module.exports = WebSound;
