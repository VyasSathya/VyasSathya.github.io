/* Toybox desktop hotkeys. Every game's desktop build includes this (d, 2026-11-27: "The first thing we need to have
   for the desktop version, we need to have hotkeys."). Built in: M mute, - and = volume, F full screen, H show or hide
   the key strip. The game adds its own keys and says which hints belong to the screen on show. The strip and the keys
   exist only where there is a mouse and keyboard; phones see nothing. Plain script, no dependencies.
     const hk = ToyboxHotkeys({
       volume: {get: () => 0..1, set: v => {}}, mute: {get: () => bool, set: on => {}},
       actions: [{keys: ['enter', ' '], run: () => {}}],            // e.key, lower case
       hints: () => [[['W','A','S','D'], 'Move'], [['P'], 'Pause']]  // for the current screen
     });                                                              */
(function () {
  window.ToyboxHotkeys = function (cfg) {
    if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return null;
    const css = document.createElement('style');
    css.textContent = '#tbk{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:14px;align-items:center;' +
      'padding:6px 12px;border-radius:12px;background:rgba(12,16,22,.62);color:#fff;font:600 13px/1 Inter,system-ui,sans-serif;' +
      'white-space:nowrap;pointer-events:none;z-index:60}#tbk[hidden]{display:none}#tbk span{display:flex;gap:4px;align-items:center}' +
      '#tbk kbd{min-width:20px;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.45);border-bottom-width:2px;' +
      'text-align:center;font:700 12px/1 Inter,system-ui,sans-serif}#tbk b{font-weight:600;opacity:.85;margin-left:2px}';
    document.head.appendChild(css);
    const bar = document.createElement('div'); bar.id = 'tbk'; document.body.appendChild(bar);
    let shown = localStorage.getItem('tb_hotkeys_hidden') !== '1', last = '', note = '', noteUntil = 0;
    const base = [[['M'], 'Mute'], [['-', '+'], 'Volume'], [['F'], 'Full screen'], [['H'], 'Hide keys']];
    function draw() {
      const items = (cfg.hints ? cfg.hints() : []).concat(base);
      let html = items.map(([caps, label]) => '<span>' + caps.map(c => '<kbd>' + c + '</kbd>').join('') + '<b>' + label + '</b></span>').join('');
      if (Date.now() < noteUntil) html = '<span><b>' + note + '</b></span>';
      if (html !== last) { bar.innerHTML = html; last = html; }
      bar.hidden = !shown && Date.now() >= noteUntil;
    }
    function say(text) { note = text; noteUntil = Date.now() + 1100; draw(); }
    addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = (e.key || '').toLowerCase();
      if (k === 'm' && cfg.mute) { if (!e.repeat) { cfg.mute.set(!cfg.mute.get()); say(cfg.mute.get() ? 'Muted' : 'Sound on'); } }
      else if ((k === '-' || k === '=' || k === '+') && cfg.volume) {
        const v = Math.max(0, Math.min(1, Math.round((cfg.volume.get() + (k === '-' ? -0.1 : 0.1)) * 10) / 10));
        cfg.volume.set(v); say('Volume ' + Math.round(v * 100) + '%');
      } else if (k === 'f' && !e.repeat) { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
      else if (k === 'h' && !e.repeat) { shown = !shown; localStorage.setItem('tb_hotkeys_hidden', shown ? '0' : '1'); draw(); }
      else for (const a of cfg.actions || []) if (a.keys.includes(k) && !e.repeat) { if (a.run(k) !== false) e.preventDefault(); break; }
      draw();
    });
    setInterval(draw, 200); draw();
    return { draw, say };
  };
})();
