/* Battlegrounds feel game: screens, taps, the turn loop and the fight played as Iron March.
   One attack at a time: the attacker plays its phrase on the beat and the hit lands on the next downbeat
   (the first 6 attacks take a bar each) or the next strong beat (half a bar each after that, as the game
   speeds its fights up mid-combat). */
(function () {
"use strict";
var D = window.BG_CARDS, E = window.BG_ENGINE, AU = window.AU, BY = D.BY, STRIPS = window.STRIPS;
var Q = new URLSearchParams(location.search);
var AUTO = Q.get("auto") === "1" || window.__auto === true;
var FAST = Number(Q.get("fast")) || (AUTO ? 6 : 1);
var $ = function (id) { return document.getElementById(id); };
var app = $("app");
var ST = { g: null, you: null, phase: "pick", sheet: null, target: null, timerEnd: 0, shownHp: {}, errors: [], done: false, place: 0, turnsPlayed: 0, fights: 0, hitsOnBeat: 0, hitsOff: 0 };
window.__bg = ST;
window.addEventListener("error", function (e) { ST.errors.push(String(e.message || e)); });
if (AUTO) window.__mute = Q.get("sound") !== "1";

var BEAT = 60 / AU.bpm;
function sd() { return 60 / AU.bpm / 4 / FAST; }
app.style.setProperty("--beat", (BEAT / FAST) + "s");
document.documentElement.style.setProperty("--beat", BEAT + "s");
AU.load();

// ---------------- scheduler: audio a little ahead, visuals on time ----------------
var SQ = [];
function at(t, fn, audio) { SQ.push({ t: t, fn: fn, audio: !!audio }); }
function tick() {
  var now = AU.now();
  for (var i = 0; i < SQ.length; i++) {
    var it = SQ[i];
    if ((it.audio && it.t - now < 0.18) || (!it.audio && now >= it.t)) {
      SQ.splice(i, 1); i--;
      try { it.fn(it.t); } catch (e) { ST.errors.push(String(e && e.stack || e)); }
    }
  }
  shopMusic(now);
  timerTick(now);
}
setInterval(tick, 16);

// ---------------- art ----------------
function stripKey(c) { if (!c || !c.role) return null; return c.r + "-" + D.MODEL[c.role]; }
function setSprite(el, key, tint) {
  var s = STRIPS[key]; if (!s) return;
  el.style.backgroundImage = "url(art/" + key + ".webp)";
  el.style.setProperty("--n", s.n);
  el.style.aspectRatio = s.w + " / " + s.h;
  el.style.filter = tint || "";
}
function heroSprite(h) { return h ? h.art : null; }
function faceStyle(el, key, size) {
  var s = STRIPS[key]; if (!s) return;
  var H = size * 2.1, W = s.w * H / s.h;
  el.style.backgroundImage = "url(art/" + key + ".webp)";
  el.style.backgroundSize = (W * s.n) + "px " + H + "px";
  el.style.backgroundPosition = (-(W / 2 - size / 2)) + "px " + (-size * 0.08) + "px";
}
var ICON = {
  wf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6l6 6-6 6M13 6l6 6-6 6"/></svg>',
  sour: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#3f9a4a"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6z"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
};

// ---------------- cards ----------------
function mkCard() {
  var el = document.createElement("div"); el.className = "card";
  el.innerHTML = '<div class="art"><div class="spr"></div></div><div class="pips"></div><div class="kw"></div><b class="a"></b><b class="h"></b><i class="dr"></i>';
  return el;
}
function fillCard(el, d) {
  var c = BY[d.id];
  el.dataset.uid = d.uid; el.dataset.id = d.id;
  var cls = ["card", c.r || "", d.ctx || ""];
  if (c.spell) {
    el.className = "card spell"; el.innerHTML = '<div class="star">' + ICON.star + '</div><div class="tt">Tier ' + (d.tier || "") + "</div>"; return el;
  }
  if (!el.querySelector(".spr")) { var n = mkCard(); el.innerHTML = n.innerHTML; }
  if (d.gold) cls.push("gold"); if (d.taunt) cls.push("taunt"); if (d.shield) cls.push("shield"); if (d.reborn) cls.push("reborn");
  if (d.dr) cls.push("hasdr"); if (c.tok) cls.push("tok"); if (d.frozen) cls.push("frozen");
  ["sel", "pick", "wind", "hit", "dying", "born", "shake"].forEach(function (k) { if (el.classList.contains(k)) cls.push(k); });
  el.className = cls.join(" ");
  var spr = el.querySelector(".spr"), key = stripKey(c);
  if (spr.dataset.key !== key) { spr.dataset.key = key; setSprite(spr, key, D.TINT[c.role]); spr.style.setProperty("--flip", D.FLIP[c.role] ? -1 : 1); }
  el.querySelector(".a").textContent = d.atk;
  var h = el.querySelector(".h"); h.textContent = d.hp; h.classList.toggle("hurt", !!d.hurt);
  var pips = el.querySelector(".pips"), want = d.showTier ? c.t : 0;
  if (pips.childElementCount !== want) { pips.innerHTML = ""; for (var i = 0; i < want; i++) pips.appendChild(document.createElement("i")); }
  var kw = el.querySelector(".kw"), kh = (d.wf ? ICON.wf : "") + (d.sour ? ICON.sour : "");
  if (kw.innerHTML !== kh) kw.innerHTML = kh.replace(/<svg/g, "<i><svg").replace(/<\/svg>/g, "</svg></i>");
  return el;
}
function ownedData(P, m, ctx) {
  var c = BY[m.id];
  if (c.spell) return { uid: m.uid, id: m.id, tier: m.tier, ctx: ctx };
  var kw = c.kw.concat(m.kwx || []);
  return { uid: m.uid, id: m.id, gold: m.gold, atk: E.atk(P, m), hp: E.hp(P, m), taunt: kw.indexOf("taunt") >= 0, shield: kw.indexOf("shield") >= 0,
    reborn: kw.indexOf("reborn") >= 0, wf: kw.indexOf("wf") >= 0, sour: kw.indexOf("sour") >= 0, dr: !!c.dr, ctx: ctx, showTier: ctx === "hand" };
}
function shopData(P, s) {
  var c = BY[s.id], tb = P.tavern[c.r] || [0, 0];
  return { uid: s.uid, id: s.id, atk: c.a + tb[0], hp: c.h + tb[1], taunt: c.kw.indexOf("taunt") >= 0, shield: c.kw.indexOf("shield") >= 0,
    reborn: c.kw.indexOf("reborn") >= 0, wf: c.kw.indexOf("wf") >= 0, sour: c.kw.indexOf("sour") >= 0, dr: !!c.dr, ctx: "shop", showTier: true, frozen: P.frozen };
}
function combatData(m) { var c = BY[m.id]; return { uid: m.uid, id: m.id, gold: m.gold, atk: m.atk, hp: m.hp, taunt: m.taunt, shield: m.shield, reborn: m.reborn, wf: m.wf, sour: m.sour, dr: !!c.dr, ctx: "combat", hurt: m.hp < (BY[m.id].h * (m.gold ? 2 : 1)) && false }; }

// keyed row sync: keeps elements (so animations survive) and orders them
function syncRow(row, list, onTap) {
  var keep = {}, els = {};
  Array.prototype.forEach.call(row.querySelectorAll(".card"), function (el) { els[el.dataset.uid] = el; });
  var prev = null;
  list.forEach(function (d) {
    var el = els[d.uid], fresh = false;
    if (!el) { el = mkCard(); fresh = true; if (onTap) el.addEventListener("click", function (ev) { ev.stopPropagation(); onTap(el.dataset.uid, el); }); }
    fillCard(el, d); keep[d.uid] = 1;
    if (fresh && d.born) { el.classList.add("born"); setTimeout(function () { el.classList.remove("born"); }, 320); }
    var ref = prev ? prev.nextSibling : row.firstChild;
    while (ref && ref.classList && !ref.classList.contains("card")) ref = ref.nextSibling;
    if (ref !== el) row.insertBefore(el, ref || null);
    prev = el;
  });
  Object.keys(els).forEach(function (u) {
    if (keep[u]) return; var el = els[u];
    if (el.classList.contains("dying")) return;
    if (ST.phase === "combat") { var ol = el.offsetLeft, ot = el.offsetTop; el.style.position = "absolute"; el.style.left = ol + "px"; el.style.top = ot + "px"; el.classList.add("dying"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300 / Math.min(FAST, 3)); }
    else el.parentNode.removeChild(el);
  });
}
function cardEl(uid) { return document.querySelector('.card[data-uid="' + uid + '"]'); }


// ---------------- sizes: minions as big as the space allows ----------------
var FIXN = 0;
function sizeRows(nA, nB, nH) {
  var mid = $("mid"), cs = getComputedStyle(mid), Hm = mid.clientHeight, Wm = mid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2 * 14, phone = window.innerWidth < 700;
  var gap = phone ? 5 : 10, maxW = phone ? 92 : 150, combat = ST.phase === "combat";
  var handH = combat ? 0 : (phone ? 104 : 150), barH = 54, air = phone ? 30 : 48;
  var rowMax = (Hm - barH - handH - (combat ? 0 : 10) - air) / 2 - 12;
  var n = Math.max(nA || 0, nB || 0, FIXN, 1);
  var cw = Math.min((Wm - (n - 1) * gap) / n, maxW);
  var ch = Math.min(cw / 0.58, rowMax, phone ? 999 : 240);
  cw = Math.min(cw, ch * 0.78);
  var hw = Math.min(cw * 0.8, phone ? 70 : 118), hh = Math.min(hw / 0.62, handH - 10);
  hw = Math.min(hw, hh * 0.72);
  var k = nH || 0, hov = k * hw + (k - 1) * 4 > Wm ? -(k * hw - Wm + 8) / Math.max(1, k - 1) : 0;
  app.style.setProperty("--gap", gap + "px"); app.style.setProperty("--cw", cw.toFixed(1) + "px"); app.style.setProperty("--ch", ch.toFixed(1) + "px");
  app.style.setProperty("--hw", hw.toFixed(1) + "px"); app.style.setProperty("--hh", hh.toFixed(1) + "px"); app.style.setProperty("--hov", hov.toFixed(1) + "px");
  $("rowH").classList.toggle("many", hov < 0);
  ST.cardSize = Math.round(cw) + "x" + Math.round(ch);
}
window.addEventListener("resize", function () { if (ST.phase === "shop") render(); else if (ST.lastSize) sizeRows.apply(null, ST.lastSize); });

// ---------------- lobby, bar, foot ----------------
function renderLobby(oppIdx) {
  var L = $("lobby"); L.innerHTML = "";
  ST.g.players.forEach(function (P) {
    var d = document.createElement("div"); d.className = "chip" + (P.you ? " you" : "") + (!P.alive ? " dead" : "") + (P.idx === oppIdx ? " opp" : "");
    var f = document.createElement("div"); f.className = "face"; faceStyle(f, P.hero.art, window.innerWidth >= 700 ? 46 : 38); d.appendChild(f);
    var n = document.createElement("div"); n.className = "n"; n.textContent = ST.shownHp[P.idx] != null ? ST.shownHp[P.idx] : P.hp + P.armor; d.appendChild(n);
    d.addEventListener("click", function (ev) { ev.stopPropagation(); openSheet({ kind: "player", P: P }); });
    L.appendChild(d);
  });
}
function heroEl(el, h, hp, armor) {
  if (!el.querySelector(".spr")) el.innerHTML = '<div class="spr"></div><div class="ar"></div><div class="hp"></div>';
  var spr = el.querySelector(".spr"); if (h && spr.dataset.key !== h.art) { spr.dataset.key = h.art; setSprite(spr, h.art); }
  el.querySelector(".hp").textContent = hp; el.querySelector(".ar").textContent = armor > 0 ? armor : "";
}
function renderBar() {
  var P = ST.you, g = ST.g;
  $("tierN").textContent = P.tier;
  var uc = E.upCost(g, P);
  $("bUp").classList.toggle("off", uc == null || P.gold < uc); $("upC").textContent = uc == null ? "" : uc;
  $("bUp").style.display = uc == null ? "none" : "";
  $("refC").textContent = P.freeRefresh > 0 ? 0 : 1;
  $("bRef").classList.toggle("off", P.freeRefresh <= 0 && P.gold < 1);
  $("bFrz").classList.toggle("on", P.frozen);
  $("goldN").textContent = P.gold;
}
function renderFoot() {
  var P = ST.you;
  heroEl($("youHero"), P.hero, P.hp, P.armor);
  var b = $("bPow"), h = P.hero;
  b.innerHTML = ICON.power + (h.passive ? "" : '<span class="pc">' + h.cost + "</span>");
  b.className = "power" + (h.passive ? " passive" : "") + (!h.passive && !E.powerReady(P) ? " used" : "") + (ST.target === "power" ? " armed" : "");
}
function render() {
  if (!ST.you) return;
  var P = ST.you;
  renderBar(); renderFoot();
  if (ST.phase === "shop") {
    FIXN = 0; ST.lastSize = [P.shop.length, P.board.length, P.hand.length]; sizeRows(P.shop.length, P.board.length, P.hand.length);
    syncRow($("rowA"), P.shop.map(function (s) { return shopData(P, s); }), tapShop);
    syncRow($("rowB"), P.board.map(function (m) { var d = ownedData(P, m, "board"); return d; }), tapBoard);
    syncRow($("rowH"), P.hand.map(function (m) { return ownedData(P, m, "hand"); }), tapHand);
    Array.prototype.forEach.call($("rowB").querySelectorAll(".card"), function (el) { el.classList.toggle("pick", ST.target === "power"); });
  }
}

// ---------------- sheet (details on tap) ----------------
function openSheet(s) { ST.sheet = s; drawSheet(); $("veil").classList.add("on"); $("sheet").classList.add("on"); }
function closeSheet() { ST.sheet = null; $("veil").classList.remove("on"); $("sheet").classList.remove("on"); }
$("veil").addEventListener("click", closeSheet);
var ROLE = { drums: "Drums", bass: "Bass", lead: "Lead guitar", comping: "Keys", pad: "Strings", percussion: "Percussion", voice: "Voice", arp: "Arp", choir: "Choir", aux: "Hand percussion", horns: "Horns", texture: "Texture" };
var RACE = { bf: "Bellforge", ss: "Stormsong" };
function kwText(d) {
  var c = BY[d.id], t = c.tx || "";
  var extra = [];
  if (d.taunt && c.kw.indexOf("taunt") < 0) extra.push("Taunt");
  if (d.shield && c.kw.indexOf("shield") < 0) extra.push("Divine Shield");
  if (d.wf && c.kw.indexOf("wf") < 0) extra.push("Windfury");
  if (d.reborn && c.kw.indexOf("reborn") < 0) extra.push("Reborn");
  if (d.sour && c.kw.indexOf("sour") < 0) extra.push("Sour Note");
  return (extra.length ? extra.join(". ") + ". " : "") + t;
}
function btn(label, fn, cls, off) { var b = document.createElement("button"); b.className = "btn " + (cls || ""); b.textContent = label; if (off) b.classList.add("off"); b.addEventListener("click", function (e) { e.stopPropagation(); fn(); }); return b; }
function drawSheet() {
  var s = ST.sheet, box = $("sheet"); if (!s) return;
  box.innerHTML = ""; var P = ST.you;
  var wrap = document.createElement("div"); wrap.className = "sh";
  var acts = document.createElement("div"); acts.className = "acts";
  if (s.kind === "player") {
    var he = document.createElement("div"); he.className = "hero"; heroEl(he, s.P.hero, s.P.hp, s.P.armor); wrap.appendChild(he);
    var tx = document.createElement("div");
    tx.innerHTML = "<h3></h3><div class=meta></div><p></p>";
    tx.querySelector("h3").textContent = s.P.name + (s.P.you ? " (you)" : "");
    tx.querySelector(".meta").textContent = s.P.hero.pn + (s.P.hero.passive ? "" : " - " + s.P.hero.cost + " gold") + (s.P.alive ? " - Tier " + s.P.tier : " - out, " + ordinal(s.P.place));
    tx.querySelector("p").textContent = s.P.hero.tx;
    wrap.appendChild(tx);
    if (s.P.you && ST.phase === "shop" && !s.P.hero.passive) acts.appendChild(btn("Use", function () { closeSheet(); tapPower(); }, "acc", !E.powerReady(P)));
  } else {
    var big = document.createElement("div"); big.className = "big"; var el = fillCard(mkCard(), s.d); big.appendChild(el); wrap.appendChild(big);
    var c = BY[s.d.id], tx2 = document.createElement("div");
    tx2.innerHTML = "<h3></h3><div class=meta></div><p></p>";
    tx2.querySelector("h3").textContent = (s.d.gold ? "Golden " : "") + c.n;
    tx2.querySelector(".meta").textContent = c.spell ? "Tier " + s.d.tier : (c.tok ? "" : "Tier " + c.t + " - ") + RACE[c.r] + " - " + ROLE[c.role];
    tx2.querySelector("p").textContent = c.spell ? "Discover a musician from Tier " + s.d.tier + "." : (kwText(s.d) || (c.tok ? "" : "No ability."));
    wrap.appendChild(tx2);
    if (ST.phase === "shop") {
      if (s.kind === "shop") acts.appendChild(btn("Buy  3", function () { doBuy(s.idx); }, "acc", !E.canBuy(P)));
      if (s.kind === "hand") acts.appendChild(btn("Play", function () { doPlay(s.m); }, "acc", !c.spell && P.board.length >= 7));
      if (s.kind === "board") {
        var i = P.board.indexOf(s.m);
        acts.appendChild(btn("<", function () { move(s.m, -1); }, "", i <= 0));
        acts.appendChild(btn(">", function () { move(s.m, 1); }, "", i >= P.board.length - 1));
        acts.appendChild(btn("Sell  1", function () { doSell(s.m); }, "acc"));
      }
    }
    if (!c.spell) preview(c, s.d.gold);
  }
  box.appendChild(wrap); if (acts.childElementCount) box.appendChild(acts);
}
function ordinal(n) { return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"); }

// ---------------- shop actions ----------------
function tapShop(uid) { if (ST.phase !== "shop") return; var P = ST.you, i = P.shop.findIndex(function (s) { return String(s.uid) === String(uid); }); if (i < 0) return;
  ST.target = null; openSheet({ kind: "shop", idx: i, d: shopData(P, P.shop[i]) }); }
function tapHand(uid) { if (ST.phase !== "shop") return; var P = ST.you, m = P.hand.find(function (x) { return String(x.uid) === String(uid); }); if (!m) return;
  ST.target = null; openSheet({ kind: "hand", m: m, d: ownedData(P, m, "hand") }); }
function tapBoard(uid) {
  var P = ST.you;
  if (ST.phase === "combat") { var el = cardEl(uid); if (el && el._d) openSheet({ kind: "combat", d: el._d }); return; }
  var m = P.board.find(function (x) { return String(x.uid) === String(uid); }); if (!m) return;
  if (ST.target === "power") { ST.target = null; E.usePower(ST.g, P, m); AU.sfx(1, null, 0.35); render(); return; }
  openSheet({ kind: "board", m: m, d: ownedData(P, m, "board") });
}
function tapRival(uid) { var el = cardEl(uid); if (el && el._d) openSheet({ kind: "combat", d: el._d }); }
function doBuy(i) { var P = ST.you; if (E.buy(ST.g, P, i)) { AU.sfx(1, null, 0.4); afterChange(); } closeSheet(); }
function doPlay(m) {
  var P = ST.you; closeSheet();
  if (E.play(ST.g, P, m)) { AU.sfx(3, null, 0.3); preview(BY[m.id], m.gold); afterChange(); }
}
function doSell(m) { E.sell(ST.g, ST.you, m); AU.sfx(2, null, 0.4); closeSheet(); afterChange(); }
function move(m, d) { var B = ST.you.board, i = B.indexOf(m), j = i + d; if (j < 0 || j >= B.length) return; B.splice(i, 1); B.splice(j, 0, m); render(); drawSheet(); }
function afterChange() { render(); if (ST.you.discover.length) showDiscover(); }
$("bUp").addEventListener("click", function () { if (E.upgrade(ST.g, ST.you)) { AU.sfx(5, null, 0.4); render(); } });
$("bRef").addEventListener("click", function () { if (E.refresh(ST.g, ST.you)) { AU.sfx(3, null, 0.35); render(); } });
$("bFrz").addEventListener("click", function () { ST.you.frozen = !ST.you.frozen; render(); });
$("bFight").addEventListener("click", function () { if (ST.phase === "shop") endTurn(); });
$("youHero").addEventListener("click", function (e) { e.stopPropagation(); openSheet({ kind: "player", P: ST.you }); });
function tapPower() {
  var P = ST.you, h = P.hero; if (ST.phase !== "shop") return;
  if (h.passive) { openSheet({ kind: "player", P: P }); return; }
  if (!E.powerReady(P)) return;
  if (h.target) { if (!P.board.length) return; ST.target = ST.target === "power" ? null : "power"; render(); return; }
  E.usePower(ST.g, P); AU.sfx(3, null, 0.35); render();
}
$("bPow").addEventListener("click", function (e) { e.stopPropagation(); tapPower(); });
document.addEventListener("click", function () { if (ST.target) { ST.target = null; render(); } });

// ---------------- discover and hero pick ----------------
function showPick(opts, onPick) {
  var box = $("pickbox"); box.innerHTML = "";
  opts.forEach(function (o, i) {
    var d = document.createElement("button"); d.className = "opt";
    d.appendChild(o.el);
    var h = document.createElement("h4"); h.textContent = o.title; d.appendChild(h);
    if (o.sub) { var s = document.createElement("div"); s.className = "pn"; s.textContent = o.sub; d.appendChild(s); }
    var p = document.createElement("p"); p.textContent = o.text; d.appendChild(p);
    d.addEventListener("click", function (e) { e.stopPropagation(); $("pick").classList.remove("on"); onPick(i); });
    box.appendChild(d);
  });
  $("pick").classList.add("on");
}
function showDiscover() {
  var P = ST.you, d = E.offerDiscover(ST.g, P);
  if (!d) return;
  if (!d.offer.length) { P.discover.shift(); render(); return; }
  if (AUTO) { E.aiDiscover(ST.g, P); render(); return; }
  showPick(d.offer.map(function (id) {
    var c = BY[id], el = fillCard(mkCard(), shopData(P, { uid: "d" + id, id: id }));
    el.classList.remove("frozen");
    return { el: el, title: c.n, sub: "Tier " + c.t + " - " + RACE[c.r], text: c.tx || "No ability." };
  }), function (i) { E.chooseDiscover(ST.g, P, i); AU.sfx(1, null, 0.4); afterChange(); });
}
function startGame() {
  closeSheet(); $("end").classList.remove("on");
  SQ.length = 0;
  ST.g = E.newGame(AUTO ? 12345 + Math.floor(Math.random() * 1000) : 0); ST.phase = "pick"; ST.done = false; ST.place = 0; ST.shownHp = {};
  var offer = E.heroOffer(ST.g, 3);
  function pick(i) {
    E.addPlayers(ST.g, offer[i]); ST.you = ST.g.players[0];
    $("rowA").innerHTML = ""; $("rowB").innerHTML = '<div class="slotline"></div>'; $("rowH").innerHTML = "";
    nextTurn();
  }
  if (AUTO) { pick(0); return; }
  showPick(offer.map(function (h) {
    var el = document.createElement("div"); el.className = "hero"; heroEl(el, h, 30, h.armor);
    return { el: el, title: h.n, sub: h.pn + (h.passive ? "" : " - " + h.cost + " gold"), text: h.tx };
  }), pick);
}
$("bAgain").addEventListener("click", startGame);

// ---------------- turns ----------------
function nextTurn() {
  E.startTurn(ST.g);
  ST.phase = "shop"; app.className = "phase-shop"; ST.target = null;
  $("rowA").innerHTML = ""; $("rivalhero").innerHTML = "";
  renderLobby(-1); render();
  ST.timerEnd = AUTO ? 0 : AU.now() + E.R.turnTime(ST.g.turn);
  ST.timerLen = E.R.turnTime(ST.g.turn);
  shopBar = 0;
  if (AUTO) setTimeout(function () { try { E.aiTurn(ST.g, ST.you); render(); } catch (e) { ST.errors.push(String(e.stack || e)); } setTimeout(endTurn, 120); }, 60);
}
function timerTick(now) {
  var bar = $("timer").firstChild;
  if (ST.phase !== "shop" || !ST.timerEnd) { bar.style.transform = "scaleX(0)"; return; }
  var left = ST.timerEnd - now; bar.style.transform = "scaleX(" + Math.max(0, left / ST.timerLen) + ")";
  if (left <= 0) endTurn();
}
function endTurn() {
  if (ST.phase !== "shop") return;
  closeSheet(); $("pick").classList.remove("on");
  var g = ST.g, P = ST.you;
  // unplayed discovers resolve to the first offer, as the game does on time out
  while (P.discover.length) { E.offerDiscover(g, P); E.chooseDiscover(g, P, 0); }
  ST.phase = "fightprep";
  E.endTurn(g, P);
  g.players.forEach(function (Q) { if (!Q.you && Q.alive) { E.aiTurn(g, Q); E.endTurn(g, Q); } });
  g.players.forEach(function (Q) { ST.shownHp[Q.idx] = Q.hp + Q.armor; });
  var out = E.fightRound(g);
  ST.turnsPlayed++;
  if (!out.mine) { afterFight(); return; }
  playFight(out.mine, afterFight);
}
function afterFight() {
  ST.shownHp = {};
  renderLobby(-1); renderFoot();
  var P = ST.you, alive = ST.g.players.filter(function (p) { return p.alive; });
  if (!P.alive || alive.length <= 1) { finish(P.alive ? 1 : P.place); return; }
  nextTurn();
}
function finish(place) {
  ST.phase = "end"; ST.done = true; ST.place = place;
  $("endPlace").textContent = ordinal(place);
  var w = ST.g.players.filter(function (p) { return p.place === 1 || (p.alive && place !== 1); })[0];
  $("endWho").textContent = place === 1 ? ST.you.name + " - last band standing" : (w ? w.name + " still standing" : "");
  $("end").classList.add("on");
  if (place <= 4) AU.sfx(4, null, 0.4);
}

// ---------------- shop music: your band plays Iron March quietly ----------------
var shopBar = 0, shopNext = 0;
function levelOf(c, gold) { return gold ? "solo" : c.t <= 2 ? 1 : c.t <= 4 ? 2 : 3; }
function shopMusic(now) {
  if (ST.phase !== "shop" || !AU.live()) { shopNext = 0; return; }
  var bl = sd() * 16;
  if (!shopNext || shopNext < now - 0.5) shopNext = now + 0.1;
  if (shopNext - now > 0.2) return;
  var t = shopNext, bar = shopBar++; shopNext += bl;
  var race = ST.you.hero.r, s = sd();
  for (var k = 0; k < 16; k += 2) AU.drum(race, "hat", t + k * s, k % 4 === 0 ? 0.22 : 0.14);
  AU.drum(race, "kick", t, 0.3);
  var seen = {};
  ST.you.board.slice(0, 7).forEach(function (m, i) {
    var c = BY[m.id], type = D.SONGTYPE[c.role], key = c.r + type, lv = m.gold ? 3 : (c.t <= 2 ? 1 : c.t <= 4 ? 2 : 3);
    if (seen[key] && seen[key] >= lv) return; seen[key] = lv;
    AU.phrase(c.r, type, lv, bar, t, 0, 16, s, "you", (i - 3) / 6, 0.42, "shop" + key);
  });
  if (!ST.you.board.length) AU.pad(race, bar, t, bl * 0.95, 0.5);
}
var lastPreview = 0;
function preview(c, gold) {
  if (!AU.live() || ST.phase !== "shop") return;
  var now = AU.now(); if (now - lastPreview < 0.3) return; lastPreview = now;
  var s = sd(), beat = s * 4, t = Math.ceil((now + 0.05) / beat) * beat;
  var bar = shopBar; AU.phrase(c.r, D.SONGTYPE[c.role], levelOf(c, gold), bar, t, 0, 8, s, "you", 0, 0.9, "pv");
}

// ---------------- the fight, played as the song ----------------
function rivalOf(res) {
  var g = ST.g, mine = res.a === 0 ? 0 : 1;
  var oi = mine === 0 ? res.b : res.a;
  if (oi === -1 || oi == null) return { name: res.ghost ? res.ghost.name : "Empty Stage", hero: res.ghost ? res.ghost.hero : null, idx: -1 };
  var Q = g.players[oi]; return { name: Q.name, hero: Q.hero, idx: Q.idx, P: Q };
}
function playFight(res, done) {
  var r = res.r, mine = res.a === 0 ? 0 : 1, them = 1 - mine, riv = rivalOf(res);
  ST.phase = "combat"; app.className = "phase-combat"; ST.fights++;
  renderLobby(riv.idx);
  var you = ST.you, yr = you.hero.r, tr = riv.hero ? riv.hero.r : (yr === "bf" ? "ss" : "bf");
  // rival hero in the bar
  var rh = $("rivalhero"); rh.innerHTML = "";
  var he = document.createElement("div"); he.className = "hero"; he.id = "rivHero";
  heroEl(he, riv.hero || D.HEROES[1], riv.P ? ST.shownHp[riv.idx] : 0, 0);
  if (riv.P) { he.querySelector(".hp").textContent = ST.shownHp[riv.idx]; }
  var nm = document.createElement("div"); nm.className = "nm"; nm.textContent = riv.name;
  rh.appendChild(he); rh.appendChild(nm);
  heroEl($("youHero"), you.hero, ST.shownHp[0], 0); $("youHero").querySelector(".ar").textContent = "";
  $("youHero").querySelector(".hp").textContent = ST.shownHp[0];
  $("rowA").innerHTML = ""; $("rowB").innerHTML = '<div class="slotline"></div>';
  FIXN = Math.max(r.initial[0].length, r.initial[1].length, 1); ST.lastSize = [0, 0, 0]; sizeRows(0, 0, 0);
  function show(snap, born) {
    var big = Math.max(snap[0].length, snap[1].length); if (big > FIXN) { FIXN = big; sizeRows(0, 0, 0); }
    var bset = {}; (born || []).forEach(function (u) { bset[u] = 1; });
    var A = snap[them].map(function (m) { var d = combatData(m); d.born = bset[m.uid]; return d; });
    var B = snap[mine].map(function (m) { var d = combatData(m); d.born = bset[m.uid]; return d; });
    syncRow($("rowA"), A, tapRival); syncRow($("rowB"), B, tapBoard);
    A.concat(B).forEach(function (d) { var el = cardEl(d.uid); if (el) el._d = d; });
  }
  show(r.initial);
  var s = sd(), t0 = AU.now() + 0.25, T = function (step) { return t0 + step * s; };
  var raceOf = function (side) { return side === mine ? yr : tr; };
  var tag = function (side) { return side === mine ? "you" : "them"; };
  // count-in bar: the bandleaders count the band in
  [0, 4, 8, 12].forEach(function (k) { at(T(k), function (t) { AU.click(yr, t, k === 12); }, true); });
  at(T(0), function () { $("youHero").classList.add("conduct"); var rv = $("rivHero"); if (rv) rv.classList.add("conduct"); });
  at(T(16), function () { $("youHero").classList.remove("conduct"); var rv = $("rivHero"); if (rv) rv.classList.remove("conduct"); });
  var cursor = 16, nAtk = 0, prevSnap = r.initial;
  function findIn(snap, uid) { for (var k = 0; k < 2; k++) for (var i = 0; i < snap[k].length; i++) if (snap[k][i].uid === uid) return { m: snap[k][i], side: k, i: i, n: snap[k].length }; return null; }
  r.events.forEach(function (ev) {
    var full = ev.k === "atk" && !ev.extra && nAtk < 6;
    var L = full ? 16 : 8;
    if (full && cursor % 16) cursor += 8;
    var start = cursor, land = cursor + L, bar = Math.floor(start / 16), from = start % 16;
    var src = ev.src != null ? findIn(prevSnap, ev.src) : null;
    var side = ev.s;
    if (ev.k === "hero") {
      var hr = raceOf(side);
      at(T(start - from), function (t) { AU.phrase(hr, "drums", 2, bar, t, from, L, s, tag(side), 0, 0.9, "hero" + side); }, true);
      at(T(start), function () { var h = side === mine ? $("youHero") : $("rivHero"); if (h) h.classList.add("conduct"); });
      at(T(land), function () { var h = side === mine ? $("youHero") : $("rivHero"); if (h) h.classList.remove("conduct"); });
    } else if (src) {
      var c = BY[src.m.id], type = D.SONGTYPE[c.role], lv = levelOf(c, src.m.gold), pan = (src.i - (src.n - 1) / 2) / 6 + (side === mine ? -0.1 : 0.1);
      at(T(start - from), function (t) { AU.phrase(c.r, type, lv, bar, t, from, L, s, tag(side), pan, 1, "f" + side + type); }, true);
      at(T(start), function () { var el = cardEl(ev.src); if (el) el.classList.add("wind"); });
    }
    // the hit lands on the downbeat (or strong beat) after the phrase
    var tl = T(land), lungeT = tl - Math.min(0.12, s * 1.5);
    if (ev.k === "atk" && ev.tgt != null) {
      at(lungeT, function () {
        var a = cardEl(ev.src), b = cardEl(ev.tgt); if (!a || !b) return;
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        a.style.transform = "translate(" + ((rb.left - ra.left) * 0.8) + "px," + ((rb.top - ra.top) * 0.8) + "px) scale(1.06)";
      });
    }
    var dmgHits = (ev.hits || []).filter(function (h) { return h.amt > 0 || h.kill; }), pops = (ev.hits || []).filter(function (h) { return h.pop; });
    var attRace = src ? BY[src.m.id].r : raceOf(side);
    if (dmgHits.length) at(tl, function (t) { AU.impact(attRace, t, (ev.died || []).length > 0, tag(side)); }, true);
    if ((ev.died || []).length) at(tl, function (t) { AU.crash(attRace, t, 0.6); }, true);
    if (pops.length) at(tl, function (t) { AU.chime(attRace, Math.floor(land / 16), t); }, true);
    at(tl, function () {
      var late = AU.now() - tl; if (Math.abs(late) < 0.06) ST.hitsOnBeat++; else ST.hitsOff++;
      var a = cardEl(ev.src); if (a) { a.classList.remove("wind"); a.style.transform = ""; }
      (ev.hits || []).forEach(function (h) {
        var el = cardEl(h.uid); if (!el) return;
        var f = document.createElement("span"); f.className = "float" + (h.pop ? " pop" : ""); f.textContent = h.pop ? "0" : h.kill ? "x" : "-" + h.amt;
        el.appendChild(f); setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 800);
        el.classList.add("shake"); setTimeout(function () { el.classList.remove("shake"); }, 260);
      });
      show(ev.snap, ev.born);
    });
    if (ev.k === "atk") nAtk++;
    cursor = land; prevSnap = ev.snap || prevSnap;
  });
  // outro: the winners play a bar together, the damage lands on the next downbeat
  if (cursor % 16) cursor += 8;
  var endBar = Math.floor(cursor / 16);
  var winSide = r.winner < 0 ? -1 : r.winner;
  if (winSide >= 0) {
    var seen = {};
    prevSnap[winSide].slice(0, 7).forEach(function (m, i) {
      var c = BY[m.id], type = D.SONGTYPE[c.role]; if (seen[c.r + type]) return; seen[c.r + type] = 1;
      at(T(cursor), function (t) { AU.phrase(c.r, type, 1, endBar, t, 0, 16, s, tag(winSide), (i - 3) / 7, 0.75, "o" + winSide + type); }, true);
    });
    at(T(cursor), function () { Array.prototype.forEach.call(document.querySelectorAll(winSide === mine ? "#rowB .card" : "#rowA .card"), function (el) { el.classList.add("wind"); }); });
  }
  // bed: hats, kick and the chord under the whole fight, so the gaps are still the song
  for (var b = 1; b <= endBar + 1; b++) (function (b) {
    at(T(b * 16), function (t) {
      AU.pad(yr, b, t, s * 16 * 0.95, 0.55); AU.bassRoot(yr, b, t, s * 6, 0.45);
      for (var k = 0; k < 16; k += 2) AU.drum(yr, "hat", t + k * s, k % 4 === 0 ? 0.2 : 0.12);
      AU.drum(yr, "kick", t, 0.28); AU.drum(yr, "kick", t + 8 * s, 0.22);
    }, true);
  })(b);
  var hitStep = cursor + 16;
  if (winSide >= 0) {
    var loser = winSide === mine ? "rivHero" : "youHero";
    at(T(hitStep), function (t) { AU.impact(raceOf(winSide), t, true, tag(winSide)); AU.crash(raceOf(winSide), t, 1); }, true);
    at(T(hitStep), function () {
      Array.prototype.forEach.call(document.querySelectorAll(".card.wind"), function (el) { el.classList.remove("wind"); });
      var h = $(loser); if (!h) return; h.classList.add("hurt", "shake");
      var dm = document.createElement("div"); dm.className = "dmg"; dm.textContent = "-" + res.dmg; h.appendChild(dm);
      var idx = winSide === mine ? riv.idx : 0;
      if (idx >= 0) { var Pl = ST.g.players[idx]; h.querySelector(".hp").textContent = Pl.hp; h.querySelector(".ar").textContent = Pl.armor > 0 ? Pl.armor : ""; ST.shownHp[idx] = Pl.hp + Pl.armor; renderLobby(riv.idx); }
      setTimeout(function () { h.classList.remove("hurt", "shake"); }, 500);
    });
    if (winSide === mine) at(T(hitStep), function (t) { AU.sfx(4, t, 0.25); }, true);
  }
  at(T(hitStep + 16), function () { Array.prototype.forEach.call(document.querySelectorAll(".hero"), function (h) { h.classList.remove("conduct"); }); done(); });
}

// keyboard on PC (optional): space ends the turn
document.addEventListener("keydown", function (e) { if (e.code === "Space" && ST.phase === "shop") { e.preventDefault(); endTurn(); } });

startGame();
})();
