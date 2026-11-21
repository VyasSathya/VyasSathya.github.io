// Headless check: node tools/check.cjs  (Playwright from C:/Dev/sparktory, --mute-audio, nothing on screen)
const { chromium } = require('C:/Dev/sparktory/node_modules/playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const url = 'file:///' + root.split(path.sep).join('/') + '/index.html';
const shots = path.join(root, 'shots');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  const report = { views: [], batch: null };
  for (const [w, h] of [[1280, 900], [844, 390], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const tag = `${w}x${h}`;
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shots, `${tag}-0-start.png`) });
    // one event screen by hand: a seed whose first stops include an event
    await page.goto(url + '?seed=5'); await page.waitForTimeout(300);
    await page.click('#start .opt');
    for (let i = 0; i < 6; i++) { const has = await page.evaluate(() => { const r = window.__game.run; const e = r.enc && r.enc.findIndex(o => o.kind === 'event'); if (r.phase === 'encounters' && e >= 0) { document.querySelectorAll('#upper .choice')[e].click(); return true; } if (r.phase === 'encounters') { document.querySelectorAll('#upper .choice')[0].click(); } else { const b = [...document.querySelectorAll('#mid .btn.go')].pop(); if (b) b.click(); } return false; }); await page.waitForTimeout(150); if (has) break; }
    const evPhase = await page.evaluate(() => window.__game.run.phase);
    await page.screenshot({ path: path.join(shots, `${tag}-0b-event-${evPhase}.png`) });
    await page.goto(url + '?auto=1&rt=1&autodelay=260&seed=' + (w * 7 + 11));
    const seen = new Set(); let midFight = false; const t0 = Date.now(); const ui = { smallButtons: new Set(), inTop40: new Set(), cols: null };
    const audit = async () => { const a = await page.evaluate(() => {
      const small = [], top = [];
      document.querySelectorAll('#app button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && (r.height < 44 || r.width < 44)) small.push((b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
      document.querySelectorAll('#app *').forEach(e => { if (e.closest('.float')) return; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && r.top < 40 && r.bottom > 0) top.push((e.className || e.tagName) + ''); });
      return { small, top, cols: getComputedStyle(document.documentElement).getPropertyValue('--rowW') };
    }); a.small.forEach(x => ui.smallButtons.add(x)); a.top.forEach(x => ui.inTop40.add(x)); ui.cols = a.cols; };
    while (Date.now() - t0 < 240000) {
      const st = await page.evaluate(() => { const r = window.__game.run; return r ? { phase: r.phase, done: window.__log.done, fights: window.__log.fights.length, sw: document.documentElement.scrollWidth, iw: innerWidth } : null; });
      if (st) {
        if (!seen.has(st.phase)) { seen.add(st.phase); await page.screenshot({ path: path.join(shots, `${tag}-${seen.size}-${st.phase}.png`) }); await audit(); }
        if (st.phase === 'fight' && !midFight) { await page.waitForTimeout(9000); await page.screenshot({ path: path.join(shots, `${tag}-fight-bar5.png`) }); midFight = true; }
        if (st.done && st.phase === 'end') break;
      }
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shots, `${tag}-z-end.png`) });
    const res = await page.evaluate(() => {
      const L = window.__log;
      const offBeat = L.uses.filter(u => !u.repeat && u.step % 4 !== 0).length;
      const aud = L.audio.filter(a => !a.rep);
      const audOff = aud.filter(a => { const s = (a.when - a.t0) / a.sd; return Math.abs(s - Math.round(s)) > 1e-6 || Math.round(s) % 4 !== 0; }).length;
      return { result: L.result, fights: L.fights.length, uses: L.uses.length, offBeat, audioHits: aud.length, audioOffBeat: audOff,
        rtFight: L.fights[0], scrollX: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth };
    });
    await audit();
    report.views.push({ view: tag, phases: [...seen], errors: errs, ...res, smallButtons: [...ui.smallButtons], inTop40: [...ui.inTop40], rowW: ui.cols });
    await page.close();
  }
  // batch: many instant runs for rules and balance
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const out = [];
  for (let i = 0; i < 12; i++) {
    await page.goto(url + '?auto=1&autodelay=0&seed=' + (1000 + i));
    await page.waitForFunction(() => window.__log && window.__log.done && window.__game.run && window.__game.run.phase === 'end', null, { timeout: 120000 });
    out.push(await page.evaluate(() => { const L = window.__log; return { ...L.result, fights: L.fights.length, offBeat: L.uses.filter(u => !u.repeat && u.step % 4 !== 0).length, sand: L.fights.filter(f => f.sand > 0).length, avgBars: Math.round(L.fights.reduce((a, f) => a + f.steps, 0) / L.fights.length / 16) }; }));
  }
  report.batch = { runs: out, errors: errs };
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
