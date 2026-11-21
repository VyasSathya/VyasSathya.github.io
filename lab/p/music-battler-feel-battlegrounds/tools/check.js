// Headless check: plays full runs with ?auto=1 at 390x844 and 1280x900, saves screenshots, reports errors.
// node tools/check.js   (uses the Playwright copy in C:/Dev/marquee-studios/node_modules; nothing opens on screen)
const path = require("path");
const { chromium } = require("C:/Dev/marquee-studios/node_modules/playwright");
const dir = path.resolve(__dirname, "..");
const url = "file:///" + dir.replace(/\\/g, "/") + "/index.html";
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Users/vyass/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe", args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  const out = [];
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 700 });
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errs.push("console " + m.text()); });
    // 1) manual look: hero pick, shop, a fight in progress
    await page.goto(url);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${dir}/shots/${w}x${h}-1-heroes.png` });
    await page.click(".opt");
    await page.waitForTimeout(400);
    await page.click("#rowA .card");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/shots/${w}x${h}-2-sheet.png` });
    await page.click("#sheet .btn.acc");
    await page.waitForTimeout(200);
    await page.click("#rowH .card");
    await page.waitForTimeout(250);
    await page.click("#sheet .btn.acc");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/shots/${w}x${h}-3-shop.png` });
    const sx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const look = await page.evaluate(() => {
      const r = (q) => Array.from(document.querySelectorAll(q)).filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
      const ctl = r("#lobby .chip, #bar .btn, .power, .fight, #rowA .card, #rowB .card");
      const top = Math.min(...Array.from(document.querySelectorAll("#app *")).filter(e => e.offsetParent && e.getBoundingClientRect().height > 0).map(e => e.getBoundingClientRect().top));
      const cards = r(".card"); const clip = cards.some(b => b.left - 6 < 0 || b.right + 6 > window.innerWidth);
      return { clip, card: window.__bg.cardSize, minTap: Math.round(Math.min(...ctl.map(b => Math.min(b.width, b.height)))), topmost: Math.round(top) };
    });
    await page.click("#bFight");
    await page.waitForTimeout(5200);
    await page.screenshot({ path: `${dir}/shots/${w}x${h}-4-fight.png` });
    look.fightCard = await page.evaluate(() => window.__bg.cardSize);
    // 2) full auto run
    await page.goto(url + "?auto=1&fast=12");
    const t0 = Date.now();
    let st = null, badgeClip = false;
    while (Date.now() - t0 < 240000) {
      await page.waitForTimeout(1000);
      st = await page.evaluate(() => ({ done: window.__bg.done, place: window.__bg.place, turn: window.__bg.g && window.__bg.g.turn, errors: window.__bg.errors, fights: window.__bg.fights, on: window.__bg.hitsOnBeat, off: window.__bg.hitsOff, phase: window.__bg.phase }));
      const c2 = await page.evaluate(() => Array.from(document.querySelectorAll(".card .a, .card .h")).filter(e => e.offsetParent && !e.parentNode.matches(".wind,.born,.dying,.shake") && !e.parentNode.style.transform).some(e => { const b = e.getBoundingClientRect(); return b.left < 0 || b.right > window.innerWidth; }));
      if (c2 && !badgeClip) badgeClip = await page.evaluate(() => { const o = []; ["rowA","rowB","rowH"].forEach(id => { const el = document.getElementById(id); const cs = el.querySelectorAll(".card"); o.push(id + ":" + cs.length + ":" + Array.from(cs).map(c => Math.round(c.getBoundingClientRect().left)+"-"+Math.round(c.getBoundingClientRect().right)).join(",")); }); return window.__bg.phase + " " + getComputedStyle(document.getElementById("app")).getPropertyValue("--cw") + " " + o.join(" | "); });
      if (st.turn === 6 && !st.shot6) { await page.screenshot({ path: `${dir}/shots/${w}x${h}-5-auto-turn6.png` }); st.shot6 = 1; }
      if (st.done) break;
    }
    await page.screenshot({ path: `${dir}/shots/${w}x${h}-6-end.png` });
    const sx2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    out.push({ size: `${w}x${h}`, badgeClip, look, sideScroll: Math.max(sx, sx2), state: st, errs, secs: Math.round((Date.now() - t0) / 1000) });
    await page.close();
  }
  // 3) sound on: the fight scheduled on the audio clock, hits checked against the beat grid
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push("pageerror " + e.message));
    await page.goto(url + "?auto=1&fast=2&sound=1");
    await page.mouse.click(5, 5);
    await page.waitForTimeout(45000);
    const st = await page.evaluate(() => ({ live: window.AU.live(), packs: window.AU.ready(), turn: window.__bg.g.turn, on: window.__bg.hitsOnBeat, off: window.__bg.hitsOff, errors: window.__bg.errors }));
    out.push({ size: "1280x900 sound", state: st, errs });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
