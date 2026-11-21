/* Battlegrounds feel game: rules, shared pool, shops, ghosts' turns and combat. No DOM, no audio.
   Numbers from docs/research/real-game/01-card-lineup-a.md s2 and docs/research/families/bg.md (section a). */
(function () {
"use strict";
var D = window.BG_CARDS, BY = D.BY;

var R = {
  players: 8,
  board: 7, hand: 10,
  hp: 30,
  buy: 3, sell: 1, refresh: 1,
  copies: [0, 15, 15, 13, 11, 9, 7],          // copies of each musician per tier (01 s2 row 4)
  slots: [0, 3, 4, 4, 5, 5, 6],               // shop size by tier (bg.md a)
  upCost: { 1: 5, 2: 7, 3: 8, 4: 11, 5: 11 }, // cost to reach the next tier, falls 1 a turn (01 s2 row 6)
  goldCap: 10,
  gold: function (turn) { return Math.min(turn + 2, 10); },
  turnTime: function (turn) { return Math.min(60 + 15 * (turn - 1), 120); },
  // damage cap (01 s2 row 2, Season 9): 5, 10 from turn 4, 15 from turn 8, none in the top 4
  cap: function (turn, alive) { if (alive <= 4) return 999; return turn >= 8 ? 15 : turn >= 4 ? 10 : 5; }
};

function mulberry(seed) {
  var a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(rng, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

var E = { R: R };
var UID = 1;

// ---------------- game ----------------
E.newGame = function (seed) {
  var g = { rng: mulberry(seed || (Date.now() & 0x7fffffff)), turn: 0, pool: {}, players: [], deadOrder: [], log: [] };
  D.CARDS.forEach(function (c) { g.pool[c.id] = R.copies[c.t]; });
  E.G = g;
  return g;
};
E.heroOffer = function (g, n) { return shuffle(g.rng, D.HEROES.slice()).slice(0, n); };
E.addPlayers = function (g, youHero) {
  var used = {}; used[youHero.id] = 1;
  var rest = shuffle(g.rng, D.HEROES.filter(function (h) { return h.id !== youHero.id; }));
  var heroes = [youHero];
  for (var i = 0; i < R.players - 1; i++) heroes.push(rest[i % rest.length]);
  var seen = {};
  heroes.forEach(function (h, i) {
    seen[h.id] = (seen[h.id] || 0) + 1;
    var p = { idx: i, you: i === 0, hero: h, name: h.n + (seen[h.id] > 1 ? " II" : ""), hp: R.hp, armor: h.armor,
      alive: true, tier: 1, tierSince: 1, gold: 0, nextGold: 0, board: [], hand: [], shop: [], frozen: false,
      freeRefresh: 0, raceAtk: { bf: 0, ss: 0 }, raceHp: { bf: 0, ss: 0 }, tavern: { bf: [0, 0], ss: [0, 0] },
      drCount: 0, lastResult: "", buys: 0, powerUses: 0, lionLevel: 0, discover: [], lastOpp: -1, place: 0,
      rng: mulberry(Math.floor(g.rng() * 1e9)), aggro: 0.8 + g.rng() * 0.5, events: [] };
    g.players.push(p);
  });
};

// ---------------- helpers for card effects ----------------
function card(m) { return BY[m.id]; }
var H = {
  card: card,
  board: function (S) { return S.board; },
  buffOwned: function (m, a, h) { m.ba += a; m.bh += h; },
  gainGold: function (S, n) { S.gold = Math.min(S.gold + n, 99); },
  hurtHero: function (S, n) { E.hurtHero(S, n); },
  tavernBuff: function (S, race, a, h) { S.tavern[race][0] += a; S.tavern[race][1] += h; },
  raceBuff: function (S, race, a, h) { S.raceAtk[race] += a; S.raceHp[race] += h; },
  randomKeyword: function (S, m) {
    var opts = ["taunt", "shield", "wf", "reborn", "sour"].filter(function (k) { return !E.hasKw(m, k); });
    if (opts.length) m.kwx.push(opts[Math.floor(S.rng() * opts.length)]);
  },
  adjacentOwned: function (S, m) { var i = S.board.indexOf(m); return [S.board[i - 1], S.board[i + 1]].filter(Boolean); },
  pick: function (S, list) { return list.length ? list[Math.floor(S.rng() * list.length)] : null; },
  queueDiscover: function (S, tier, from) { S.discover.push({ tier: Math.min(6, Math.max(1, tier)), from: from }); },
  idsOfTier: function (t) { return D.CARDS.filter(function (c) { return c.t === t; }).map(function (c) { return c.id; }); },
  deathrattleIds: function () { return D.CARDS.filter(function (c) { return c.dr && c.t <= 4; }).map(function (c) { return c.id; }); },
  addToHand: function (S, id, golden, created) { if (!id) return; var m = E.own(id, golden, created ? 0 : (golden ? 3 : 1)); if (created) m.noReward = true; E.addToHand(S, m); },
  triggerBattlecry: function (S, m) { var c = card(m); if (c.bc) E.runBattlecry(S, m, true); }
};
D.bind(H);

E.own = function (id, golden, pc) { return { uid: UID++, id: id, gold: !!golden, ba: 0, bh: 0, kwx: [], pc: pc == null ? 1 : pc }; };
E.hasKw = function (m, k) { return card(m).kw.indexOf(k) >= 0 || (m.kwx && m.kwx.indexOf(k) >= 0); };
E.atk = function (P, m) { var c = card(m); if (c.spell) return 0; return c.a * (m.gold ? 2 : 1) + m.ba + (P ? P.raceAtk[c.r] || 0 : 0); };
E.hp = function (P, m) { var c = card(m); if (c.spell) return 0; return c.h * (m.gold ? 2 : 1) + m.bh + (P ? P.raceHp[c.r] || 0 : 0); };
E.hurtHero = function (P, n) { var a = Math.min(P.armor, n); P.armor -= a; P.hp -= (n - a); };

// ---------------- pool and shop ----------------
function drawFromPool(g, maxTier, n, exclude) {
  var out = [];
  for (var k = 0; k < n; k++) {
    var tot = 0, ids = [];
    for (var id in g.pool) { var c = BY[id]; if (c.t <= maxTier && g.pool[id] > 0 && (!exclude || exclude.indexOf(id) < 0)) { ids.push(id); tot += g.pool[id]; } }
    if (!tot) break;
    var x = g.rng() * tot, pick = ids[ids.length - 1];
    for (var i = 0; i < ids.length; i++) { x -= g.pool[ids[i]]; if (x < 0) { pick = ids[i]; break; } }
    g.pool[pick]--; out.push(pick);
  }
  return out;
}
function drawTier(g, tier, n, distinct) {
  var out = [];
  for (var k = 0; k < n; k++) {
    var ids = [], tot = 0;
    for (var id in g.pool) if (BY[id].t === tier && g.pool[id] > 0 && (!distinct || out.indexOf(id) < 0)) { ids.push(id); tot += g.pool[id]; }
    if (!tot) break;
    var x = g.rng() * tot, pick = ids[ids.length - 1];
    for (var i = 0; i < ids.length; i++) { x -= g.pool[ids[i]]; if (x < 0) { pick = ids[i]; break; } }
    g.pool[pick]--; out.push(pick);
  }
  return out;
}
function returnToPool(g, id, n) { if (g.pool[id] != null) g.pool[id] += n; }
E.returnShop = function (g, P) { P.shop.forEach(function (s) { returnToPool(g, s.id, 1); }); P.shop = []; };
E.rollShop = function (g, P, higher) {
  E.returnShop(g, P);
  var n = R.slots[P.tier];
  var ids;
  if (higher && P.tier < 6) ids = drawTier(g, P.tier + 1, 2).concat(drawFromPool(g, P.tier, n - 2));
  else ids = drawFromPool(g, P.tier, n);
  P.shop = ids.map(function (id) { return { uid: UID++, id: id }; });
};
E.upCost = function (g, P) { if (P.tier >= 6) return null; return Math.max(0, R.upCost[P.tier] - (g.turn - P.tierSince)); };

// ---------------- turn ----------------
E.startTurn = function (g) {
  g.turn++;
  g.players.forEach(function (P) {
    if (!P.alive) return;
    P.gold = R.gold(g.turn) + P.nextGold; P.nextGold = 0; P.powerUses = 0; P.freeRefresh = 0;
    if (P.frozen && P.shop.length) P.frozen = false; else E.rollShop(g, P);
    P.board.slice().forEach(function (m) { var c = card(m); if (c.sot) c.sot(P, m, m.gold ? 2 : 1); });
  });
};
E.endTurn = function (g, P) {
  P.board.slice().forEach(function (m) { var c = card(m); if (c.eot) c.eot(P, m, m.gold ? 2 : 1); });
  if (!P.frozen) E.returnShop(g, P);
};

E.canBuy = function (P) { return P.gold >= R.buy && P.hand.length < R.hand; };
E.buy = function (g, P, shopIdx) {
  var s = P.shop[shopIdx]; if (!s || !E.canBuy(P)) return null;
  P.gold -= R.buy; P.shop.splice(shopIdx, 1); P.buys++;
  var m = E.own(s.id, false, 1), c = card(m), tb = P.tavern[c.r];
  if (tb) { m.ba += tb[0]; m.bh += tb[1]; }
  if (P.hero.id === "brass_lion" && P.buys % 4 === 0) P.lionLevel++;
  E.addToHand(P, m);
  return m;
};
E.addToHand = function (P, m) {
  if (P.hand.length >= R.hand && !card(m).spell) { /* hand full: the card is lost, as in the game */ return; }
  P.hand.push(m); E.checkTriple(P, m.id);
};
E.checkTriple = function (P, id) {
  if (card({ id: id }).tok || card({ id: id }).spell) return null;
  var all = P.board.concat(P.hand).filter(function (m) { return m.id === id && !m.gold; });
  if (all.length < 3) return null;
  var three = all.slice(0, 3), gm = E.own(id, true, 0);
  three.forEach(function (m) {
    gm.ba += m.ba; gm.bh += m.bh; gm.pc += m.pc;
    m.kwx.forEach(function (k) { if (gm.kwx.indexOf(k) < 0) gm.kwx.push(k); });
    var bi = P.board.indexOf(m); if (bi >= 0) P.board.splice(bi, 1);
    var hi = P.hand.indexOf(m); if (hi >= 0) P.hand.splice(hi, 1);
  });
  P.hand.push(gm); P.events.push({ k: "triple", id: id });
  return gm;
};
E.sell = function (g, P, m) {
  var i = P.board.indexOf(m); if (i < 0) return;
  var c = card(m);
  P.board.splice(i, 1); P.gold = Math.min(P.gold + R.sell, 99);
  if (c.sell) c.sell(P, m, m.gold ? 2 : 1);
  if (!c.tok) returnToPool(g, m.id, m.pc);
};
E.refresh = function (g, P) {
  if (P.freeRefresh > 0) P.freeRefresh--; else { if (P.gold < R.refresh) return false; P.gold -= R.refresh; }
  P.frozen = false; E.rollShop(g, P); return true;
};
E.upgrade = function (g, P) {
  var c = E.upCost(g, P); if (c == null || P.gold < c) return false;
  P.gold -= c; P.tier++; P.tierSince = g.turn; return true;
};
E.needsTarget = function (P, m) {
  var c = card(m);
  return !!(c.tg && P.board.length);
};
// play a hand card to the board at position pos
E.play = function (g, P, m, pos) {
  var c = card(m);
  if (c.spell) { P.hand.splice(P.hand.indexOf(m), 1); H.queueDiscover(P, m.tier || Math.min(P.tier + 1, 6), "Triple Reward"); return true; }
  if (P.board.length >= R.board) return false;
  P.hand.splice(P.hand.indexOf(m), 1);
  if (pos == null || pos > P.board.length) pos = P.board.length;
  P.board.splice(pos, 0, m);
  E.runBattlecry(P, m, false);
  P.board.forEach(function (o) { if (o !== m) { var oc = card(o); if (oc.onPlay) oc.onPlay(P, o, o.gold ? 2 : 1, m); } });
  if (m.gold && !m.noReward) { var tr = E.own("triple_reward", false, 0); tr.tier = Math.min(P.tier + 1, 6); E.addToHand(P, tr); }
  E.checkTriple(P, m.id);
  return true;
};
E.runBattlecry = function (P, m, once) {
  var c = card(m); if (!c.bc) return;
  var times = 1;
  if (!once) P.board.forEach(function (o) { if (card(o).echoBC) times += o.gold ? 2 : 1; });
  for (var i = 0; i < times; i++) c.bc(P, m, m.gold ? 2 : 1);
};
E.offerDiscover = function (g, P) {
  var d = P.discover[0]; if (!d) return null;
  if (!d.offer) d.offer = drawTier(g, d.tier, 3, true);
  return d;
};
E.chooseDiscover = function (g, P, i) {
  var d = P.discover.shift(); if (!d || !d.offer) return;
  d.offer.forEach(function (id, k) { if (k !== i) returnToPool(g, id, 1); });
  if (d.offer[i]) E.addToHand(P, E.own(d.offer[i], false, 1));
};

// hero powers (shop side)
E.powerReady = function (P) {
  var h = P.hero; if (h.passive) return false;
  var uses = h.uses || 1;
  return P.powerUses < uses && P.gold >= h.cost;
};
E.usePower = function (g, P, target) {
  var h = P.hero; if (!E.powerReady(P)) return false;
  if (h.target && !target) return false;
  P.gold -= h.cost; P.powerUses++;
  if (h.id === "brass_lion") H.buffOwned(target, 2 + P.lionLevel, 2 + P.lionLevel);
  else if (h.id === "storm_crow") { P.frozen = false; E.rollShop(g, P, true); }
  else if (h.id === "brass_stag") { if (g.turn % 2 === 0) H.buffOwned(target, 0, P.tier); else H.buffOwned(target, P.tier, 0); }
  else if (h.id === "wind_spirit") { if (target.kwx.indexOf("shield") < 0) target.kwx.push("shield"); }
  return true;
};

// ---------------- ghosts (and auto play) ----------------
function value(P, id, golden) {
  var c = BY[id], v = c.t * 3 + c.a + c.h;
  if (c.kw.indexOf("shield") >= 0) v += 2 + c.a * 0.5;
  if (c.kw.indexOf("taunt") >= 0) v += 1;
  if (c.kw.indexOf("reborn") >= 0) v += 1.5;
  if (c.kw.indexOf("wf") >= 0) v += c.a * 0.6;
  if (c.dr || c.soc || c.eot || c.av) v += 2;
  var same = P.board.concat(P.hand).filter(function (m) { return m.id === id && !m.gold; }).length;
  v += same * 7;
  var race = P.board.filter(function (m) { return card(m).r === c.r; }).length;
  v += race * 0.6;
  return v * (golden ? 2 : 1);
}
function ownedValue(P, m) { var c = card(m); return value(P, m.id, m.gold) - (P.board.concat(P.hand).filter(function (o) { return o.id === m.id && !o.gold; }).length) * 7 + (m.ba + m.bh) * 0.8 + (c.tok ? -4 : 0); }
function targetTier(turn, aggro) {
  var t = [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6][Math.min(turn, 10)];
  if (aggro > 1.15 && turn >= 3) t = Math.min(6, t + 1);
  return t;
}
E.bestTarget = function (P, exclude) {
  var list = P.board.filter(function (m) { return m !== exclude; });
  return list.sort(function (a, b) { return (E.atk(P, b) + E.hp(P, b)) - (E.atk(P, a) + E.hp(P, a)); })[0] || null;
};
E.aiPlayHand = function (g, P) {
  var guard = 0;
  while (P.hand.length && guard++ < 20) {
    var m = P.hand[0], c = card(m);
    if (c.spell) { E.play(g, P, m); E.aiDiscover(g, P); continue; }
    if (P.board.length >= R.board) {
      var worst = P.board.slice().sort(function (a, b) { return ownedValue(P, a) - ownedValue(P, b); })[0];
      if (worst && ownedValue(P, worst) < ownedValue(P, m)) E.sell(g, P, worst); else break;
    }
    E.play(g, P, m, P.board.length);
    E.aiDiscover(g, P);
  }
};
E.aiDiscover = function (g, P) {
  var guard = 0;
  while (P.discover.length && guard++ < 6) {
    var d = E.offerDiscover(g, P); if (!d || !d.offer.length) { P.discover.shift(); continue; }
    var best = 0; d.offer.forEach(function (id, i) { if (value(P, id) > value(P, d.offer[best])) best = i; });
    E.chooseDiscover(g, P, best);
  }
};
E.aiTurn = function (g, P) {
  var c = E.upCost(g, P);
  if (c != null && P.gold >= c && (P.tier < targetTier(g.turn, P.aggro) || c <= 1) && !(P.board.length < 2 && g.turn > 2)) E.upgrade(g, P);
  var refreshes = 0, guard = 0;
  while (guard++ < 30) {
    E.aiPlayHand(g, P);
    if (P.gold >= R.buy && P.shop.length) {
      var bi = 0; P.shop.forEach(function (s, i) { if (value(P, s.id) > value(P, P.shop[bi].id)) bi = i; });
      var bv = value(P, P.shop[bi].id);
      var worst = P.board.slice().sort(function (a, b) { return ownedValue(P, a) - ownedValue(P, b); })[0];
      if (P.board.length < R.board || (worst && bv > ownedValue(P, worst) + 2)) { E.buy(g, P, bi); continue; }
    }
    if ((P.freeRefresh > 0 || P.gold >= R.buy + R.refresh || (P.gold >= R.refresh && P.board.length >= R.board)) && refreshes < 4 && P.gold > 0) {
      if (P.gold >= R.buy + R.refresh || P.freeRefresh > 0) { E.refresh(g, P); refreshes++; continue; }
    }
    break;
  }
  E.aiPlayHand(g, P);
  // hero power
  var h = P.hero, tries = 0;
  while (E.powerReady(P) && tries++ < 3) {
    if (h.target) { var t = h.id === "wind_spirit" ? P.board.filter(function (m) { return !E.hasKw(m, "shield"); }).sort(function (a, b) { return E.atk(P, b) - E.atk(P, a); })[0] : E.bestTarget(P);
      if (!t) break; E.usePower(g, P, t); }
    else if (h.id === "storm_crow" && P.gold >= R.buy + 1 && P.hand.length < R.hand) { E.usePower(g, P); E.aiTurn2(g, P); }
    else break;
  }
  // order: taunts and shields to the front lines, cleave-free so just put strongest attackers left
  P.board.sort(function (a, b) { return (E.hasKw(b, "taunt") ? 0 : 1) - (E.hasKw(a, "taunt") ? 0 : 1); });
};
E.aiTurn2 = function (g, P) {
  var guard = 0;
  while (P.gold >= R.buy && P.shop.length && guard++ < 4) {
    var bi = 0; P.shop.forEach(function (s, i) { if (value(P, s.id) > value(P, P.shop[bi].id)) bi = i; });
    E.buy(g, P, bi); E.aiPlayHand(g, P);
  }
};

// ---------------- pairing ----------------
E.pair = function (g) {
  var alive = g.players.filter(function (p) { return p.alive; });
  var best = null;
  for (var tries = 0; tries < 12; tries++) {
    var a = shuffle(g.rng, alive.slice()), ok = true, pairs = [];
    for (var i = 0; i + 1 < a.length; i += 2) { pairs.push([a[i], a[i + 1]]); if (a[i].lastOpp === a[i + 1].idx && alive.length > 2) ok = false; }
    var odd = a.length % 2 ? a[a.length - 1] : null;
    best = { pairs: pairs, odd: odd };
    if (ok) break;
  }
  return best;
};

// ---------------- combat ----------------
function snapMinion(P, m) { // owned -> combat minion
  var c = card(m), g = m.gold ? 2 : 1, a = E.atk(P, m), h = E.hp(P, m);
  if (c.statMod && P) { var d = c.statMod(P, m, g); a += d[0]; h += d[1]; }
  var kw = {}; c.kw.concat(m.kwx || []).forEach(function (k) { kw[k] = true; });
  return { uid: UID++, ref: m, id: m.id, card: c, gold: m.gold, atk: a, hp: h, kw: kw, base: { reborn: !!kw.reborn }, av: 0 };
}
E.boardCopy = function (P) { return { name: P.name, hero: P.hero, tier: P.tier, board: P.board.map(function (m) { return { id: m.id, gold: m.gold, ba: m.ba + (P.raceAtk[card(m).r] || 0), bh: m.bh + (P.raceHp[card(m).r] || 0), kwx: m.kwx.slice(), uid: m.uid }; }) }; };

E.combat = function (A, B, seed, record) {
  // A, B: { P (player or null), board (owned list), tier, hero }
  var rng = mulberry(seed);
  var sides = [A.board.map(function (m) { return snapMinion(A.P, m); }), B.board.map(function (m) { return snapMinion(B.P, m); })];
  sides.forEach(function (l, s) { l.forEach(function (m) { m.side = s; }); });
  var owners = [A.P, B.P], heroes = [A.hero, B.hero];
  var events = [], hits = [], born = [], died = [], pending = [];
  var C = {
    rng: rng,
    allies: function (s) { return sides[s].filter(function (m) { return !m.dead; }); },
    enemies: function (s) { return sides[1 - s].filter(function (m) { return !m.dead && m.hp > 0; }); },
    everyone: function () { return sides[0].concat(sides[1]).filter(function (m) { return !m.dead && m.hp > 0; }); },
    indexOf: function (m) { return sides[m.side].indexOf(m); },
    adjacent: function (m) { var l = sides[m.side], i = l.indexOf(m); return [l[i - 1], l[i + 1]].filter(function (x) { return x && !x.dead; }); },
    buff: function (m, a, h) { m.atk += a; m.hp += h; },
    giveKw: function (m, k) { m.kw[k] = true; },
    destroy: function (m) { m.hp = 0; hits.push({ uid: m.uid, amt: 0, kill: true }); },
    damage: function (m, amt, src) {
      if (amt <= 0 || m.dead || m.hp <= 0) return;
      if (m.kw.shield) { m.kw.shield = false; hits.push({ uid: m.uid, pop: true }); return; }
      m.hp -= amt; hits.push({ uid: m.uid, amt: amt });
      if (src && src.kw && src.kw.sour) m.hp = Math.min(m.hp, 0);
      if (m.hp <= 0 && src) m.killer = src;
      if (m.card.hurt) m.card.hurt(C, m.side, m, m.gold ? 2 : 1);
    },
    summon: function (s, id, pos, g) {
      if (!id) return null;
      var l = sides[s]; if (l.filter(function (m) { return !m.dead; }).length >= R.board) return null;
      var o = { id: id, gold: g === 2, ba: 0, bh: 0, kwx: [] };
      var m = snapMinion(owners[s], o); m.side = s; m.summoned = true;
      if (pos == null || pos > l.length) pos = l.length; if (pos < 0) pos = 0;
      l.splice(pos, 0, m); born.push(m.uid);
      return m;
    },
    attackNow: function (m) { pending.push(m); },
    handBuff: function (s, a, h) {
      var P = owners[s]; if (!P || !P.hand) return;
      var l = P.hand.filter(function (m) { return !card(m).spell; }); if (!l.length) return;
      var x = l[Math.floor(rng() * l.length)]; x.ba += a; x.bh += h;
    },
    raceBuff: function (s, race, a, h) {
      var P = owners[s]; if (P && P.raceAtk) { P.raceAtk[race] += a; P.raceHp[race] += h; }
      C.allies(s).forEach(function (m) { if (m.card.r === race) C.buff(m, a, h); });
    }
  };
  function snap() {
    return sides.map(function (l) { return l.filter(function (m) { return !m.dead; }).map(function (m) {
      return { uid: m.uid, id: m.id, gold: m.gold, atk: m.atk, hp: m.hp, shield: !!m.kw.shield, taunt: !!m.kw.taunt,
        reborn: !!m.kw.reborn, wf: !!m.kw.wf, sour: !!m.kw.sour, dr: !!m.card.dr, tok: !!m.card.tok }; }); });
  }
  function push(ev) {
    if (!record) { hits = []; born = []; died = []; return; }
    ev.hits = hits; ev.born = born; ev.died = died; ev.snap = snap(); events.push(ev); hits = []; born = []; died = [];
  }
  function deaths() {
    var guard = 0;
    while (guard++ < 40) {
      var any = false;
      for (var s = 0; s < 2; s++) {
        var l = sides[s];
        for (var i = 0; i < l.length; i++) {
          var m = l[i];
          if (m.dead || m.hp > 0) continue;
          any = true; m.dead = true; died.push(m.uid);
          var pos = i; l.splice(i, 1); i--;
          var g = m.gold ? 2 : 1;
          if (m.card.dr) {
            var times = 1;
            C.allies(s).forEach(function (o) { if (o.card.echoDR) times += o.gold ? 2 : 1; });
            for (var k = 0; k < times; k++) { m.card.dr(C, s, m, g, pos); if (owners[s]) owners[s].drCount = (owners[s].drCount || 0) + 1; }
          }
          if (m.kw.reborn && m.base.reborn) {
            var r = C.summon(s, m.id, pos, g);
            if (r) { r.hp = 1; r.kw.reborn = false; r.base.reborn = false; }
          }
          C.allies(s).forEach(function (o) { if (o.card.av) { o.av++; if (o.av >= o.card.av) { o.av = 0; o.card.avf(C, s, o, o.gold ? 2 : 1); } } });
          if (m.killer && !m.killer.dead && m.killer.card.kill) m.killer.card.kill(C, m.killer.side, m.killer, m.killer.gold ? 2 : 1);
          i = Math.min(i, l.length - 1);
        }
      }
      if (!any) break;
    }
  }
  function attack(a, s, extra) {
    if (a.dead || a.hp <= 0) return false;
    var targets = C.enemies(s); if (!targets.length) return false;
    var g = a.gold ? 2 : 1;
    if (a.card.rally) a.card.rally(C, s, a, g);
    C.allies(s).forEach(function (o) { if (o !== a && o.card.allyAtk) o.card.allyAtk(C, s, o, o.gold ? 2 : 1, a); });
    targets = C.enemies(s); if (!targets.length) { deaths(); push({ k: "atk", s: s, src: a.uid, tgt: null }); return true; }
    var taunts = targets.filter(function (m) { return m.kw.taunt; });
    var pool = taunts.length ? taunts : targets;
    var t = pool[Math.floor(rng() * pool.length)];
    var aa = a.atk, ta = t.atk;
    C.damage(t, aa, a); C.damage(a, ta, t);
    deaths();
    push({ k: "atk", s: s, src: a.uid, tgt: t.uid, extra: !!extra, srcId: a.id, srcGold: a.gold, srcTier: a.card.t });
    return true;
  }
  function flushPending() {
    var guard = 0;
    while (pending.length && guard++ < 20) {
      var m = pending.shift();
      if (!m.dead && m.hp > 0 && m.atk > 0 && C.enemies(m.side).length) attack(m, m.side, true);
    }
  }
  var initial = snap();
  // who attacks first: more minions; tie random
  var first = sides[0].length > sides[1].length ? 0 : sides[1].length > sides[0].length ? 1 : (rng() < 0.5 ? 0 : 1);
  // start of combat: hero powers, then minions, first side first
  [first, 1 - first].forEach(function (s) {
    var h = heroes[s]; if (!h) return;
    var l = C.allies(s); if (!l.length) return;
    if (h.id === "brass_boar") {
      var ends = [l[0], l[l.length - 1]].filter(function (m, i, arr) { return arr.indexOf(m) === i; });
      ends.forEach(function (m) { C.buff(m, 2, 1); });
      push({ k: "hero", s: s, hero: h.id });
      ends.forEach(function (m) { pending.push(m); }); flushPending();
    } else if (h.id === "thunder_wolf") {
      var m0 = l[0]; m0.kw.wf = true; m0.kw.shield = true; m0.kw.taunt = true;
      push({ k: "hero", s: s, hero: h.id });
    }
  });
  [first, 1 - first].forEach(function (s) {
    sides[s].slice().forEach(function (m) {
      if (m.dead || !m.card.soc) return;
      m.card.soc(C, s, m, m.gold ? 2 : 1);
      deaths();
      push({ k: "soc", s: s, src: m.uid, srcId: m.id, srcGold: m.gold, srcTier: m.card.t });
      flushPending();
    });
  });
  // main loop: one attack at a time, alternating, left to right
  var queue = [[], []], turn = first, n = 0;
  function nextAttacker(s) {
    for (var pass = 0; pass < 2; pass++) {
      if (!queue[s].length) queue[s] = sides[s].map(function (m) { return m.uid; });
      while (queue[s].length) {
        var uid = queue[s].shift();
        var m = sides[s].filter(function (x) { return x.uid === uid && !x.dead && x.atk > 0; })[0];
        if (m) return m;
      }
    }
    return null;
  }
  while (n++ < 400) {
    var a0 = C.allies(0).filter(function (m) { return m.hp > 0; }), a1 = C.allies(1).filter(function (m) { return m.hp > 0; });
    if (!a0.length || !a1.length) break;
    var can0 = a0.some(function (m) { return m.atk > 0; }), can1 = a1.some(function (m) { return m.atk > 0; });
    if (!can0 && !can1) break;
    var s = turn;
    if (!(s === 0 ? can0 : can1)) { turn = 1 - s; continue; }
    var att = nextAttacker(s);
    if (!att) { turn = 1 - s; continue; }
    var l = sides[s], ai = l.indexOf(att);
    var right = l.slice(ai + 1).map(function (m) { return m.uid; });
    attack(att, s);
    if (att.kw.wf && !att.dead && att.hp > 0) attack(att, s);
    flushPending();
    queue[s] = right;
    turn = 1 - s;
  }
  var left = [C.allies(0).filter(function (m) { return m.hp > 0; }), C.allies(1).filter(function (m) { return m.hp > 0; })];
  var winner = left[0].length && !left[1].length ? 0 : left[1].length && !left[0].length ? 1 : -1;
  var dmg = 0;
  if (winner >= 0) { dmg = (winner === 0 ? A.tier : B.tier); left[winner].forEach(function (m) { dmg += m.card.t || 1; }); }
  return { winner: winner, dmg: dmg, events: events, initial: initial, first: first, survivors: winner >= 0 ? left[winner].length : 0 };
};

// one round of fights for the lobby. Returns the player's own fight for playback.
E.fightRound = function (g) {
  var pr = E.pair(g), out = { mine: null, results: [] };
  var alive = g.players.filter(function (p) { return p.alive; }).length;
  var cap = R.cap(g.turn, alive);
  function fight(P, Q, ghost) {
    var seed = Math.floor(g.rng() * 1e9);
    var rec = P.you || (Q && Q.you);
    var A = { P: P, board: P.board, tier: P.tier, hero: P.hero };
    var B = ghost ? { P: null, board: ghost.board, tier: ghost.tier, hero: ghost.hero } : { P: Q, board: Q.board, tier: Q.tier, hero: Q.hero };
    var r = E.combat(A, B, seed, rec);
    var dmg = Math.min(r.dmg, cap);
    var res = { a: P.idx, b: ghost ? -1 : Q.idx, ghostName: ghost ? ghost.name : null, winner: r.winner, dmg: dmg, rawDmg: r.dmg, r: r, ghost: ghost };
    P.lastOpp = ghost ? -1 : Q.idx; if (Q) Q.lastOpp = P.idx;
    if (r.winner === 1) { E.hurtHero(P, dmg); P.lastResult = "loss"; if (Q) Q.lastResult = "win"; }
    else if (r.winner === 0) { if (Q) { E.hurtHero(Q, dmg); Q.lastResult = "loss"; } P.lastResult = "win"; }
    else { P.lastResult = "tie"; if (Q) Q.lastResult = "tie"; }
    out.results.push(res);
    if (rec) out.mine = res;
  }
  pr.pairs.forEach(function (p) { fight(p[0], p[1]); });
  if (pr.odd) {
    var dead = g.deadOrder.length ? g.deadOrder[g.deadOrder.length - 1] : null;
    var ghost = dead ? dead.copy : { name: "Empty Stage", hero: null, tier: 1, board: [] };
    fight(pr.odd, null, ghost);
  }
  // deaths
  var now = g.players.filter(function (p) { return p.alive && p.hp <= 0; }).sort(function (a, b) { return a.hp - b.hp; });
  var aliveBefore = g.players.filter(function (p) { return p.alive; }).length;
  now.forEach(function (p, i) {
    p.alive = false; p.place = aliveBefore - (now.length - 1 - i);
    g.deadOrder.push({ idx: p.idx, copy: Object.assign(E.boardCopy(p), { name: p.name }) });
    // a dead player's cards go back to the pool
    p.board.concat(p.hand).forEach(function (m) { if (!card(m).tok && !card(m).spell) returnToPool(g, m.id, m.pc); });
    E.returnShop(g, p);
  });
  var left = g.players.filter(function (p) { return p.alive; });
  if (left.length === 1) left[0].place = 1;
  return out;
};

E.card = card;
window.BG_ENGINE = E;
})();
