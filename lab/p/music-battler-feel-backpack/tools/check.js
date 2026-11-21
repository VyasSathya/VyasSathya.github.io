// Headless check: a hand-played round (drag to buy, tap for details, a real-time fight), then a full ?auto=1 run,
// at 390x844 and 1280x900. Screenshots to shots/. Nothing opens on screen.
// node tools/check.js   (Playwright from C:/Dev/marquee-studios/node_modules)
const path = require("path");
const { chromium } = require("C:/Dev/marquee-studios/node_modules/playwright");
const dir = path.resolve(__dirname, "..");
const url = "file:///" + dir.replace(/\\/g, "/") + "/index.html";
const exe = "C:/Users/vyass/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe";
(async () => {
  const topBand = {};
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  const report = [];
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const tag = `${w}x${h}`;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push("console " + m.text()); });
    await page.goto(url);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/shots/${tag}-1-select.png` });
    await page.click(".lead");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/shots/${tag}-2-shop.png` });
    // drag offers into the bag with the pointer (buy by drag)
    const tile = await page.evaluate(() => document.querySelector("#grid .dot").getBoundingClientRect().width);
    for (let k = 0; k < 3; k++) {
      const ofs = await page.$$(".offer:not(.empty)");
      if (!ofs.length) break;
      const b = await ofs[0].boundingBox();
      const g = await page.evaluate(() => { const r = document.getElementById("grid").getBoundingClientRect(); return { x: r.left, y: r.top }; });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 10, b.y + b.height / 2 + 20, { steps: 3 });
      // aim at the free tiles of the start bags (cols 2-4, rows 3-7)
      const tx = g.x + (2 + (k % 2) * 1.5) * tile + tile, ty = g.y + (3 + k * 1.6) * tile + tile * 0.8;
      await page.mouse.move(tx, ty, { steps: 8 });
      if (k === 0) await page.screenshot({ path: `${dir}/shots/${tag}-3-drag.png` });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }
    const placed = await page.evaluate(() => window.__state.items);
    // tap a placed item for its details
    const it = await page.$("#grid .it:not(.isbag)");
    if (it) { const bb = await it.boundingBox(); await page.mouse.click(bb.x + 6, bb.y + 6); await page.waitForTimeout(350); await page.screenshot({ path: `${dir}/shots/${tag}-4-details.png` }); await page.click("#sh-x").catch(() => {}); }
    topBand[tag] = { shop: await page.evaluate(() => { let m = 1e9; document.querySelectorAll('#s-shop *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(e).position !== 'fixed') m = Math.min(m, r.top); }); return Math.round(m); }) };
    const hscroll1 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.click("#fight");
    await page.waitForTimeout(4200);
    await page.screenshot({ path: `${dir}/shots/${tag}-5-fight.png` });
    topBand[tag].fight = await page.evaluate(() => { let m = 1e9; document.querySelectorAll('#s-fight *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.height) m = Math.min(m, r.top); }); return Math.round(m); });
    topBand[tag].skip = await page.evaluate(() => { const r = document.getElementById('f-skip').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    await page.waitForFunction(() => !document.getElementById("f-res").hidden, null, { timeout: 90000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/shots/${tag}-6-result.png` });
    const fight1 = await page.evaluate(() => { window.__syncCheck && 0; const s = window.__state; return Object.assign({}, s.fights[0], { notes: s.notes, decoded: s.decoded, audio: s.audio }); });
    await page.click("#f-next");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/shots/${tag}-7-round2.png` });
    // a late-game board (bot-built to round 9) and a fight with it
    await page.goto(url + "?demo=9");
    await page.waitForTimeout(800);
    await page.click(".lead");
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/shots/${tag}-9-shop-round9.png` });
    await page.click("#fight");
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${dir}/shots/${tag}-10-fight-round9.png` });
    // full auto run
    const t0 = Date.now();
    await page.goto(url + "?auto=1");
    await page.waitForFunction(() => window.__state && window.__state.over, null, { timeout: 240000 });
    const st = await page.evaluate(() => window.__state);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/shots/${tag}-8-end.png` });
    const hscroll2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    report.push({ tag, topBand: topBand[tag], placedByDrag: placed, tile, fight1, auto: { result: st.result, round: st.round, wins: st.wins, losses: st.losses, fights: st.fights.length, secs: ((Date.now() - t0) / 1000).toFixed(1),
      fightTimes: st.fights.map((f) => f.t) }, sideScroll: hscroll1 || hscroll2, errors: errs });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
