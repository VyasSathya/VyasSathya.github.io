// Bazaar Stage: The Bazaar's core loop played as a battle of the bands.
// Rules and numbers: docs/research/real-game/02-card-lineup-b.md s1, docs/research/families/items.md s d,
// docs/design/model-game.md s4-5. Where the research says "Not found", the number here is ours and README.md says so.
(function () {
  "use strict";
  var CARDS = window.CARDS, CARD = window.CARD, SONG = window.SONG, RACES = window.RACES, cardVal = window.cardVal;
  var Q = new URLSearchParams(location.search);
  function isAuto() { return window.__auto === true || Q.get("auto") === "1"; }
  var RT_FIRST = Q.get("rt") === "1"; // auto: play the first fight in real time with the song, the rest instantly

  // ---------- rules ----------
  var TIERS = ["Bronze", "Silver", "Gold", "Diamond"];
  var SIZE = ["", "Small", "Medium", "Large"];
  var RULE = {
    startGold: 15, income: 7, fans: 20, winGoal: 10, slotStart: 4, slotStep: 2, slotMax: 10, stash: 10, // research
    xpPerLevel: 4, // ours (Not found)
    sandstormAt: 30 // seconds; research
  };
  function maxHp(level) { return 400 + 90 * (level - 1); } // ours: research has health bars of 350 to 1,170 in shots
  var MONSTER_REWARD = [[2, 3], [3, 3], [4, 3], [5, 4], [6, 4]]; // gold, xp by monster tier; research
  var REROLL = [2, 4, 6, 8]; // merchant tier; research (Bronze 1-4, mostly 2 or 3)
  var TONES = {
    deadly: { name: "Accent", bz: "Deadly", c: "#e5484d", text: "+50% Accent chance." },
    heavy: { name: "Low Tuning", bz: "Heavy", c: "#3e63dd", text: "Each play: half time on 2 rival instruments for 1 s." },
    icy: { name: "Stop-Time", bz: "Icy", c: "#5bc4e6", text: "Each play: Rest 1 rival instrument for 1 s." },
    shiny: { name: "Delay", bz: "Shiny", c: "#e6e6e6", text: "+1 Repeat (an echo)." },
    turbo: { name: "Overdrive", bz: "Turbo", c: "#2f9e65", text: "Each play: double time on 2 of your instruments for 2 s." },
    obsidian: { name: "Fuzz", bz: "Obsidian", c: "#333", text: "Double Hit." },
    golden: { name: "Gold-Plated", bz: "Golden", c: "#d4a72c", text: "Double value." }
  };
  var TONE_IDS = Object.keys(TONES);
  var ART = { drums: "drums", bass: "bass", lead: "guitar", keys: "keys", strings: "strings", taiko: "taiko", voice: "singer", singer: "singer", arp: "arp", choir: "choir" };
  var PART = { drums: "drums", bass: "bass", lead: "lead", keys: "keys", strings: "strings", taiko: "taiko", voice: "voice", singer: "voice", arp: "arp", choir: "choir" };
  var LEADERS = {
    bellforge: [{ k: "conductor", n: "Brass Stag" }, { k: "countin", n: "Brass Boar" }, { k: "frontman", n: "Brass Lion" }],
    stormsong: [{ k: "conductor", n: "Wind Spirit" }, { k: "countin", n: "Thunder Wolf" }, { k: "frontman", n: "Storm Crow" }]
  };
  var BAND1 = ["Iron", "Copper", "Storm", "Velvet", "Hollow", "Thunder", "Brass", "Salt", "Moss", "Lantern", "Rust", "Gale"];
  var BAND2 = ["Tide", "Choir", "Kings", "Anvils", "Owls", "Engines", "Bells", "Drums", "Comets", "Harbor", "Crows", "Hearts"];
  var ACTS = ["Bilge Rats", "Dockside Brass", "Harbor House Band", "Gull Choir", "Rope Knot Trio", "Tavern Fiddlers", "Lamp Post Quartet", "Pier Drummers", "Barnacle Boys", "Fog Horn Five"];

  function rngOf(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pickOne(rng, a) { return a[Math.floor(rng() * a.length)]; }
  function shuffle(rng, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function price(card, tier, ench) { return 2 * card.size * Math.pow(2, tier) * (ench ? 2 : 1); }
  function itemValue(it) { var v = Math.floor(price(it.card, it.tier) / 2) + (it.perm.value || 0); return it.ench === "golden" ? v * 2 : v; }
  function dayTier(day) { return day <= 2 ? 0 : day <= 4 ? 1 : day <= 7 ? 2 : 3; }
  // offer tier odds by day: ours (Not found in research)
  function rollTier(rng, day) {
    var w = day <= 2 ? [1, 0, 0, 0] : day <= 4 ? [0.6, 0.4, 0, 0] : day <= 6 ? [0.3, 0.5, 0.2, 0] : day <= 9 ? [0.1, 0.4, 0.4, 0.1] : [0, 0.3, 0.5, 0.2];
    var x = rng(), s = 0; for (var i = 0; i < 4; i++) { s += w[i]; if (x < s) return i; } return 0;
  }
  function tierCap(day) { return day <= 2 ? 0 : day <= 4 ? 1 : day <= 6 ? 2 : 3; }

  // ---------- run ----------
  var R = null;
  window.__log = { fights: [], uses: [], audio: [], errors: [], runs: 0, done: false, result: null };
  function newRun(race, seed) {
    seed = seed || ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    R = { seed: seed, rng: rngOf(seed), race: race, foeRace: race === "bellforge" ? "stormsong" : "bellforge", day: 1, hour: 1,
      gold: RULE.startGold, income: RULE.income, fans: RULE.fans, encore: false, wins: 0, losses: 0, level: 1, xp: 0,
      board: [], stash: [], uid: 1, phase: "encounters", enc: null, shop: null, showStash: false, fightsSeen: 0, over: false };
    R.give = function (id, tier) { return giveItem(CARD[id], tier || 0, null); };
    R.giveRandom = function (pred) { var c = CARDS.filter(pred); if (c.length) giveItem(pickOne(R.rng, c), 0, null); };
    window.__log.runs++;
    startHour();
  }
  function mkItem(card, tier, ench) { return { uid: R ? R.uid++ : 0, card: card, id: card.id, tier: tier, ench: ench || null, perm: {} }; }
  function slots() { return Math.min(RULE.slotMax, RULE.slotStart + RULE.slotStep * (R.level - 1)); }
  function used() { return R.board.reduce(function (a, b) { return a + b.card.size; }, 0); }
  function owned() { return R.board.concat(R.stash); }
  function giveItem(card, tier, ench) {
    var it = mkItem(card, Math.max(tier, card.start), ench);
    if (used() + card.size <= slots()) R.board.push(it);
    else if (R.stash.length < RULE.stash) R.stash.push(it);
    else { toast("No room for " + card.name); return null; }
    return it;
  }
  function gainXp(n) {
    R.xp += n;
    while (R.xp >= RULE.xpPerLevel) { R.xp -= RULE.xpPerLevel; R.level++; toast("Level " + R.level + (slots() <= RULE.slotMax ? ": stage " + slots() + " slots" : "")); }
  }

  // hours: 1, 2, 4, 5 pick 1 of 3 stops; 3 opening act from 3; 6 battle of the bands
  function startHour() {
    R.showStash = false; R.shop = null; R.pick = null;
    if (R.hour === 3) { R.phase = "monsters"; R.enc = makeMonsters(); }
    else if (R.hour === 6) { R.phase = "prefight"; R.foe = makeGhost(R.day); }
    else { R.phase = "encounters"; R.enc = makeEncounters(); }
    render();
  }
  function nextHour() {
    if (R.over) return;
    R.hour++;
    if (R.hour > 6) {
      R.day++; R.hour = 1; R.gold += R.income;
      owned().forEach(function (it) { if (it.card.run && it.card.run.day) it.card.run.day(R, it); });
      toast("Night " + R.day + ": +" + R.income + " gold");
    }
    startHour();
  }

  // ---------- encounters ----------
  var MERCHANTS = [
    { id: "drum", name: "Drum Shop", sub: "Sells Strike", f: function (k) { return k.tags.indexOf("Strike") >= 0; }, art: "drums" },
    { id: "tide", name: "Tide Market", sub: "Sells Tide", f: function (k) { return k.tags.indexOf("Tide") >= 0; }, art: "arp" },
    { id: "pawn", name: "Pawn Shop", sub: "Sells Medium", f: function (k) { return k.size === 2; }, art: "keys" },
    { id: "busk", name: "Busker Cart", sub: "Sells Small", f: function (k) { return k.size === 1; }, art: "singer" },
    { id: "yard", name: "Fixture Yard", sub: "Sells Large", f: function (k) { return k.size === 3; }, art: "choir" },
    { id: "fuzz", name: "Fuzz Box", sub: "Sells Feedback", f: function (k) { return (k.st || []).indexOf("burn") >= 0; }, art: "guitar" },
    { id: "gear", name: "Roadie Van", sub: "Sells Gear", f: function (k) { return k.tags.indexOf("Gear") >= 0; }, art: "bass" },
    { id: "luth", name: "Luthier", sub: "Sells one tier up", f: function () { return true; }, up: 1, art: "strings" },
    { id: "capt", name: "Captain's Shop", sub: "Your whole pool", f: function () { return true; }, n: 10, art: "taiko" },
    { id: "barg", name: "Bargain Bin", sub: "Half price", f: function () { return true; }, disc: 0.5, art: "keys" }
  ];
  function makeEncounters() {
    var rng = R.rng, opts = [], kinds = shuffle(rng, ["m", "m", "m", "e", "e", "g"]).slice(0, 3);
    var ms = shuffle(rng, MERCHANTS), mi = 0, evs = shuffle(rng, ["tip", "roadie", "tech", "promo", "rehearse"]), ei = 0;
    kinds.forEach(function (k) {
      if (k === "m") { var m = ms[mi++]; opts.push({ kind: "merchant", m: m, title: m.name, sub: m.sub, art: m.art }); }
      else if (k === "e") { var e = evs[ei++]; opts.push(makeEvent(e)); }
      else opts.push({ kind: "gift", title: "Gift", sub: "Take 1 of 3", art: "choir" });
    });
    return opts;
  }
  function makeEvent(id) {
    if (id === "tip") { var g = 3 + R.day; return { kind: "event", id: id, title: "Tip Jar", sub: "+" + g + " gold", g: g, art: "singer" }; }
    if (id === "roadie") return { kind: "event", id: id, title: "Roadie", sub: "Upgrade 1 instrument", art: "bass" };
    if (id === "tech") { var t = pickOne(R.rng, TONE_IDS); return { kind: "event", id: id, title: "Sound Tech", sub: "Tone: " + TONES[t].name, tone: t, art: "keys" }; }
    if (id === "promo") return { kind: "event", id: id, title: "Promoter", sub: "+1 income", art: "guitar" };
    return { kind: "event", id: id, title: "Rehearsal", sub: "+2 XP", art: "drums" };
  }
  function chooseEncounter(o) {
    if (o.kind === "merchant") { openShop(o.m); return; }
    if (o.kind === "gift") { R.phase = "gift"; R.offers = rollOffers(function () { return true; }, 3, 0); R.offers.forEach(function (x) { x.cost = 0; }); render(); return; }
    R.phase = "event"; R.ev = o; render();
  }
  var EVTEXT = {
    tip: function (o) { return ["The crowd filled the tip jar.", "Take " + o.g + " gold"]; },
    roadie: function () { return ["A roadie can rebuild one of your instruments a tier up.", "Choose an instrument"]; },
    tech: function (o) { return ["The sound tech dials in " + TONES[o.tone].name + ": " + TONES[o.tone].text + " It replaces any tone already on it.", "Choose an instrument"]; },
    promo: function () { return ["A promoter books more shows on the tour.", "Income +1 a night"]; },
    rehearse: function () { return ["One more run through the set.", "Take 2 XP"]; }
  };
  function renderEvent(l, r) {
    var o = R.ev, tx = EVTEXT[o.id](o);
    l.appendChild(el("div", "title", o.title));
    var c = el("div", "choice evt"); c.style.left = "0"; c.style.width = L.rowW + "px";
    c.innerHTML = '<div class="art"><img alt="" src="img/' + R.race[0] + "-" + o.art + '.jpg"></div><div class="tx"><div class="tt">' + o.title + '</div><div class="ss">' + tx[0] + "</div></div>";
    upper.appendChild(c);
    renderStashButton(r);
    var b = el("button", "btn go", tx[1]); b.onclick = function () { resolveEvent(o); }; r.appendChild(b);
  }
  function resolveEvent(o) {
    gainXp(1); // most events give 1 XP when chosen (research)
    if (o.id === "tip") { R.gold += o.g; toast("+" + o.g + " gold"); nextHour(); }
    else if (o.id === "promo") { R.income += 1; toast("Income " + R.income); nextHour(); }
    else if (o.id === "rehearse") { gainXp(2); nextHour(); }
    else if (o.id === "roadie") {
      var c = owned().filter(function (it) { return it.tier < 3; });
      if (!c.length) { nextHour(); return; }
      R.phase = "pick"; R.pick = { what: "roadie", title: "Roadie: tap an instrument to upgrade" }; render();
    } else if (o.id === "tech") {
      if (!owned().length) { nextHour(); return; }
      R.phase = "pick"; R.pick = { what: "tone", tone: o.tone, title: "Sound Tech: tap an instrument for " + TONES[o.tone].name }; render();
    }
  }
  function applyPick(it) {
    if (R.phase !== "pick" || !it) return;
    if (R.pick.what === "roadie") { if (it.tier >= 3) { toast("Already Diamond"); return; } it.tier++; toast(it.card.name + " is now " + TIERS[it.tier]); }
    else { it.ench = R.pick.tone; toast(it.card.name + ": " + TONES[it.ench].name); }
    closeSheet(); nextHour();
  }

  // ---------- merchants ----------
  function ownedTier(id) { var o = owned().filter(function (x) { return x.id === id; }); return o.length ? Math.max.apply(null, o.map(function (x) { return x.tier; })) : -1; }
  function rollOffers(filter, n, up, disc) {
    var out = [], rng = R.rng, tries = 0, maxSlots = 10, usedSlots = 0;
    var pool = CARDS.filter(function (k) { return filter(k) && ownedTier(k.id) < 3 && k.start <= Math.min(3, tierCap(R.day) + (up || 0)); });
    while (out.length < n && tries++ < 200 && pool.length) {
      var k = pickOne(rng, pool), ot = ownedTier(k.id);
      if (out.some(function (o) { return o.card === k; })) continue;
      if (usedSlots + k.size > maxSlots) { if (n > 3) continue; }
      var t = Math.max(k.start, Math.min(3, rollTier(rng, R.day) + (up || 0)));
      if (ot >= 0) t = ot; // an offer of an owned instrument shows at the owned tier (the downshift)
      var ench = R.day >= 3 && rng() < 0.15 ? pickOne(rng, TONE_IDS) : null;
      var cost = price(k, t, ench); if (disc) cost = Math.max(1, Math.floor(cost * disc));
      out.push({ card: k, tier: t, ench: ench, cost: cost }); usedSlots += k.size;
    }
    return out;
  }
  function openShop(m) {
    R.phase = "merchant";
    R.shop = { m: m, rerolls: 1, rerollCost: REROLL[dayTier(R.day)] };
    R.offers = rollOffers(m.f, m.n || 3, m.up, m.disc);
    render();
  }
  function reroll() {
    if (!R.shop || R.shop.rerolls < 1 || R.gold < R.shop.rerollCost) return;
    R.gold -= R.shop.rerollCost; R.shop.rerolls--;
    R.offers = rollOffers(R.shop.m.f, R.shop.m.n || 3, R.shop.m.up, R.shop.m.disc); closeSheet(); render();
  }
  function canTake(o) {
    var dup = owned().filter(function (x) { return x.id === o.card.id && x.tier === o.tier && x.tier < 3; })[0];
    if (dup) return { dup: dup };
    if (used() + o.card.size <= slots()) return { where: "board" };
    if (R.stash.length < RULE.stash) return { where: "stash" };
    return null;
  }
  function takeOffer(o) {
    var room = canTake(o); if (!room || R.gold < o.cost) return false;
    R.gold -= o.cost; R.offers.splice(R.offers.indexOf(o), 1);
    var it;
    if (room.dup) { it = room.dup; it.tier++; if (o.ench) it.ench = o.ench; toast(it.card.name + " up to " + TIERS[it.tier]); }
    else { it = mkItem(o.card, o.tier, o.ench); (room.where === "board" ? R.board : R.stash).push(it); }
    owned().forEach(function (x) { if (x !== it && x.card.run && x.card.run.buyOther) x.card.run.buyOther(R, x, it); });
    if (it.card.run && it.card.run.buySelf) it.card.run.buySelf(R, it);
    hearItem(it);
    if (R.phase === "gift" || R.phase === "loot") { closeSheet(); nextHour(); return true; }
    closeSheet(); render(); return true;
  }
  function sell(it) {
    if (R.phase !== "merchant") return;
    R.gold += itemValue(it); remove(it);
    owned().forEach(function (x) { if (x.card.run && x.card.run.sellOther) x.card.run.sellOther(R, x, it); });
    closeSheet(); render();
  }
  function remove(it) { var i = R.board.indexOf(it); if (i >= 0) R.board.splice(i, 1); else { i = R.stash.indexOf(it); if (i >= 0) R.stash.splice(i, 1); } }
  function move(it, d) { var i = R.board.indexOf(it), j = i + d; if (i < 0 || j < 0 || j >= R.board.length) return; R.board[i] = R.board[j]; R.board[j] = it; render(); openSheetItem(it, "mine"); }
  function toStash(it) { if (R.stash.length >= RULE.stash) { toast("Backstage is full"); return; } remove(it); R.stash.push(it); closeSheet(); render(); }
  function toBoard(it) { if (used() + it.card.size > slots()) { toast("No room on stage"); return; } remove(it); R.board.push(it); closeSheet(); render(); }

  // ---------- rivals ----------
  function makeMonsters() {
    var b = dayTier(R.day), out = [], names = shuffle(R.rng, ACTS);
    [Math.max(0, b - 1), b, Math.min(4, b + 1)].forEach(function (mt, i) {
      var items = [], n = [2, 3, 4, 5, 6][mt], tries = 0, us = 0, cap = 10;
      while (items.length < n && tries++ < 80) {
        var k = pickOne(R.rng, CARDS); if (!k.cd || k.start > Math.min(3, mt)) continue; if (us + k.size > cap) continue;
        items.push(mkItem(k, Math.max(k.start, Math.min(3, mt)), null)); us += k.size;
      }
      out.push({ kind: "monster", tier: mt, title: names[i], sub: ["Bronze", "Silver", "Gold", "Diamond", "Legendary"][mt] + " act", items: items,
        hp: [220, 480, 850, 1300, 1800][mt] + 20 * R.day, gold: MONSTER_REWARD[mt][0], xp: MONSTER_REWARD[mt][1], art: pickOne(R.rng, ["drums", "bass", "guitar", "taiko", "singer"]) });
    });
    return out;
  }
  // a ghost: another player's saved stage from the same night, built the way a run builds one (ours: gold budget by night)
  function makeGhost(day) {
    var rng = R.rng, lvl = Math.min(10, 1 + Math.floor((day - 1) * 0.9)), cap = Math.min(10, 4 + 2 * (lvl - 1));
    var budget = Math.round((RULE.startGold + 14 * (day - 1)) * (day <= 2 ? 0.85 : 1));
    var items = [], us = 0, tries = 0;
    while (tries++ < 120 && budget > 0) {
      var k = pickOne(rng, CARDS); if (k.start > tierCap(day)) continue; var t = Math.max(k.start, rollTier(rng, day));
      var dup = items.filter(function (x) { return x.id === k.id; })[0];
      if (dup) { if (dup.tier < 3 && budget >= price(k, dup.tier)) { budget -= price(k, dup.tier); dup.tier++; } continue; }
      var p = price(k, t); if (p > budget || us + k.size > cap) continue;
      var it = mkItem(k, t, day >= 4 && rng() < 0.12 ? pickOne(rng, TONE_IDS) : null); items.push(it); us += k.size; budget -= p;
    }
    var L = pickOne(rng, LEADERS[R.foeRace]);
    return { kind: "ghost", title: "The " + pickOne(rng, BAND1) + " " + pickOne(rng, BAND2), lead: L, items: items, hp: maxHp(lvl), lvl: lvl };
  }

  // ---------- fight engine ----------
  var STEP_S = 0.125; // one 16th note = 1/8 of a Bazaar second (1 s = 2 beats)
  function fightItem(it, idx, side) {
    var k = it.card, f = { it: it, card: k, tier: it.tier, ench: it.ench, perm: it.perm, idx: idx, side: side, uid: it.uid,
      charge: 0, haste: 0, slow: 0, freeze: 0, ready: false, pend: 0, force: 0, first: true,
      fb: { dmg: 0, sh: 0, hl: 0, bn: 0, ps: 0, crit: 0 }, st: { crit: 0, cdPct: 0, cdFlat: 0, dmg: 0, mc: 0 }, fs: {} };
    f.ammoMax = k.am ? pv(f, k.am) : 0; f.ammo = f.ammoMax;
    return f;
  }
  function pv(f, arr) { if (!arr) return 0; if (arr.length === 1) return arr[0]; var i = f.tier - f.card.start; return arr[Math.max(0, Math.min(arr.length - 1, i))]; }
  function makeSide(name, items, hp, race, art, isYou) {
    var s = { name: name, hp: hp, max: hp, shield: 0, burn: 0, poison: 0, regen: 0, invuln: 0, race: race, art: art, you: isYou, items: [] };
    var pos = 0; items.forEach(function (it, i) { var f = fightItem(it, i, s); f.pos = pos; pos += it.card.size; s.items.push(f); });
    return s;
  }
  function cdOf(f) { if (!f.card.cd) return 0; return Math.max(1, pv(f, f.card.cd) * (1 - f.st.cdPct / 100) + f.st.cdFlat); }
  function critOf(f) { return (f.card.crit || 0) + f.fb.crit + f.st.crit + (f.ench === "deadly" ? 50 : 0); }
  function mcOf(f) { return (pv(f, f.card.mc) || 1) + f.st.mc + (f.ench === "shiny" ? 1 : 0); }
  function dmgOf(f, F) {
    var d = pv(f, f.card.dmg) + f.fb.dmg + f.st.dmg + (f.perm.dmg || 0);
    if (f.card.steal) d += critOf(f);
    if (f.card.dmgMul) d *= f.card.dmgMul(ctx(F, f, 1));
    if (f.ench === "obsidian") d *= 2;
    return Math.max(0, Math.floor(d));
  }
  function shOf(f) { return pv(f, f.card.sh) + f.fb.sh + (f.perm.sh || 0); }
  function hlOf(f) { return pv(f, f.card.hl) + f.fb.hl + (f.perm.hl || 0); }
  function bnOf(f) { return pv(f, f.card.bn) + f.fb.bn; }
  function psOf(f) { return pv(f, f.card.ps) + f.fb.ps; }

  function ctx(F, f, mult) {
    var me = f.side, foe = me === F.a ? F.b : F.a;
    var c = {
      item: f, me: me, foe: foe, t: f.tier,
      v: function (arr) { return pv(f, arr); },
      adj: function () { return me.items.filter(function (x) { return x.idx === f.idx - 1 || x.idx === f.idx + 1; }); },
      isAdj: function (x) { return x.side === me && Math.abs(x.idx - f.idx) === 1; },
      left: function () { return me.items[f.idx - 1] || null; },
      right: function () { return me.items[f.idx + 1] || null; },
      mine: function (p) { return me.items.filter(p); },
      count: function (p) { return me.items.filter(p).length; },
      pick: function (list, n) { return shuffle(F.rng, list).slice(0, n); },
      gainF: function (x, key, n) { x.fb[key] += n; },
      value: function (x) { return itemValue(x.it); },
      dmgOf: function (x) { return dmgOf(x, F); },
      dmg: function (n) { n = Math.floor(n * mult); if (n <= 0) return; var dealt = hurt(F, foe, n, f); if (f.card.steal) healSide(F, me, dealt, f); },
      shield: function (n) { n = Math.floor(n * mult); if (n > 0) { me.shield += n; F.pop(me, "+" + n, "hold"); } },
      heal: function (n) { healSide(F, me, Math.floor(n * mult), f); },
      healRaw: function (n) { healSide(F, me, n, f); },
      burn: function (n) { n = Math.floor(n * mult); if (n > 0) { foe.burn += n; emit(F, me, "burned", { item: f }); } },
      poison: function (n) { n = Math.floor(n * mult); if (n > 0) { foe.poison += n; } },
      slowFoe: function (n, s) { var t = c.pick(foe.items.filter(function (x) { return x.card.cd; }), n); t.forEach(function (x) { x.slow = Math.max(x.slow, s); }); if (t.length) emit(F, me, "slowed", { item: f }); },
      freezeFoe: function (n, s) { var t = c.pick(foe.items.filter(function (x) { return x.card.cd; }), n); t.forEach(function (x) { x.freeze = Math.max(x.freeze, s); }); if (t.length) emit(F, me, "froze", { item: f }); },
      freezeItem: function (x, s) { if (x && x.card.cd) { x.freeze = Math.max(x.freeze, s); emit(F, me, "froze", { item: f }); } },
      haste: function (list, s) { list = list.filter(function (x) { return x.card.cd; }); if (!list.length) return; list.forEach(function (x) { x.haste = Math.max(x.haste, s); emitOne(F, x, "hasted", { by: f }); }); emit(F, me, "hasteAny", { item: f }); },
      charge: function (list, s) { list.forEach(function (x) { if (x.card.cd && !x.ready) x.charge += s; }); },
      reload: function (x, n) { if (x.ammoMax) x.ammo = Math.min(x.ammoMax, x.ammo + n); },
      gold: function (n) { if (me.you && R && F.real) { R.gold += n; } },
      useNow: function () { f.force++; },
      ping: function () { F.sound(f, false, 1); F.flash(f, false); }
    };
    c.base = function () {
      if (f.card.dmg || f.perm.dmg) c.dmg(dmgOf(f, F));
      var s = shOf(f); if (s) c.shield(s);
      var h = hlOf(f); if (h) c.heal(h);
      var b = bnOf(f); if (b) c.burn(b);
      var p = psOf(f); if (p) c.poison(p);
    };
    return c;
  }
  function hurt(F, side, n, src) {
    if (side.invuln > 0 || n <= 0) return 0;
    var a = Math.min(side.shield, n); side.shield -= a; side.hp -= (n - a);
    F.pop(side, "-" + n, "hit"); return n;
  }
  function healSide(F, side, n, src) {
    if (n <= 0) return;
    side.hp = Math.min(side.max, side.hp + n);
    var cl = Math.floor(n * 0.05); side.burn = Math.max(0, side.burn - cl); side.poison = Math.max(0, side.poison - cl);
    F.pop(side, "+" + n, "swell");
  }
  function emitOne(F, x, ev, d) { var h = x.card.on && x.card.on[ev]; if (h && F.depth < 8) { F.depth++; try { h(ctx(F, x, 1), d); } finally { F.depth--; } } }
  function emit(F, side, ev, d) { side.items.forEach(function (x) { emitOne(F, x, ev, d); }); }

  function doUse(F, f, repeat) {
    if (f.ammoMax && !repeat) { if (f.ammo <= 0) return false; }
    var crit = f.card.firstCrit && f.first ? true : F.rng() * 100 < critOf(f);
    var mult = crit ? (f.card.x4 ? 4 : 2) : 1;
    if (!repeat) {
      if (f.card.roll) { var k = f.ammo; f.ammo = 0; f.pend = Math.max(f.pend, k - 1); }
      else if (f.ammoMax) f.ammo--;
    }
    var c = ctx(F, f, mult);
    c.base(); if (f.card.use) f.card.use(c);
    if (f.ench === "heavy") c.slowFoe(2, 1);
    if (f.ench === "icy") c.freezeFoe(1, 1);
    if (f.ench === "turbo") c.haste(c.pick(f.side.items.filter(function (x) { return x !== f; }), 2), 2);
    f.first = false;
    window.__log.uses.push({ fight: F.id, step: F.step, side: f.side.you ? "you" : "foe", id: f.card.id, repeat: !!repeat, crit: crit });
    F.sound(f, crit, repeat ? 0.8 : 1); F.flash(f, crit);
    var foe = f.side === F.a ? F.b : F.a;
    emit(F, f.side, "use", { item: f });
    emit(F, foe, "foeUse", { item: f });
    if (crit) { emit(F, f.side, "crit", { item: f }); emitOne(F, f, "critSelf", { item: f }); }
    return true;
  }
  function sandDmg(n) { var d = 0; for (var i = 1; i <= n; i++) d = d + Math.floor(d / (i > 60 ? 5 : 10)) + 1; return d; }

  function makeFight(you, foe, opts) {
    var F = { id: window.__log.fights.length + 1, a: you, b: foe, step: 0, rng: rngOf((R.seed + R.day * 101 + R.hour * 7) >>> 0), depth: 0, over: false, winner: null, sand: 0,
      real: true, pop: function () {}, sound: function () {}, flash: function () {}, kind: opts.kind };
    [you, foe].forEach(function (s) {
      s.items.forEach(function (f) { if (f.card.aura) f.card.aura(ctx(F, f, 1)); });
    });
    [you, foe].forEach(function (s) { emit(F, s, "fightStart", {}); });
    return F;
  }
  function stepFight(F) {
    if (F.over) return;
    var k = F.step, sides = [F.a, F.b];
    sides.forEach(function (s) {
      s.items.forEach(function (f) {
        if (!f.card.cd) return;
        var rate = f.freeze > 0 ? 0 : (f.haste > 0 ? 2 : 1) * (f.slow > 0 ? 0.5 : 1);
        if (!f.ready && !(f.ammoMax && f.ammo <= 0)) { f.charge += STEP_S * rate; if (f.charge >= cdOf(f)) { f.ready = true; f.charge = cdOf(f); } }
        f.haste = Math.max(0, f.haste - STEP_S); f.slow = Math.max(0, f.slow - STEP_S); f.freeze = Math.max(0, f.freeze - STEP_S);
      });
      s.invuln = Math.max(0, s.invuln - STEP_S);
    });
    // repeats: a 16th apart after the hit
    sides.forEach(function (s) { s.items.forEach(function (f) { if (f.pend > 0) { f.pend--; doUse(F, f, true); } }); });
    if (k % 4 === 0) { // on the beat: every fire is quantized to the song's beat grid
      var order = (k / 4) % 2 ? [F.b, F.a] : [F.a, F.b];
      order.forEach(function (s) {
        s.items.forEach(function (f) {
          if (f.ready && !(f.ammoMax && f.ammo <= 0)) { f.ready = false; f.charge = 0; if (doUse(F, f, false)) f.pend = Math.max(f.pend, mcOf(f) - 1); }
          while (f.force > 0) { f.force--; if (doUse(F, f, false)) f.pend = Math.max(f.pend, mcOf(f) - 1); }
        });
      });
      sides.forEach(function (s) { // Feedback: twice a second, 1 less each tick, a Hold halves it
        if (s.burn > 0) { var d = s.shield > 0 ? Math.ceil(s.burn / 2) : s.burn; var a = Math.min(s.shield, d); s.shield -= a; s.hp -= d - a; F.pop(s, "-" + d, "fb"); s.burn--; }
      });
      if (k % 8 === 0 && k > 0) {
        sides.forEach(function (s) {
          if (s.poison > 0) { s.hp -= s.poison; F.pop(s, "-" + s.poison, "dis"); } // Dissonance: once a second, ignores Hold
          if (s.regen > 0) healSide(F, s, s.regen, null);
        });
        if (k * STEP_S >= RULE.sandstormAt) { F.sand++; var sd = sandDmg(F.sand); sides.forEach(function (s) { var a = Math.min(s.shield, sd); s.shield -= a; s.hp -= sd - a; F.pop(s, "-" + sd, "hit"); }); }
      }
    }
    sides.forEach(function (s) {
      if (s.hp <= 0) { var saved = false; s.items.forEach(function (f) { if (!saved && f.card.on && f.card.on.defeat) saved = f.card.on.defeat(ctx(F, f, 1)); }); }
    });
    var aDead = F.a.hp <= 0, bDead = F.b.hp <= 0;
    if (aDead || bDead) { F.over = true; F.winner = aDead && bDead ? "you" : aDead ? "foe" : "you"; F.double = aDead && bDead; }
    if (k > 16 * 90) { F.over = true; F.winner = F.a.hp / F.a.max >= F.b.hp / F.b.max ? "you" : "foe"; }
    F.step++;
  }

  // ---------- audio ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var A = { ctx: null, on: true, raw: {}, buf: {} };
  window.__LAB = function (name, files) { A.raw[name] = files; if (A.ctx) decodePack(name); };
  var PACKS = {};
  ["bellforge", "stormsong"].forEach(function (r) {
    var rr = RACES[r]; Object.keys(rr.roles).forEach(function (k) { PACKS[rr.roles[k].i] = 1; }); Object.keys(rr.drums).forEach(function (k) { PACKS[rr.drums[k].i] = 1; });
  });
  function loadPacks() { Object.keys(PACKS).forEach(function (p) { var s = document.createElement("script"); s.src = "sounds/" + p + ".js"; s.async = true; document.head.appendChild(s); }); }
  function b64(s) { var b = atob(s), n = b.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = b.charCodeAt(i); return u.buffer; }
  function decodePack(name) {
    var files = A.raw[name]; if (!files || A.buf[name]) return; var out = { notes: {}, list: [], norm: {} }; A.buf[name] = out;
    Object.keys(files).forEach(function (key) {
      try {
        var p = A.ctx.decodeAudioData(b64(files[key]), function (b) { add(key, b); }, function () {});
        if (p && p.then) p.then(function (b) { add(key, b); }, function () {});
      } catch (e) {}
    });
    function add(key, b) {
      if (out.notes[key]) return; out.notes[key] = b;
      var d = b.getChannelData(0), pk = 0; for (var i = 0; i < d.length; i += 4) { var v = Math.abs(d[i]); if (v > pk) pk = v; }
      out.norm[key] = Math.min(4, 0.55 / Math.max(0.02, pk));
      out.list = Object.keys(out.notes).map(Number).filter(function (n) { return n < 100; }).sort(function (a, b) { return a - b; });
    }
  }
  function unlock() {
    if (!AC) return;
    if (!A.ctx) {
      try { A.ctx = new AC(); } catch (e) { A.ctx = null; return; }
      var c = A.ctx;
      A.comp = c.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 4; A.comp.attack.value = 0.004; A.comp.release.value = 0.2;
      A.out = c.createGain(); A.out.gain.value = A.on ? 0.95 : 0; A.comp.connect(A.out); A.out.connect(c.destination);
      A.verb = c.createConvolver(); var len = c.sampleRate * 1.6, ib = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var dd = ib.getChannelData(ch); for (var i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
      A.verb.buffer = ib; A.wet = c.createGain(); A.wet.gain.value = 0.16; A.verb.connect(A.wet); A.wet.connect(A.comp);
      A.you = c.createGain(); A.you.gain.value = 1; A.you.connect(A.comp); A.you.connect(A.verb);
      A.themIn = c.createGain(); var lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; A.them = c.createGain(); A.them.gain.value = 0.55;
      A.themIn.connect(lp); lp.connect(A.them); A.them.connect(A.comp); A.them.connect(A.verb);
      var nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1; A.noise = nb;
      try { var sb = c.createBuffer(1, 1, 22050), ss = c.createBufferSource(); ss.buffer = sb; ss.connect(c.destination); ss.start(0); } catch (e) {}
      Object.keys(A.raw).forEach(decodePack);
    }
    if (A.ctx.state !== "running") { try { A.ctx.resume(); } catch (e) {} }
  }
  ["pointerdown", "touchend", "click"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  function audioOn() { return !!(A.ctx && A.ctx.state === "running"); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function envGain(g, t, v, a, hold, r) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a); g.gain.setValueAtTime(Math.max(0.0002, v), t + Math.max(a, hold)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, hold) + r); }
  function samp(pack, midi, t, dur, vol, out, o) {
    var B = A.buf[pack]; if (!B || !B.list.length) return false; o = o || {};
    var best = null;
    if (o.exact) { if (!B.notes[midi]) return false; best = midi; }
    else { best = B.list[0]; for (var i = 0; i < B.list.length; i++) if (Math.abs(B.list[i] - midi) < Math.abs(best - midi)) best = B.list[i]; if (Math.abs(best - midi) > 9) return false; }
    var c = A.ctx, s = c.createBufferSource(); s.buffer = B.notes[best]; s.playbackRate.value = Math.pow(2, (midi - best) / 12);
    var g = c.createGain(); s.connect(g); g.connect(out);
    var bl = s.buffer.duration / s.playbackRate.value, hold = o.sus ? Math.min(bl - 0.1, dur) : Math.min(bl - 0.05, dur + (o.ring == null ? 0.25 : o.ring));
    var a = o.sus ? 0.05 : (o.a || 0.004), r = o.sus ? 0.3 : 0.14; hold = Math.max(a + 0.01, hold);
    envGain(g, t, vol * (B.norm[best] || 1), a, hold, r); s.start(t); s.stop(t + hold + r + 0.05);
    return true;
  }
  function synth(t, midi, dur, vol, out, type) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || "triangle"; o.frequency.setValueAtTime(mtof(midi), t);
    o.connect(g); g.connect(out); envGain(g, t, vol * 0.18, 0.005, dur, 0.1); o.start(t); o.stop(t + dur + 0.2);
  }
  function noiseHit(t, vol, out, f) {
    var c = A.ctx, s = c.createBufferSource(); s.buffer = A.noise; var bp = c.createBiquadFilter(); bp.type = "highpass"; bp.frequency.value = f || 5000;
    var g = c.createGain(); s.connect(bp); bp.connect(g); g.connect(out); g.gain.setValueAtTime(vol * 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); s.start(t, Math.random() * 0.5); s.stop(t + 0.12);
  }
  var KIT = { kick: [36], snare: [38], hat: [42], ohat: [46], crash: [49], ride: [51], rim: [37], clap: [39], tom: [50, 45] };
  var ROLE_OF = { bass: "bass", lead: "lead", keys: "stab", strings: "pad", voice: "voice", arp: "arp", choir: "choir" };
  var ROLELV = { bass: 0.8, drop: 0.75, stab: 0.55, arp: 0.5, pad: 0.32, lead: 0.5, voice: 0.6, choir: 0.4 };
  var SUS = { pad: 1, voice: 1, choir: 1 };
  function chordAt(bar) { return SONG.chords[SONG.prog[bar % SONG.prog.length]]; }
  function resolve(p, chord) {
    var m = /^(R|T0|T1|T2|CH)([+-]\d+)?$/.exec(p); if (!m) return null; var off = m[2] ? parseInt(m[2], 10) : 0;
    if (m[1] === "R") return [chord.root + off]; if (m[1] === "CH") return chord.tri.map(function (n) { return n + off; }); return [chord.tri[+m[1][1]] + off];
  }
  function playDrum(race, kind, t, vol, out, n) {
    var kit = RACES[race].drums.kick.i, notes = KIT[kind] || KIT.hat, note = notes[(n || 0) % notes.length];
    var lv = Math.pow(10, ((RACES[race].drums[kind] || RACES[race].drums.kick).g || 0) / 20);
    if (!samp(kit, note, t, 0.4, vol * lv, out, { exact: true, ring: 0.5 })) {
      if (kind === "kick" || kind === "tom") synth(t, kind === "kick" ? 36 : 48, 0.12, vol * 2, out, "sine"); else noiseHit(t, vol, out, kind === "snare" || kind === "clap" ? 1800 : 6000);
    }
  }
  function playRole(race, role, notes, t, dur, vol, out) {
    var R0 = RACES[race].roles[role]; if (!R0) return;
    var lv = Math.pow(10, (R0.g || 0) / 20) * (ROLELV[role] || 0.5);
    notes.forEach(function (m) {
      if (!samp(R0.i, m + (R0.o || 0), t, dur, vol * lv, out, { sus: !!SUS[role], a: R0.a, ring: R0.ring })) synth(t, m, dur, vol, out);
    });
  }
  function partEvent(race, type, ev, chord, t, sd, vol, out, n) {
    if (type === "drums") { playDrum(race, ev.p === "K" ? "kick" : ev.p === "S" ? "snare" : "hat", t, vol, out, n); return; }
    if (type === "taiko") { playDrum(race, "tom", t, vol, out, n); return; }
    var notes = resolve(ev.p, chord); if (!notes) return; playRole(race, ROLE_OF[type], notes, t, ev.len * sd, vol, out);
  }
  function hitNote(race, card, chord, t, vol, out, n) {
    var h = card.hit; if (!h) return;
    if (KIT[h]) { playDrum(race, h, t, vol, out, n); return; }
    if (h === "POW") { playRole(race, "drop", [chord.root + 12 > 55 ? chord.root : chord.root + 12], t, 0.5, vol, out); return; }
    var notes = resolve(h, chord); if (!notes) return;
    var role = ROLE_OF[PART[card.type]] || "stab"; playRole(race, role, notes, t, 0.45, vol, out);
  }
  function chanFor(side, f) {
    if (!A.ctx) return null; var key = "ch" + (side.you ? "y" : "t") + (f ? f.pos : "bed");
    side.chans = side.chans || {}; if (side.chans[key]) return side.chans[key];
    var g = A.ctx.createGain(), bus = side.you ? A.you : A.themIn;
    if (A.ctx.createStereoPanner) { var p = A.ctx.createStereoPanner(); p.pan.value = f ? Math.max(-0.8, Math.min(0.8, ((f.pos + f.card.size / 2) - 5) / 6)) : 0; g.connect(p); p.connect(bus); } else g.connect(bus);
    side.chans[key] = g; return g;
  }
  // the bed: each instrument plays its part of Iron March all fight (one player per part per side)
  function bedTypes(side, finale) {
    var m = {};
    side.items.forEach(function (f) { if (!f.card.hit) return; var p = PART[f.card.type]; m[p] = Math.max(m[p] || 0, f.tier >= 2 ? 3 : f.tier + 1); });
    if (finale) { if (!m.taiko) m.taiko = 2; if (!m.choir) m.choir = 1; if (!m.drums) m.drums = 1; }
    return m;
  }

  // ---------- fight runner ----------
  var FR = null; // the running fight
  function startFight(kind, foeDef) {
    var you = makeSide("Tide Captain", R.board, maxHp(R.level), R.race, R.race[0] + "-conductor", true);
    var foe = makeSide(foeDef.title, foeDef.items, foeDef.hp, R.foeRace, foeDef.kind === "ghost" ? R.foeRace[0] + "-" + foeDef.lead.k : R.foeRace[0] + "-" + foeDef.art, false);
    var F = makeFight(you, foe, { kind: kind }); F.def = foeDef;
    R.phase = "fight"; FR = { F: F, kind: kind, def: foeDef };
    closeSheet(); render();
    var realTime = !isAuto() || (RT_FIRST && R.fightsSeen === 0);
    R.fightsSeen++;
    if (!realTime) { while (!F.over) stepFight(F); endFight(); return; }
    runRealtime(F);
  }
  function runRealtime(F) {
    unlock();
    var bpm = SONG.bpm, sd = 60 / bpm / 4; // seconds per 16th
    var useAudio = audioOn() && A.on;
    var t0 = (useAudio ? A.ctx.currentTime : performance.now() / 1000) + 0.35;
    FR.sd = sd; FR.t0 = t0; FR.vis = [];
    function now() { return useAudio && A.ctx.state === "running" ? A.ctx.currentTime : performance.now() / 1000; }
    F.pop = function (side, txt, kind) { var t = FR.cur; FR.vis.push({ t: t, fn: function () { floatText(side, txt, kind); } }); };
    F.flash = function (f, crit) { var t = FR.cur; FR.vis.push({ t: t, fn: function () { flashCard(f, crit); } }); };
    F.sound = function (f, crit, v) {
      if (!useAudio) return; var t = FR.cur, bar = Math.floor(F.step / 16), out = chanFor(f.side, f);
      var vol = (crit ? 1.7 : 1) * (v || 1) * (f.side.you ? 1 : 0.9);
      hitNote(f.side.race, f.card, chordAt(bar), t, vol, out, F.step);
      if (crit) playDrum(f.side.race, "crash", t, 0.5, out);
      window.__log.audio.push({ fight: F.id, step: F.step, when: t, t0: t0, sd: sd, id: f.card.id, rep: v !== 1 });
    };
    FR.timer = setInterval(function () {
      if (!FR || FR.F !== F) return;
      var lim = now() + 0.12, guard = 0;
      while (!F.over && t0 + F.step * sd < lim && guard++ < 64) {
        var t = t0 + F.step * sd; FR.cur = t;
        var bar = Math.floor(F.step / 16), s16 = F.step % 16, finale = F.step * STEP_S >= RULE.sandstormAt;
        if (useAudio) {
          [F.a, F.b].forEach(function (side) {
            var bt = bedTypes(side, finale), out = chanFor(side, null);
            Object.keys(bt).forEach(function (type) {
              var part = SONG.parts[type] && SONG.parts[type][String(bt[type])]; if (!part) return;
              part.forEach(function (ev) { if (ev.s === s16) partEvent(side.race, type, ev, chordAt(bar), t, sd, side.you ? 0.42 : 0.4, out, bar); });
            });
            if (finale && s16 === 0 && side.you) playDrum(side.race, "crash", t, 0.35, out);
          });
        }
        FR.vis.push({ t: t, step: F.step, fn: null });
        stepFight(F);
      }
      if (F.over && !FR.ending) {
        FR.ending = true; var tEnd = t0 + F.step * sd;
        if (useAudio) { var ch = chordAt(Math.floor(F.step / 16)); var w = F.winner === "you" ? F.a : F.b; playRole(w.race, "choir", ch.tri, tEnd, 1.2, 0.9, chanFor(w, null)); playDrum(w.race, "crash", tEnd, 0.8, chanFor(w, null)); }
        FR.endAt = tEnd + 0.9;
      }
    }, 25);
    function frame() {
      if (!FR || FR.F !== F || FR.done) return;
      var n = now();
      while (FR.vis.length && FR.vis[0].t <= n) { var v = FR.vis.shift(); if (v.fn) v.fn(); else FR.shownStep = v.step; }
      drawFight(F, n);
      if (FR.endAt && n >= FR.endAt) { clearInterval(FR.timer); endFight(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function skipFight() {
    if (!FR || FR.done) return;
    var F = FR.F; clearInterval(FR.timer); F.pop = F.flash = F.sound = function () {};
    while (!F.over) stepFight(F); endFight();
  }
  function endFight() {
    if (!FR || FR.done) return;
    var F = FR.F, kind = FR.kind, def = FR.def, won = F.winner === "you";
    FR.done = true; clearInterval(FR.timer);
    window.__log.fights.push({ id: F.id, day: R.day, kind: kind, won: won, steps: F.step, sand: F.sand, you: Math.max(0, F.a.hp), foe: Math.max(0, F.b.hp) });
    var res = { won: won, kind: kind, lines: [] };
    if (won) R.board.forEach(function (it) { if (it.card.run && it.card.run.win) it.card.run.win(R, it); });
    if (kind === "monster") {
      if (won) { R.gold += def.gold; gainXp(def.xp); res.lines.push("+" + def.gold + " gold, +" + def.xp + " XP"); res.loot = true; }
      else res.lines.push("No reward");
    } else {
      if (won) { R.wins++; res.lines.push((F.double ? "Both bandleaders fell: yours counts as the win. " : "") + "Wins " + R.wins + " of " + RULE.winGoal); if (R.wins >= RULE.winGoal) { R.over = true; res.end = "win"; } }
      else {
        R.losses++; var cost = R.day;
        if (R.encore) { R.fans = 0; R.over = true; res.end = "loss"; res.lines.push("The tour is over"); }
        else {
          R.fans -= cost;
          if (R.fans <= 0) { R.fans = 1; R.encore = true; res.lines.push("-" + cost + " fans. Encore: 1 fan left, the next loss ends the tour"); }
          else res.lines.push("-" + cost + " fans");
        }
      }
    }
    R.phase = "result"; R.result = res; FR.done = true;
    render();
    if (res.end) { window.__log.done = true; window.__log.result = { end: res.end, day: R.day, wins: R.wins, losses: R.losses, fans: R.fans }; }
  }
  function continueAfterFight() {
    var res = R.result; FR = null;
    if (res.end) { R.phase = "end"; render(); return; }
    if (res.loot) { R.phase = "loot"; R.offers = (R.lastMonster.items || []).slice(0, 3).map(function (it) { return { card: it.card, tier: it.tier, ench: null, cost: 0 }; }); if (R.offers.length) { render(); return; } }
    nextHour();
  }

  // ---------- rendering ----------
  var app = $("app"), upper = $("upper"), lower = $("lower"), mid = $("mid"), foeHero = $("foeHero"), meHero = $("meHero");
  var L = { W: 0, H: 0, sw: 60, sh: 96, gap: 4 };
  function layout() {
    var W = window.innerWidth, H = window.innerHeight, narrow = H > W * 1.05, TOP = 40;
    app.style.width = W + "px"; app.style.height = H + "px";
    app.classList.toggle("narrow", narrow);
    var cols = narrow ? 5 : 10, rows = narrow ? 2 : 1, midH = narrow ? 96 : 48, sw, sh, gap, hp;
    if (narrow) {
      gap = 5; sw = Math.floor((W - 24 - 4 * gap) / 5);
      sh = Math.min(Math.round(sw * 1.6), Math.floor((H - TOP - midH - 70) / 5.1)); sw = Math.min(sw, Math.floor(sh / 1.6) + 8);
      hp = Math.round(Math.min(sh * 0.55, 72));
    } else {
      sw = Math.floor(Math.min((W - 24) / 10.6, W * 0.085, H * 0.19 / 1.6, (H - TOP - midH - 44) / 3.24 / 1.6));
      sh = Math.round(sw * 1.6); gap = Math.max(3, Math.round(sw * 0.06)); hp = Math.round(Math.min(sh * 0.62, 96));
    }
    var rowW = cols * sw + (cols - 1) * gap, rowH = rows * sh + (rows - 1) * gap, midW = Math.min(W - 24, Math.max(rowW, narrow ? 0 : 660));
    L = { W: W, H: H, sw: sw, sh: sh, gap: gap, cols: cols, rows: rows, rowW: rowW, rowH: rowH, narrow: narrow };
    var st = document.documentElement.style;
    [["--sw", sw], ["--sh", sh], ["--gap", gap], ["--hp", hp], ["--rowW", rowW], ["--rowH", rowH], ["--midW", midW], ["--midH", midH]].forEach(function (v) { st.setProperty(v[0], v[1] + "px"); });
    if (R) render(); else renderStart();
  }
  window.addEventListener("resize", layout);
  function xOf(pos) { return pos * (L.sw + L.gap); }
  // place a card at slot pos; in the 2 x 5 phone layout a card that crosses the fold continues on the next line
  function place(row, e, pos, size, contImg, onTap) {
    if (L.cols === 10) { e.style.left = xOf(pos) + "px"; e.style.top = "0"; e.style.width = wOf(size) + "px"; row.appendChild(e); return; }
    var c = Math.round(pos) % 5, r = Math.floor(Math.round(pos) / 5), a = Math.min(size, 5 - c);
    e.style.left = xOf(c) + "px"; e.style.top = r * (L.sh + L.gap) + "px"; e.style.width = wOf(a) + "px"; row.appendChild(e);
    if (a < size) {
      var k = el("div", "card cont " + (e.className.match(/t\d/) || [""])[0], '<img alt="" src="' + contImg + '">');
      k.style.left = "0"; k.style.top = (r + 1) * (L.sh + L.gap) + "px"; k.style.width = wOf(size - a) + "px"; if (onTap) k.onclick = onTap; row.appendChild(k);
    }
  }
  function wOf(size) { return size * L.sw + (size - 1) * L.gap; }
  function img(race, type) { return "img/" + race[0] + "-" + ART[type] + ".jpg"; }
  function fmt(text, tierIdx) {
    return text.replace(/\d+(?:\.\d+)?%?(?:\/\d+(?:\.\d+)?%?){1,3}/g, function (m) { var p = m.split("/"); return "<b>" + p[Math.max(0, Math.min(p.length - 1, tierIdx))] + "</b>"; });
  }
  function cardEl(it, race, opts) {
    opts = opts || {}; var k = it.card, t = it.tier;
    var e = el("div", "card t" + t + (it.ench ? " ench" : "") + (opts.foe ? " foe" : ""));
    if (it.ench) e.style.setProperty("--ec", TONES[it.ench].c);
    var f = opts.f, bd = "";
    var fake = f || { card: k, tier: t, perm: it.perm || {}, fb: { dmg: 0, sh: 0, hl: 0, bn: 0, ps: 0, crit: 0 }, st: { crit: 0, cdPct: 0, cdFlat: 0, dmg: 0, mc: 0 }, ench: it.ench };
    var d = (k.dmg || (it.perm && it.perm.dmg)) ? dmgStatic(fake) : 0, s = shOf(fake), h = hlOf(fake), b = bnOf(fake), p = psOf(fake);
    if (d) bd += '<b class="dmg">' + d + "</b>"; if (s) bd += '<b class="sh">' + s + "</b>"; if (h) bd += '<b class="hl">' + h + "</b>"; if (b) bd += '<b class="bn">' + b + "</b>"; if (p) bd += '<b class="ps">' + p + "</b>";
    var cd = k.cd ? (f ? cdOf(f) : pv(fake, k.cd)) : 0;
    var am = "";
    if (k.am) { var mx = f ? f.ammoMax : pv(fake, k.am), cur = f ? f.ammo : mx; for (var i = 0; i < Math.min(mx, 8); i++) am += "<i" + (i >= cur ? ' class="x"' : "") + "></i>"; }
    e.innerHTML = '<img alt="" src="' + img(race, k.type) + '"><div class="bd">' + bd + "</div>" + (cd ? '<div class="cd">' + (Math.round(cd * 10) / 10) + "s</div>" : "") +
      (am ? '<div class="am">' + am + "</div>" : "") + '<div class="fill" style="height:0"></div><div class="st"></div><div class="nm">' + k.name + "</div>";
    return e;
  }
  function dmgStatic(f) { var d = pv(f, f.card.dmg) + f.fb.dmg + f.st.dmg + (f.perm.dmg || 0); if (f.ench === "obsidian") d *= 2; return d; }
  function slotsEl(row, n, total) { for (var i = 0; i < 10; i++) { var s = el("div", "slot" + (i >= n ? " locked" : "")); s.style.left = xOf(i % L.cols) + "px"; s.style.top = Math.floor(i / L.cols) * (L.sh + L.gap) + "px"; row.appendChild(s); } }

  function renderStart() {
    var s = $("start"); s.style.display = "flex";
    s.innerHTML = "<h1>Bazaar Stage</h1>";
    var o = el("div", "opts");
    [["bellforge", "Bellforge"], ["stormsong", "Stormsong"]].forEach(function (r) {
      var b = el("button", "opt", '<img alt="" src="img/' + r[0][0] + '-conductor.jpg"><div>' + r[1] + "</div>");
      b.onclick = function () { unlock(); s.style.display = "none"; newRun(r[0]); };
      o.appendChild(b);
    });
    s.appendChild(o);
  }
  function stopsEl() {
    var w = el("div", "where", "<span>Night " + R.day + "</span>"), s = el("div", "stops"); w.appendChild(s);
    for (var h = 1; h <= 6; h++) { var i = el("i", (h === 3 ? "m " : h === 6 ? "p " : "") + (h < R.hour ? "done" : h === R.hour ? "on" : "")); s.appendChild(i); }
    return w;
  }
  function heroBlock(side, opts) {
    var h = el("div", "pic", '<img alt="" src="img/' + opts.art + '.jpg">');
    var info = el("div", "info");
    info.appendChild(el("div", "nm", opts.name));
    if (opts.hp != null) {
      var bar = el("div", "hpbar"); bar.innerHTML = '<div class="h"></div><div class="s"></div><div class="t"></div>'; info.appendChild(bar);
      setBar(bar, opts.hp, opts.max, opts.shield || 0);
      info.appendChild(el("div", "fx"));
    }
    if (opts.sub) info.appendChild(el("div", "sub", opts.sub));
    return [h, info];
  }
  function setBar(bar, hp, max, sh) {
    hp = Math.max(0, hp); bar.querySelector(".h").style.width = (100 * hp / max) + "%";
    var s = bar.querySelector(".s"); s.style.left = Math.min(100, 100 * hp / max) + "%"; s.style.width = Math.min(100 - Math.min(100, 100 * hp / max), 100 * sh / max) + "%";
    bar.querySelector(".t").textContent = Math.ceil(hp) + (sh ? " +" + sh : "") + " / " + max;
  }
  function render() {
    if (!R) return; $("start").style.display = "none";
    Array.prototype.forEach.call(app.querySelectorAll(".banner"), function (b) { b.remove(); });
    app.classList.remove("finale");
    // my hero
    meHero.innerHTML = "";
    var mh = FR && FR.F ? FR.F.a : null;
    heroBlock(null, { art: R.race[0] + "-conductor", name: "Tide Captain", hp: mh ? mh.hp : maxHp(R.level), max: mh ? mh.max : maxHp(R.level), shield: mh ? mh.shield : 0,
      sub: '<span><i class="coin"></i><b>' + R.gold + "</b></span><span>Fans <b>" + R.fans + "</b></span><span>Wins <b>" + R.wins + "</b>/" + RULE.winGoal + "</span><span>Level <b>" + R.level + "</b> " + R.xp + "/" + RULE.xpPerLevel + " XP</span>" })
      .forEach(function (n) { meHero.appendChild(n); });
    // lower row: my stage
    lower.innerHTML = ""; slotsEl(lower, slots());
    var pos = 0;
    (mh ? mh.items : R.board).forEach(function (x) {
      var it = mh ? x.it : x, f = mh ? x : null;
      var e = cardEl(it, R.race, { f: f }); e.dataset.uid = it.uid;
      if (R.phase === "pick" && !(R.pick.what === "roadie" && it.tier >= 3)) e.classList.add("pick");
      var tap = function () { if (R.phase === "pick") applyPick(it); else openSheetItem(it, "mine"); };
      e.onclick = tap; place(lower, e, pos, it.card.size, img(R.race, it.card.type), tap); pos += it.card.size;
    });
    // upper row by phase
    upper.innerHTML = ""; foeHero.innerHTML = ""; mid.innerHTML = "";
    var l = el("div", "l"), r = el("div", "r"); mid.appendChild(l); mid.appendChild(r);
    l.appendChild(stopsEl()); renderMute(r);
    var ph = R.phase;
    if (R.showStash && ph !== "fight" && ph !== "result") renderStash(l, r);
    else if (ph === "encounters" || ph === "monsters") renderChoices(l, r);
    else if (ph === "merchant" || ph === "gift" || ph === "loot") renderOffers(l, r);
    else if (ph === "pick") { l.appendChild(el("div", "title", R.pick.title)); renderStashButton(r); }
    else if (ph === "event") renderEvent(l, r);
    else if (ph === "prefight") renderPrefight(l, r);
    else if (ph === "fight" || ph === "result") renderFight(l, r);
    else if (ph === "end") renderEnd(l, r);
    if (isAuto()) scheduleAuto();
  }
  function renderStashButton(r) {
    if (R.phase === "fight" || R.phase === "result" || R.phase === "end") return;
    var b = el("button", "btn", R.showStash ? "Close backstage" : "Backstage " + R.stash.length + "/" + RULE.stash); b.onclick = function () { R.showStash = !R.showStash; closeSheet(); render(); }; r.appendChild(b);
  }
  function renderStash(l, r) {
    l.appendChild(el("div", "title", "Backstage"));
    slotsEl(upper, 10);
    var pos = 0;
    R.stash.forEach(function (it) {
      if (pos + it.card.size > 10) return; var e = cardEl(it, R.race, {});
      var tap = function () { if (R.phase === "pick") applyPick(it); else openSheetItem(it, "stash"); };
      e.onclick = tap; if (R.phase === "pick") e.classList.add("pick"); place(upper, e, pos, it.card.size, img(R.race, it.card.type), tap); pos += it.card.size;
    });
    renderStashButton(r);
  }
  var ICON = {
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/></svg>'
  };
  function renderChoices(l, r) {
    var opts = R.enc, isMon = R.phase === "monsters";
    l.appendChild(el("div", "title", isMon ? "Opening act: pick one" : "Pick a stop"));
    var w = 3;
    opts.forEach(function (o, i) {
      var c = el("button", "choice"), cw = Math.floor((L.rowW - 2 * L.gap * 2) / 3); c.style.width = cw + "px";
      c.style.left = (i * (cw + L.gap * 2)) + "px";
      var artHtml = o.kind === "gift" ? ICON.gift : '<img alt="" src="img/' + (o.kind === "monster" ? R.foeRace[0] : R.race[0]) + "-" + o.art + '.jpg">';
      var tag = o.kind === "monster" ? '<span class="tag" style="background:var(--' + ["bronze", "silver", "gold", "diamond", "hit"][o.tier] + ')">' + ["Bronze", "Silver", "Gold", "Diamond", "Legendary"][o.tier] + "</span>" : "";
      var sub = o.kind === "monster" ? o.hp + " health . +" + o.gold + " gold +" + o.xp + " XP" : o.sub;
      c.innerHTML = '<div class="art">' + artHtml + tag + '</div><div class="tx"><div class="tt">' + o.title + '</div><div class="ss">' + sub + "</div></div>";
      c.onclick = function () { if (isMon) { R.lastMonster = o; startFight("monster", o); } else chooseEncounter(o); };
      upper.appendChild(c);
    });
    if (isMon) foeHero.appendChild(el("div", "sub", ""));
    renderStashButton(r);
  }
  function renderOffers(l, r) {
    var ph = R.phase;
    var title = ph === "merchant" ? R.shop.m.name : ph === "gift" ? "Gift: take one" : "Loot: take one";
    l.appendChild(el("div", "title", title));
    if (ph === "merchant") {
      heroBlock(null, { art: R.race[0] + "-" + R.shop.m.art, name: R.shop.m.name, sub: R.shop.m.sub }).forEach(function (n) { foeHero.appendChild(n); });
      var rb = el("button", "btn", "Reroll " + R.shop.rerollCost); rb.disabled = R.shop.rerolls < 1 || R.gold < R.shop.rerollCost; rb.onclick = reroll; r.appendChild(rb);
    }
    renderStashButton(r);
    var lv = el("button", "btn go", ph === "merchant" ? "Leave" : "Skip"); lv.onclick = function () { closeSheet(); nextHour(); }; r.appendChild(lv);
    var total = R.offers.reduce(function (a, o) { return a + o.card.size; }, 0), spare = L.cols === 10 ? Math.max(0, 10 - total) : 0, gaps = R.offers.length + 1;
    var pos = spare / gaps;
    R.offers.forEach(function (o) {
      var it = { card: o.card, tier: o.tier, ench: o.ench, perm: {} };
      var e = cardEl(it, R.race, {}), at = pos; pos += o.card.size + spare / gaps;
      var room = canTake(o);
      if (!room || R.gold < o.cost) e.classList.add("dim");
      var pr = el("div", "price" + (room && room.dup ? " up" : ""), (o.cost ? o.cost : "Free") + (room && room.dup ? " up" : "")); e.appendChild(pr);
      var tap = function () { openSheetOffer(o); }; e.onclick = tap;
      place(upper, e, at, o.card.size, img(R.race, o.card.type), tap);
    });
  }
  function renderPrefight(l, r) {
    var g = R.foe;
    heroBlock(null, { art: R.foeRace[0] + "-" + g.lead.k, name: g.title, hp: g.hp, max: g.hp }).forEach(function (n) { foeHero.appendChild(n); });
    slotsEl(upper, 10); var pos = 0;
    g.items.forEach(function (it) { var e = cardEl(it, R.foeRace, { foe: true }), tap = function () { openSheetItem(it, "foe"); }; e.onclick = tap; place(upper, e, pos, it.card.size, img(R.foeRace, it.card.type), tap); pos += it.card.size; });
    l.appendChild(el("div", "title", "Battle of the bands"));
    renderStashButton(r);
    var b = el("button", "btn go", "Play"); b.onclick = function () { startFight("pvp", g); }; r.appendChild(b);
  }
  function renderFight(l, r) {
    var F = FR.F, foe = F.b;
    heroBlock(null, { art: foe.art, name: foe.name, hp: foe.hp, max: foe.max, shield: foe.shield }).forEach(function (n) { foeHero.appendChild(n); });
    slotsEl(upper, 10);
    foe.items.forEach(function (f) { var e = cardEl(f.it, foe.race, { f: f, foe: true }); e.dataset.uid = "f" + f.uid; place(upper, e, f.pos, f.card.size, img(foe.race, f.card.type)); });
    var song = el("div", "song", '<div class="ch"></div><div class="bars"><i></i><u></u></div><div class="beat"><i></i><i></i><i></i><i></i></div>');
    l.appendChild(song);
    if (R.phase === "fight") { var sk = el("button", "btn", "Skip"); sk.onclick = skipFight; r.appendChild(sk); }
    else {
      var res = R.result, ban = el("div", "banner", "<h2>" + (res.won ? "Won" : "Lost") + "</h2><p>" + res.lines.join("<br>") + "</p>");
      var c = el("button", "btn go", "Continue"); c.onclick = continueAfterFight; ban.appendChild(c); app.appendChild(ban); FR.banner = ban;
    }
    drawFight(F, null);
  }
  function renderEnd(l, r) {
    var won = R.result && R.result.end === "win";
    l.appendChild(el("div", "title", won ? "Tour won" : "Tour over"));
    var ban = el("div", "banner", "<h2>" + (won ? "Tour won" : "Tour over") + "</h2><p>Night " + R.day + " . " + R.wins + " wins . " + R.losses + " losses</p>");
    var b2 = el("button", "btn go", "New tour"); b2.onclick = function () { ban.remove(); R = null; FR = null; renderStart(); }; ban.appendChild(b2); app.appendChild(ban);
  }
  function drawFight(F, t) {
    var step = FR && FR.shownStep != null ? FR.shownStep : F.step;
    [[F.a, meHero], [F.b, foeHero]].forEach(function (p) {
      var side = p[0], bar = p[1].querySelector(".hpbar"); if (!bar) return;
      setBar(bar, side.hp, side.max, side.shield);
      var fx = p[1].querySelector(".fx"); if (fx) { var h = ""; if (side.burn > 0) h += '<span class="fb">Feedback ' + side.burn + "</span>"; if (side.poison > 0) h += '<span class="dis">Dissonance ' + side.poison + "</span>"; if (side.regen > 0) h += '<span class="sus">Sustain ' + side.regen + "</span>"; if (side.invuln > 0) h += '<span class="inv">Untouchable</span>'; fx.innerHTML = h; }
      side.items.forEach(function (f) {
        var e = (side.you ? lower : upper).querySelector('[data-uid="' + (side.you ? f.uid : "f" + f.uid) + '"]'); if (!e) return;
        var cd = cdOf(f), fill = e.querySelector(".fill"); if (fill) fill.style.height = cd ? (100 * (1 - Math.min(1, f.charge / cd))) + "%" : "0";
        e.classList.toggle("haste", f.haste > 0); e.classList.toggle("slow", f.slow > 0); e.classList.toggle("frz", f.freeze > 0);
        var am = e.querySelector(".am"); if (am && f.ammoMax) { var is = am.querySelectorAll("i"); for (var i = 0; i < is.length; i++) is[i].className = i >= f.ammo ? "x" : ""; }
        var bd = e.querySelector(".bd"); if (bd) { var d = (f.card.dmg || f.perm.dmg) ? dmgOf(f, F) : 0, s = shOf(f), hl = hlOf(f), b = bnOf(f), ps = psOf(f), x = ""; if (d) x += '<b class="dmg">' + d + "</b>"; if (s) x += '<b class="sh">' + s + "</b>"; if (hl) x += '<b class="hl">' + hl + "</b>"; if (b) x += '<b class="bn">' + b + "</b>"; if (ps) x += '<b class="ps">' + ps + "</b>"; if (bd.innerHTML !== x) bd.innerHTML = x; }
      });
    });
    var bar16 = Math.floor(step / 16), ch = mid.querySelector(".ch");
    if (ch) ch.textContent = "Bar " + (bar16 + 1) + "  " + SONG.prog[bar16 % 4];
    var bars = mid.querySelector(".bars"); if (bars) { var tot = Math.max(20, bar16 + 2); bars.querySelector("i").style.width = (100 * step / (tot * 16)) + "%"; bars.querySelector("u").style.left = (100 * 14 / tot) + "%"; }
    var bt = mid.querySelectorAll(".beat i"); for (var i = 0; i < bt.length; i++) bt[i].className = Math.floor((step % 16) / 4) === i ? "on" : "";
    app.classList.toggle("finale", step * STEP_S >= RULE.sandstormAt && R.phase === "fight");
  }
  function flashCard(f, crit) {
    var e = (f.side.you ? lower : upper).querySelector('[data-uid="' + (f.side.you ? f.uid : "f" + f.uid) + '"]'); if (!e) return;
    e.classList.add("fire"); if (crit) e.classList.add("crit"); setTimeout(function () { e.classList.remove("fire"); e.classList.remove("crit"); }, 140);
  }
  var POPC = { hit: "var(--hit)", hold: "var(--hold)", swell: "var(--swell)", fb: "var(--fb)", dis: "var(--dis)" };
  function floatText(side, txt, kind) {
    var host = side.you ? meHero : foeHero, pic = host.querySelector(".pic"); if (!pic) return;
    var r = pic.getBoundingClientRect(), a = app.getBoundingClientRect();
    var d = el("div", "float", txt); d.style.color = POPC[kind] || "var(--ink)";
    // place in app coordinates (works rotated: use offset math in app space)
    var x = pic.offsetLeft + pic.offsetWidth * (0.2 + Math.random() * 0.6), y = pic.offsetTop;
    d.style.left = x + "px"; d.style.top = y + "px"; app.appendChild(d); setTimeout(function () { d.remove(); }, 820);
  }

  // ---------- detail sheet ----------
  var sheet = $("sheet");
  function closeSheet() { sheet.classList.remove("on"); sheet.innerHTML = ""; }
  function sheetBody(card, tier, ench, extra) {
    var ti = tier - card.start, h = "";
    h += '<button class="iconbtn x" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    h += "<h3>" + card.name + "</h3>";
    h += '<div class="meta"><span><i class="tierdot" style="background:var(--' + ["bronze", "silver", "gold", "diamond"][tier] + ')"></i>' + TIERS[tier] + "</span><span>" + SIZE[card.size] + "</span>" +
      (card.tags.length ? "<span>" + card.tags.join(", ") + "</span>" : "") + "</div>";
    if (card.cd) { var s = pv({ card: card, tier: tier }, card.cd); h += '<div class="meta"><span>Loop ' + s + " s = " + (s * 2) + " beats</span>" + (card.am ? "<span>" + pv({ card: card, tier: tier }, card.am) + " takes</span>" : "") + "</div>"; }
    h += '<div class="txt">' + fmt(card.text, ti) + "</div>";
    if (ench) h += '<div class="tone" style="--ec:' + TONES[ench].c + '"><b>' + TONES[ench].name + "</b> " + TONES[ench].text + "</div>";
    if (extra) h += extra;
    return h;
  }
  function openSheetItem(it, where) {
    if (R.phase === "fight") return;
    var extra = "";
    if (where === "foe") extra = "";
    sheet.innerHTML = sheetBody(it.card, it.tier, it.ench, extra);
    var acts = el("div", "acts");
    function btn(txt, fn, go, dis) { var b = el("button", "btn" + (go ? " go" : ""), txt); b.disabled = !!dis; b.onclick = fn; acts.appendChild(b); }
    btn("Hear", function () { hearItem(it); });
    if (where === "mine") {
      var i = R.board.indexOf(it);
      btn("Left", function () { move(it, -1); }, false, i <= 0);
      btn("Right", function () { move(it, 1); }, false, i >= R.board.length - 1);
      btn("To backstage", function () { toStash(it); });
    }
    if (where === "stash") btn("To stage", function () { toBoard(it); }, true, used() + it.card.size > slots());
    if ((where === "mine" || where === "stash") && R.phase === "merchant") btn("Sell " + itemValue(it), function () { sell(it); });
    sheet.appendChild(acts);
    sheet.querySelector(".x").onclick = closeSheet;
    sheet.classList.add("on");
  }
  function openSheetOffer(o) {
    sheet.innerHTML = sheetBody(o.card, o.tier, o.ench, "");
    var acts = el("div", "acts"), room = canTake(o);
    var h = el("button", "btn", "Hear"); h.onclick = function () { hearItem({ card: o.card, tier: o.tier }); }; acts.appendChild(h);
    var label = (o.cost ? "Buy " + o.cost : "Take") + (room && room.dup ? " (upgrade)" : "");
    var b = el("button", "btn go", room ? label : "No room"); b.disabled = !room || R.gold < o.cost; b.onclick = function () { takeOffer(o); }; acts.appendChild(b);
    sheet.appendChild(acts); sheet.querySelector(".x").onclick = closeSheet; sheet.classList.add("on");
  }
  // tapping an instrument plays it alone: its part for one bar, then its hit
  function hearItem(it) {
    unlock(); if (!audioOn() || !A.on) return;
    var t = A.ctx.currentTime + 0.05, sd = 60 / SONG.bpm / 4, type = PART[it.card.type], lvl = it.tier >= 2 ? 3 : it.tier + 1, chord = chordAt(0);
    var part = SONG.parts[type] && SONG.parts[type][String(lvl)];
    if (part) part.forEach(function (ev) { partEvent(R ? R.race : "bellforge", type, ev, chord, t + ev.s * sd, sd, 0.7, A.you, 0); });
    hitNote(R ? R.race : "bellforge", it.card, chord, t + 16 * sd, 1, A.you, 0);
  }
  var toastT = 0;
  function toast(s) { var t = $("toast"); t.textContent = s; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 1600); }
  function renderMute(host) {
    var m = el("button", "iconbtn"); m.setAttribute("aria-label", "Sound"); host.appendChild(m);
    m.innerHTML = A.on ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
    m.onclick = function () { A.on = !A.on; if (A.out) A.out.gain.value = A.on ? 0.95 : 0; render(); };
  }
  document.addEventListener("pointerdown", function (e) { if (sheet.classList.contains("on") && !sheet.contains(e.target) && !e.target.closest(".card")) closeSheet(); }, true);

  // ---------- auto play (for the checker) ----------
  var autoT = 0;
  function scheduleAuto() { clearTimeout(autoT); autoT = setTimeout(autoStep, +(Q.get("autodelay") || 15)); }
  function autoStep() {
    if (!R || !isAuto()) return;
    var ph = R.phase;
    try {
      if (ph === "encounters") {
        var m = R.enc.filter(function (o) { return o.kind === "merchant"; });
        var pick = R.gold >= 6 && m.length ? m[0] : R.enc.filter(function (o) { return o.kind !== "merchant"; })[0] || R.enc[0];
        chooseEncounter(pick);
      } else if (ph === "merchant" || ph === "gift" || ph === "loot") {
        var best = R.offers.filter(function (o) { return R.gold >= o.cost && canTake(o); }).sort(function (a, b) { var da = canTake(a).dup ? 1 : 0, db = canTake(b).dup ? 1 : 0; return db - da || b.tier - a.tier || (b.card.tags.indexOf("Strike") >= 0) - (a.card.tags.indexOf("Strike") >= 0); })[0];
        if (best && (ph !== "merchant" || canTake(best).where !== "stash" || canTake(best).dup)) { if (takeOffer(best)) return; }
        if (ph === "merchant" && R.stash.length && used() < slots()) { var s = R.stash.filter(function (x) { return used() + x.card.size <= slots(); })[0]; if (s) { toBoard(s); return; } }
        if (ph === "merchant" && R.shop.rerolls > 0 && R.gold >= R.shop.rerollCost + 4) { reroll(); return; }
        closeSheet(); nextHour();
      } else if (ph === "event") { resolveEvent(R.ev); }
      else if (ph === "pick") { var c = owned().filter(function (x) { return R.pick.what !== "roadie" || x.tier < 3; }); applyPick(c[0]); }
      else if (ph === "monsters") { var o = R.enc[1]; R.lastMonster = o; startFight("monster", o); }
      else if (ph === "prefight") { startFight("pvp", R.foe); }
      else if (ph === "result") { if (FR && FR.banner) FR.banner.remove(); continueAfterFight(); }
      else if (ph === "end") { /* done */ }
    } catch (e) { window.__log.errors.push(String(e && e.stack || e)); throw e; }
  }
  window.__game = { get run() { return R; }, start: function (race, seed) { $("start").style.display = "none"; newRun(race || "bellforge", seed); } };

  loadPacks();
  layout();
  if (isAuto()) setTimeout(function () { window.__game.start(Q.get("race") || "bellforge", +(Q.get("seed") || 0) || undefined); }, 50);
})();
