/* Bag Battle: Backpack Battles' core loop with Music Battler's world on top.
   Rules and numbers: docs/research/real-game/02-card-lineup-b.md s2 and docs/research/families/items.md (BPB rows). */
(function () {
  'use strict';
  var DATA = window.BB_DATA, SONG = window.SONG;
  var DEF = {}; DATA.items.forEach(function (d) { DEF[d.id] = d; });
  var COLS = 7, ROWS = 9;
  // Gold per round (round 1 is the 13 start gold): 260 over 18 rounds.
  var GOLD = [13, 13, 15, 10, 11, 11, 12, 22, 13, 18, 14, 14, 15, 15, 16, 16, 16, 16];
  // Rarity odds by round, C R E L G (%). Sourced points: round 1 90/10, Legendary from round 4 at 1%,
  // Godly from round 6 at 1%, rounds 12-18 20% each. The rows between are interpolated.
  var ODDS = [null,
    [90, 10, 0, 0, 0], [80, 18, 2, 0, 0], [70, 25, 5, 0, 0], [60, 29, 10, 1, 0], [50, 33, 14, 3, 0],
    [42, 34, 17, 6, 1], [36, 32, 21, 8, 3], [30, 30, 25, 10, 5], [27, 28, 26, 13, 6], [25, 26, 26, 15, 8],
    [22, 24, 26, 17, 11]];
  for (var i = 12; i <= 18; i++) ODDS[i] = [20, 20, 20, 20, 20];
  var RAR = ['C', 'R', 'E', 'L', 'G'];
  var RNAME = { C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary', G: 'Godly', U: 'Unique' };
  // Health by round: 25 at 1, 100 at 7, 150 at 10, 350 at 18 (linear between).
  var HPA = [[1, 25], [7, 100], [10, 150], [18, 350]];
  function maxHpFor(r) {
    for (var k = 0; k < HPA.length - 1; k++) {
      var a = HPA[k], b = HPA[k + 1];
      if (r <= b[0]) return Math.round(a[1] + (b[1] - a[1]) * (r - a[0]) / (b[0] - a[0]));
    }
    return 350;
  }
  var WINS_TO_WIN = 10, LIVES = 5, MAX_ROUNDS = 18, SHOP_SIZE = 5;
  var FATIGUE_AT = 17;
  var BEAT = 60 / SONG.bpm, STEP = BEAT / 4, Q = BEAT / 2; // quantize item fires to the 8th-note grid
  var BNAME = { block: 'Hold', empower: 'Power', heat: 'Tempo', luck: 'Luck', regen: 'Sustain', spikes: 'Spikes', vamp: 'Drain', mana: 'Mana', blind: 'Glare', cold: 'Drag', poison: 'Sour' };
  var AUTO = /[?&]auto=1/.test(location.search) || window.__auto === true;

  // ---------- rng ----------
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ri(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  // ---------- shapes ----------
  DATA.items.forEach(function (d) {
    var rows = d.p.split('/'), cells = [], stars = [];
    rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) { if (row[x] === 'X') cells.push([x, y]); else if (row[x] === 'S') stars.push([x, y]); } });
    if (d.ring) {
      var has = {}; cells.forEach(function (c) { has[c] = 1; }); stars.forEach(function (c) { has['s' + c] = 1; });
      cells.forEach(function (c) { for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var n = [c[0] + dx, c[1] + dy]; if (!has[n] && !has['s' + n]) { has['s' + n] = 1; stars.push(n); } } });
    }
    var mx = Math.min.apply(null, cells.map(function (c) { return c[0]; })), my = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    d.cells = cells.map(function (c) { return [c[0] - mx, c[1] - my]; });
    d.stars = stars.map(function (c) { return [c[0] - mx, c[1] - my]; });
    d.kind = d.bag ? 'bag' : 'item';
    d.isStrike = !!d.w;
  });
  var SHAPE = {};
  function shape(id, rot) {
    var k = id + ':' + rot; if (SHAPE[k]) return SHAPE[k];
    var d = DEF[id], cs = d.cells.map(function (c) { return c.slice(); }), ss = d.stars.map(function (c) { return c.slice(); });
    for (var r = 0; r < rot; r++) { cs = cs.map(function (c) { return [-c[1], c[0]]; }); ss = ss.map(function (c) { return [-c[1], c[0]]; }); }
    var mx = Math.min.apply(null, cs.map(function (c) { return c[0]; })), my = Math.min.apply(null, cs.map(function (c) { return c[1]; }));
    cs = cs.map(function (c) { return [c[0] - mx, c[1] - my]; }); ss = ss.map(function (c) { return [c[0] - mx, c[1] - my]; });
    var w = 1 + Math.max.apply(null, cs.map(function (c) { return c[0]; })), h = 1 + Math.max.apply(null, cs.map(function (c) { return c[1]; }));
    return (SHAPE[k] = { cells: cs, stars: ss, w: w, h: h });
  }
  function cellsOf(it, x, y, rot) {
    var s = shape(it.id, rot == null ? it.rot : rot); x = x == null ? it.x : x; y = y == null ? it.y : y;
    return s.cells.map(function (c) { return [c[0] + x, c[1] + y]; });
  }
  function inGrid(c) { return c[0] >= 0 && c[1] >= 0 && c[0] < COLS && c[1] < ROWS; }
  function idx(c) { return c[1] * COLS + c[0]; }

  // ---------- board ----------
  function bagMap(items, skip) {
    var m = new Array(COLS * ROWS).fill(0);
    items.forEach(function (it) { if (it.loc === 'bag' && DEF[it.id].bag && it !== skip) cellsOf(it).forEach(function (c) { m[idx(c)] = it.uid; }); });
    return m;
  }
  function occMap(items, skip) {
    var m = new Array(COLS * ROWS).fill(0);
    items.forEach(function (it) { if (it.loc === 'bag' && !DEF[it.id].bag && skip.indexOf(it) < 0) cellsOf(it).forEach(function (c) { m[idx(c)] = it.uid; }); });
    return m;
  }
  // can `it` sit at x,y,rot? (skip: items to ignore, e.g. itself and the contents of a moving bag)
  function canPlace(items, it, x, y, rot, skip) {
    skip = skip || [it];
    var cs = cellsOf(it, x, y, rot);
    if (!cs.every(inGrid)) return false;
    if (DEF[it.id].bag) { var bm = bagMap(items, it); return cs.every(function (c) { return !bm[idx(c)]; }); }
    var bm2 = bagMap(items), om = occMap(items, skip);
    return cs.every(function (c) { return bm2[idx(c)] && !om[idx(c)]; });
  }
  function contentsOf(items, bag) {
    var mine = {}; cellsOf(bag).forEach(function (c) { mine[idx(c)] = 1; });
    var full = [], part = [];
    items.forEach(function (it) {
      if (it.loc !== 'bag' || DEF[it.id].bag) return;
      var cs = cellsOf(it), n = cs.filter(function (c) { return mine[idx(c)]; }).length;
      if (n === cs.length) full.push(it); else if (n) part.push(it);
    });
    return { full: full, part: part };
  }
  function bagOf(items, it) {
    var bm = bagMap(items), c = cellsOf(it)[0], u = bm[idx(c)];
    for (var i = 0; i < items.length; i++) if (items[i].uid === u) return items[i];
    return null;
  }
  function freeBagCells(items) {
    var bm = bagMap(items), om = occMap(items, []), n = 0;
    for (var i = 0; i < bm.length; i++) if (bm[i] && !om[i]) n++;
    return n;
  }
  // move a bag with what sits fully on it; partial items fall to storage
  function moveBag(items, bag, x, y, rot) {
    var con = contentsOf(items, bag);
    if (rot !== bag.rot) { con.full.forEach(function (it) { it.loc = 'storage'; }); }
    else { var dx = x - bag.x, dy = y - bag.y; con.full.forEach(function (it) { it.x += dx; it.y += dy; }); }
    con.part.forEach(function (it) { it.loc = 'storage'; });
    bag.x = x; bag.y = y; bag.rot = rot; bag.loc = 'bag';
  }
  function canPlaceBag(items, bag, x, y, rot) {
    var cs = cellsOf(bag, x, y, rot); if (!cs.every(inGrid)) return false;
    var bm = bagMap(items, bag); return cs.every(function (c) { return !bm[idx(c)]; });
  }
  // first fit, preferring spots next to recipe partners (and for bags, next to other bags)
  function autoPlace(items, it, rng) {
    var best = null, bestScore = -1e9, d = DEF[it.id];
    var partners = partnersFor(it.id), bm = bagMap(items);
    for (var rot = 0; rot < 4; rot++) {
      var s = shape(it.id, rot);
      for (var y = 0; y <= ROWS - s.h; y++) for (var x = 0; x <= COLS - s.w; x++) {
        if (d.bag) { if (!canPlaceBag(items, it, x, y, rot)) continue; }
        else if (!canPlace(items, it, x, y, rot)) continue;
        var sc = -(Math.abs(x + s.w / 2 - COLS / 2) + Math.abs(y + s.h / 2 - ROWS / 2)) * 0.2 - rot * 0.05;
        var cs = cellsOf(it, x, y, rot);
        if (d.bag) { cs.forEach(function (c) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var n = [c[0] + o[0], c[1] + o[1]]; if (inGrid(n) && bm[idx(n)]) sc += 1; }); }); }
        else if (partners.length) {
          var near = neighboursAt(items, cs);
          if (near.some(function (o) { return partners.indexOf(o.id) >= 0; })) sc += 20;
        }
        if (rng) sc += rng() * 0.3;
        if (sc > bestScore) { bestScore = sc; best = [x, y, rot]; }
      }
    }
    if (!best) return false;
    it.x = best[0]; it.y = best[1]; it.rot = best[2]; it.loc = 'bag';
    return true;
  }
  function neighboursAt(items, cs) {
    var mine = {}; cs.forEach(function (c) { mine[idx(c)] = 1; });
    var om = occMap(items, []), out = [], seen = {};
    cs.forEach(function (c) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var n = [c[0] + o[0], c[1] + o[1]]; if (!inGrid(n) || mine[idx(n)]) return; var u = om[idx(n)]; if (u && !seen[u]) { seen[u] = 1; out.push(items.filter(function (i) { return i.uid === u; })[0]); } }); });
    return out.filter(Boolean);
  }
  function partnersFor(id) {
    var p = [];
    DATA.recipes.forEach(function (r) { if (r.a === id && r.b) p.push(r.b); if (r.b === id) p.push(r.a); if (r.a === id && r.cat) p.push(r.cat); });
    return p;
  }
  function adjacent(items, a, b) { return neighboursAt(items, cellsOf(a)).indexOf(b) >= 0; }

  // recipes: run at the start of each shop phase
  function combine(R) {
    var done = [], items = R.items, guard = 0, again = true;
    while (again && guard++ < 20) {
      again = false;
      var bagged = items.filter(function (i) { return i.loc === 'bag' && !DEF[i.id].bag; });
      for (var k = 0; k < DATA.recipes.length && !again; k++) {
        var rc = DATA.recipes[k];
        for (var i = 0; i < bagged.length && !again; i++) {
          var a = bagged[i]; if (a.id !== rc.a || a.lock) continue;
          if (rc.cat) {
            var cat = bagged.filter(function (o) { return o !== a && o.id === rc.cat && adjacent(items, a, o); })[0];
            if (!cat) continue;
            again = true; doCombine(R, [a], rc.out, done, rc);
          } else {
            var b = bagged.filter(function (o) { return o !== a && o.id === rc.b && !o.lock && adjacent(items, a, o); })[0];
            if (!b) continue;
            again = true; doCombine(R, [a, b], rc.out, done, rc);
          }
        }
      }
    }
    return done;
  }
  function doCombine(R, ins, outId, done, rc) {
    var at = ins[0];
    ins.forEach(function (x) { var j = R.items.indexOf(x); if (j >= 0) R.items.splice(j, 1); });
    var it = newItem(R, outId);
    var ok = false;
    for (var q = 0; q < ins.length && !ok; q++) for (var rot = 0; rot < 4 && !ok; rot++) if (canPlace(R.items, it, ins[q].x, ins[q].y, rot)) { it.x = ins[q].x; it.y = ins[q].y; it.rot = rot; it.loc = 'bag'; ok = true; }
    if (!ok) ok = autoPlace(R.items, it, R.rng);
    if (!ok) it.loc = 'storage';
    R.items.push(it);
    done.push({ ins: ins.map(function (x) { return x.id; }), out: outId, cat: rc.cat || null, uid: it.uid });
  }
  function newItem(R, id) { return { uid: ++R.uid, id: id, x: 0, y: 0, rot: 0, loc: 'storage', paid: DEF[id].c }; }

  // ---------- run ----------
  function newRun(seed, leader, race, isBot) {
    var R = { seed: seed, rng: mulberry(seed), round: 1, gold: 0, wins: 0, losses: 0, leader: leader, race: race,
      items: [], shop: [], rerolls: 0, uid: 0, log: [], isBot: !!isBot };
    var cb = newItem(R, DATA.leaders.filter(function (l) { return l.id === leader; })[0].bag);
    cb.x = 2; cb.y = 3; cb.loc = 'bag'; R.items.push(cb);
    var gb = newItem(R, 'gigbag'); gb.x = 2; gb.y = 6; gb.loc = 'bag'; R.items.push(gb);
    R.dig = function () { var d = rollItemId(R); var it = newItem(R, d); it.loc = 'storage'; R.items.push(it); return d; };
    return R;
  }
  function rollItemId(R) {
    var o = ODDS[Math.min(18, R.round)], x = R.rng() * 100, acc = 0, rar = 'C';
    for (var k = 0; k < 5; k++) { acc += o[k]; if (x < acc) { rar = RAR[k]; break; } }
    var pool = DATA.items.filter(function (d) { return d.r === rar && !d.noshop; });
    return pool[Math.floor(R.rng() * pool.length)].id;
  }
  function rollOffer(R) {
    var id = rollItemId(R), sale = R.rng() < 0.1, c = DEF[id].c;
    return { id: id, sale: sale, price: sale ? Math.ceil(c / 2) : c, reserved: false };
  }
  function refreshShop(R) {
    for (var k = 0; k < SHOP_SIZE; k++) { if (!R.shop[k] || !R.shop[k].reserved) R.shop[k] = rollOffer(R); }
  }
  function rerollCost(R) { return R.rerolls < 4 ? 1 : 2; }
  function reroll(R) {
    var c = rerollCost(R); if (R.gold < c) return false;
    R.gold -= c; R.rerolls++;
    for (var k = 0; k < SHOP_SIZE; k++) if (R.shop[k] && !R.shop[k].reserved) R.shop[k] = rollOffer(R);
    for (var j = 0; j < SHOP_SIZE; j++) if (!R.shop[j]) R.shop[j] = rollOffer(R);
    return true;
  }
  function sellValue(it) { return it.id === 'record' ? 9 : Math.max(1, Math.ceil(DEF[it.id].c / 2)); }
  function startShopPhase(R, first) {
    var events = [];
    if (!first) events = combine(R);
    R.gold += GOLD[Math.min(R.round, 18) - 1];
    R.rerolls = 0;
    var gains = [];
    R.items.forEach(function (it) { var d = DEF[it.id]; if (it.loc === 'bag' && d.shop) gains.push({ id: it.id, v: d.shop(it, R) }); });
    refreshShop(R);
    return { combos: events, gains: gains };
  }
  function buy(R, k) {
    var o = R.shop[k]; if (!o || R.gold < o.price) return null;
    R.gold -= o.price; R.shop[k] = null;
    var it = newItem(R, o.id); it.paid = o.price; R.items.push(it); return it;
  }
  function sell(R, it) {
    if (DEF[it.id].cls) return false;
    if (DEF[it.id].bag && it.loc === 'bag') { var con = contentsOf(R.items, it); con.full.concat(con.part).forEach(function (x) { x.loc = 'storage'; }); }
    R.gold += sellValue(it); R.items.splice(R.items.indexOf(it), 1); return true;
  }

  // ---------- bot (ghost builder and auto play) ----------
  function botScore(R, d) {
    var base = { C: 3, R: 5, E: 7, L: 9, G: 11 }[d.r] || 3;
    var items = R.items.filter(function (i) { return i.loc === 'bag'; });
    var weapons = items.filter(function (i) { return DEF[i.id].w && !DEF[i.id].nodmg; }).length;
    var free = freeBagCells(R.items), sz = d.cells.length;
    if (d.bag) return free < 4 ? base + 8 : free < 8 ? base + 2 : base - 4;
    var s = base;
    if (d.w) s += weapons < 2 ? 7 : weapons >= 4 ? -3 : 1;
    if (d.below || d.onAtk || d.cd) s += 1;
    if (partnersFor(d.id).some(function (p) { return items.some(function (i) { return i.id === p; }); })) s += 3;
    if (sz > free) s -= 100;
    return s + R.rng() * 2;
  }
  function botShop(R) {
    for (var guard = 0; guard < 30; guard++) {
      var best = -1, bs = 3;
      for (var k = 0; k < SHOP_SIZE; k++) {
        var o = R.shop[k]; if (!o || o.price > R.gold) continue;
        var s = botScore(R, DEF[o.id]); if (s > bs) { bs = s; best = k; }
      }
      if (best >= 0) {
        var it = buy(R, best);
        if (!autoPlace(R.items, it, R.rng)) { it.loc = 'storage'; }
        continue;
      }
      if (R.gold >= rerollCost(R) + 2 && R.rerolls < 6) { reroll(R); continue; }
      break;
    }
    // sell storage leftovers the bot could not place
    R.items.slice().forEach(function (it) { if (it.loc === 'storage' && !autoPlace(R.items, it, R.rng)) sell(R, it); });
  }
  var GHOSTS = {};
  function ghostFor(seed, round) {
    var key = seed + ':' + round; if (GHOSTS[key]) return GHOSTS[key];
    var g = mulberry(seed * 7 + round * 7919 + 13);
    var leader = DATA.leaders[Math.floor(g() * 3)].id, race = g() < 0.5 ? 'bellforge' : 'stormsong';
    var B = newRun((seed * 31 + round * 104729) >>> 0, leader, race, true);
    for (var r = 1; r <= round; r++) { B.round = r; startShopPhase(B, r === 1); botShop(B); }
    var names = ['The Copper Kings', 'The Low Comets', 'The Static Owls', 'The Hollow Lanterns', 'The Wild Engines', 'The Quiet Foxes', 'The Golden Moths', 'The Velvet Riot', 'The Paper Harbor', 'The Neon Tide'];
    GHOSTS[key] = { leader: leader, race: race, items: B.items.map(function (i) { return Object.assign({}, i); }), name: names[Math.floor(g() * names.length)] };
    return GHOSTS[key];
  }

  // ---------- fight ----------
  function makeSide(items, leader, race, round, name) {
    var hp = maxHpFor(round);
    var S = { name: name, leader: leader, race: race, hp: hp, max: hp, st: 5, stMax: 5, b: {}, d: {}, resist: 0, red: 0, redUntil: 0,
      critRes: 0, stunRes: 0, resBC: 0, dodge: 0, healMul: 1, stunUntil: -1, tmpBlind: null, items: [], allItems: items, bonusSt: 0, tonicsUsed: 0 };
    'block empower heat luck regen spikes vamp mana'.split(' ').forEach(function (k) { S.b[k] = 0; });
    'blind cold poison'.split(' ').forEach(function (k) { S.d[k] = 0; });
    var placed = items.filter(function (i) { return i.loc === 'bag'; });
    placed.forEach(function (it) {
      var d = DEF[it.id];
      var bag = bagOf(items, it);
      if (d.bag) { if (d.bag.stam) { S.stMax += d.bag.stam; S.st += d.bag.stam; } return; }
      S.items.push({ inst: it, def: d, side: S, ch: 0, cd: d.w ? d.w.cd : d.cd || 0, spd: 0, dmgAdd: 0, accAdd: 0, next: 0, cnt: 0, hits: 0, used: 0, gone: 0, bag: bag ? DEF[bag.id] : null, bagInst: bag, starList: null });
    });
    // star links: distinct items in star cells
    var at = {}; S.items.forEach(function (fi) { cellsOf(fi.inst).forEach(function (c) { at[idx(c)] = fi; }); });
    S.items.forEach(function (fi) {
      var s = shape(fi.inst.id, fi.inst.rot), list = [], free = 0;
      s.stars.forEach(function (c) { var n = [c[0] + fi.inst.x, c[1] + fi.inst.y]; if (!inGrid(n)) return; var o = at[idx(n)]; if (o && o !== fi) { if (list.indexOf(o) < 0) list.push(o); } else if (!o) free++; });
      fi.starList = list; fi.freeStars = free;
    });
    return S;
  }

  function Fight(A, B, seed, hooks) {
    var F = this; F.A = A; F.B = B; A.opp = B; B.opp = A; F.t = 0; F.rng = mulberry(seed); F.pending = []; F.over = false; F.winner = null;
    F.hooks = hooks || {}; F.nextRegen = 2; F.nextFat = FATIGUE_AT; F.fatDmg = 0; F.fatN = 0; F.log = [];
    var api = F.api = {
      rng: F.rng,
      me: function (fi) { return fi.side; }, op: function (fi) { return fi.side.opp; },
      stars: function (fi) { return fi.starList.filter(function (x) { return !x.gone; }); },
      freeStars: function (fi) { return fi.freeStars; },
      items: function (S) { return S.items.filter(function (x) { return !x.gone; }); },
      buff: function (S, k, n, src) {
        if (k === 'block' && src) S.items.forEach(function (x) { if (x.def.holdBoost && !x.gone && x.starList.indexOf(src) >= 0) n = n * (1 + x.def.holdBoost); });
        S.b[k] = (S.b[k] || 0) + Math.round(n);
      },
      debuff: function (S, k, n) {
        for (var j = 0; j < n; j++) {
          if (S.resist > 0) { S.resist--; continue; }
          if ((k === 'blind' || k === 'cold') && S.resBC && F.rng() < S.resBC) continue;
          S.d[k]++;
        }
      },
      cleanse: function (S, n, only) {
        var keys = only ? [only] : ['poison', 'blind', 'cold'];
        while (n > 0) { var k = keys.filter(function (x) { return S.d[x] > 0; })[0]; if (!k) break; S.d[k]--; n--; }
      },
      heal: function (S, n) {
        n = Math.round(n * S.healMul); if (n <= 0 || S.hp <= 0) return 0;
        var h = Math.min(n, S.max - S.hp); S.hp += h;
        if (F.hooks.num) F.hooks.num(S, '+' + n, 'heal');
        S.opp.items.forEach(function (x) { if (!x.gone && x.def.onOppHeal) x.def.onOppHeal(x, api); });
        return h;
      },
      addMax: function (S, n) { S.max += n; S.hp += n; },
      st: function (S, n) { S.st = Math.max(0, Math.min(S.stMax, S.st + n)); },
      most: function (S) { var ks = ['empower', 'heat', 'luck', 'regen', 'spikes', 'vamp'], b = ks[0]; ks.forEach(function (k) { if (S.b[k] > S.b[b]) b = k; }); return b; },
      least: function (S) { var ks = ['empower', 'heat', 'luck', 'regen', 'spikes', 'vamp'], b = ks[0]; ks.forEach(function (k) { if (S.b[k] < S.b[b]) b = k; }); return b; },
      consume: function (fi) {
        fi.gone = 1; fi.used = 1; var S = fi.side;
        if (fi.bag && fi.bag.bag && fi.bag.bag.tonics) {
          S.tonicsUsed++;
          if (S.tonicsUsed === 1) api.buff(S, ['empower', 'heat', 'luck', 'regen', 'spikes', 'vamp'][Math.floor(F.rng() * 6)], 1);
          if (S.tonicsUsed === 4) api.cleanse(S, 10);
        }
        if (F.hooks.gone) F.hooks.gone(fi);
      },
      stun: function (fi, sec) {
        var o = fi.side.opp; if (F.rng() < o.stunRes) return;
        o.stunUntil = Math.max(o.stunUntil, F.t + sec);
        fi.side.items.forEach(function (x) { if (!x.gone && x.def.onStun) x.def.onStun(x, api); });
      },
      extra: function (fi) { F.attack(fi, F.t, true); },
      tmpBlind: function (S, n, sec) { S.d.blind += n; S.tmpBlind = { n: n, until: F.t + sec }; },
      dmg: function (from, to, n, o) { return F.applyDamage(from, to, n, o || {}); },
      flash: function (fi, def) { if (F.hooks.flash) F.hooks.flash(fi, def); }
    };
  }
  Fight.prototype.side = function (S) { return S; };
  Fight.prototype.quant = function (t) { return Math.ceil((t + 0.02) / Q) * Q; };
  Fight.prototype.schedule = function (t, fn, sound) {
    var q = this.quant(t);
    this.pending.push({ q: q, fn: fn });
    if (sound && this.hooks.note) this.hooks.note(sound, q);
    return q;
  };
  Fight.prototype.speedOf = function (fi) {
    var S = fi.side, p = (S.b.heat - S.d.cold) * 2 + fi.spd;
    if (fi.bag && fi.bag.bag) { if (fi.bag.bag.speed) p += fi.bag.bag.speed; if (fi.bag.bag.strikeSpd && fi.def.w) p += fi.bag.bag.strikeSpd; }
    if (fi.def.speed) p += fi.def.speed(fi, this.api);
    return Math.max(0.1, 1 + p / 100);
  };
  Fight.prototype.start = function () {
    var F = this, api = F.api;
    [F.A, F.B].forEach(function (S) {
      S.items.forEach(function (fi) {
        if (fi.def.sob) F.schedule(0, function () { fi.def.sob(fi, api); F.activated(fi); }, { fi: fi });
      });
      S.allItems.forEach(function (it) {
        var d = DEF[it.id]; if (!d.bag || it.loc !== 'bag') return;
        if (d.bag.hold) api.buff(S, 'block', d.bag.hold);
        if (d.bag.holdPer) { var n = S.items.filter(function (fi) { return fi.bagInst === it && !fi.def.cls; }).length; api.buff(S, 'block', d.bag.holdPer * n); }
      });
    });
  };
  Fight.prototype.activated = function (fi) {
    var F = this, S = fi.side, api = F.api;
    S.items.forEach(function (x) { if (!x.gone && x.def.onStarAct && x !== fi && x.starList.indexOf(fi) >= 0) x.def.onStarAct(x, api, fi); });
    if (fi.bag && fi.bag.bag && fi.bag.bag.sourAct && F.rng() < fi.bag.bag.sourAct) api.debuff(S.opp, 'poison', 1);
  };
  Fight.prototype.applyDamage = function (from, to, n, o) {
    var F = this;
    if (n <= 0 || to.hp <= 0) return 0;
    if (F.t < to.redUntil) n = n * (1 - to.red);
    n = Math.round(n);
    if (!o.pierce && to.b.block > 0) { var ab = Math.min(to.b.block, n); to.b.block -= ab; n -= ab; }
    to.hp -= n;
    if (F.hooks.num) F.hooks.num(to, n > 0 ? '-' + n + (o.crit ? '!' : '') : '0', n > 0 ? (o.crit ? 'crit' : 'dmg') : 'miss');
    F.checkBelow(to);
    return n;
  };
  Fight.prototype.checkBelow = function (S) {
    var F = this;
    S.items.forEach(function (x) {
      if (x.gone || x.used || !x.def.below) return;
      if (S.hp > 0 && S.hp < S.max * x.def.below.pct / 100) { x.used = 1; F.schedule(F.t, function () { x.def.below.fn(x, F.api); F.activated(x); }, { fi: x }); }
    });
  };
  // weapon attack at time t (fire time); result lands on the 8th-note grid
  Fight.prototype.attack = function (fi, t, extra) {
    var F = this, S = fi.side, O = S.opp, w = fi.def.w, api = F.api;
    if (!extra) {
      var cost = w.st;
      if (S.st + 1e-9 < cost) {
        S.items.forEach(function (x) { if (!x.gone && x.def.onOutSt) F.schedule(t, function () { x.def.onOutSt(x, api); }, { fi: x }); });
        return;
      }
      S.st -= cost;
    }
    if (fi.def.once) fi.used = 1;
    F.schedule(t, function () {
      if (S.hp <= 0 || O.hp <= 0) return;
      if (fi.def.onAttack) fi.def.onAttack(fi, api);
      var acc = w.acc + fi.accAdd + S.b.luck * 5 - S.d.blind * 5;
      var hit = F.rng() * 100 < acc;
      if (O.dodge > 0) { O.dodge--; hit = false; }
      if (!hit) {
        if (F.hooks.num) F.hooks.num(O, 'miss', 'miss');
        O.items.forEach(function (x) { if (!x.gone && x.def.onOppMiss) x.def.onOppMiss(x, api); });
        F.activated(fi); if (F.hooks.flash) F.hooks.flash(fi); return;
      }
      var mx = w.b + (fi.def.maxBonus ? fi.def.maxBonus(fi, api) : 0);
      var dmg = ri(F.rng, w.a, mx) + S.b.empower + fi.dmgAdd + fi.next + (fi.def.dmgBonus ? fi.def.dmgBonus(fi, api) : 0);
      fi.next = 0;
      if (fi.bag && fi.bag.bag && fi.bag.bag.strikeMul) dmg = dmg * fi.bag.bag.strikeMul;
      var crit = 0; if (fi.bag && fi.bag.bag && fi.bag.bag.crit) crit = fi.bag.bag.crit + fi.bag.bag.critLuck * S.b.luck;
      var isCrit = F.rng() < crit && !(F.rng() < O.critRes);
      if (isCrit) dmg *= 2;
      var h = { dmg: Math.round(dmg), melee: !!w.m, att: S };
      if (w.m) O.items.forEach(function (x) { if (!x.gone && x.def.onAtk) x.def.onAtk(x, api, h); });
      var dealt = F.applyDamage(S, O, h.dmg, { crit: isCrit, src: fi });
      if (w.m) {
        if (S.b.vamp > 0) api.heal(S, S.b.vamp);
        if (O.b.spikes > 0) F.applyDamage(O, S, O.b.spikes, {});
      }
      if (fi.def.onHit) fi.def.onHit(fi, api, dealt);
      F.activated(fi);
      if (F.hooks.flash) F.hooks.flash(fi);
    }, { fi: fi, crit: false });
  };
  Fight.prototype.step = function (dt) {
    var F = this, api = F.api; if (F.over) return;
    var t0 = F.t; F.t += dt;
    [F.A, F.B].forEach(function (S) {
      // stamina regen 1/s (+ Horned Hare)
      var boost = 1; S.items.forEach(function (x) { if (!x.gone && x.def.stamBoost) { var nb = 0; for (var k in S.b) if (S.b[k] > 0) nb++; boost += x.def.stamBoost * nb * 100 / 100; } });
      S.st = Math.min(S.stMax, S.st + dt * boost);
      if (S.tmpBlind && F.t >= S.tmpBlind.until) { S.d.blind = Math.max(0, S.d.blind - S.tmpBlind.n); S.tmpBlind = null; }
      var stunned = F.t < S.stunUntil;
      S.items.forEach(function (fi) {
        if (fi.gone || stunned) return;
        var d = fi.def;
        if (d.at && !fi.used && F.t >= d.at.t) { fi.used = 1; F.schedule(d.at.t, function () { d.at.fn(fi, api); F.activated(fi); }, { fi: fi }); }
        if (!fi.cd) return;
        if (d.once && fi.used) return;
        fi.ch += dt * F.speedOf(fi);
        if (fi.ch >= fi.cd) {
          fi.ch -= fi.cd;
          var tf = t0 + dt;
          if (d.w && !d.nodmg) F.attack(fi, tf);
          else {
            if (d.stc) { var c = d.stc * (d.stcMul ? d.stcMul(fi, api) : 1); if (S.st + 1e-9 < c) return; S.st -= c; }
            F.schedule(tf, function () { if (S.hp > 0 && S.opp.hp > 0) { d.every(fi, api); F.activated(fi); if (F.hooks.flash) F.hooks.flash(fi); } }, { fi: fi });
          }
        }
      });
    });
    // sustain and sour tick every 2s
    if (F.t >= F.nextRegen) {
      var tr = F.nextRegen; F.nextRegen += 2;
      F.schedule(tr, function () {
        [F.A, F.B].forEach(function (S) {
          if (S.b.regen > 0) api.heal(S, S.b.regen);
          if (S.d.poison > 0) F.applyDamage(S.opp, S, S.d.poison, { pierce: true });
        });
      }, null);
    }
    // fatigue from 17s, a tick every second; each tick +1 and +10% of the last (+20% after 60s)
    if (F.t >= F.nextFat) {
      var tf2 = F.nextFat; F.nextFat += 1; F.fatN++;
      F.fatDmg = F.fatN === 1 ? 1 : F.fatDmg + Math.floor(F.fatDmg / (tf2 >= 60 ? 5 : 10)) + 1;
      var fd = F.fatDmg;
      F.schedule(tf2, function () { [F.A, F.B].forEach(function (S) { F.applyDamage(S.opp, S, fd, { pierce: true }); }); }, { fatigue: true, n: F.fatN });
    }
    // resolve everything due on the grid
    F.pending.sort(function (a, b) { return a.q - b.q; });
    while (F.pending.length && F.pending[0].q <= F.t) {
      var p = F.pending.shift(); p.fn();
      if (F.A.hp <= 0 || F.B.hp <= 0) {
        F.over = true;
        F.winner = F.A.hp <= 0 && F.B.hp <= 0 ? 'draw' : F.A.hp <= 0 ? 'B' : 'A';
        F.endT = p.q;
        break;
      }
    }
    if (F.t > 180 && !F.over) { F.over = true; F.winner = F.A.hp / F.A.max >= F.B.hp / F.B.max ? 'A' : 'B'; F.endT = F.t; }
  };

  // ======================================================================
  // audio
  // ======================================================================
  var RACE = {
    bellforge: { kit: 'kit_bellforge_real', snare: [38, 39], tom: [45, 50], bass: ['kar_wartuba', -12], lead: ['gtr_recto_ld', -12], keys: ['vcsl_vibes', 12], arp: ['vcsl_handchimes', 0], strings: ['vcsl_organ_loud', 12], voice: ['vsco_trumpet', 0], choir: ['vsco_horns', -12] },
    stormsong: { kit: 'kit_stormsong_real', snare: [38], tom: [45, 50], bass: ['vsco_contrabass', -12], lead: ['gtr_doom_ld', -12], keys: ['vcsl_kalimba', 0], arp: ['vcsl_harp', 0], strings: ['vsco_celloarco', -12], voice: ['vsco_flute', 0], choir: ['choir_aahs', -12] }
  };
  var PACKS = ['kit_bellforge_real', 'kar_wartuba', 'gtr_recto_ld', 'vcsl_vibes', 'vcsl_handchimes', 'vcsl_organ_loud', 'vsco_trumpet', 'vsco_horns',
    'kit_stormsong_real', 'vsco_contrabass', 'gtr_doom_ld', 'vcsl_kalimba', 'vcsl_harp', 'vsco_celloarco', 'vsco_flute', 'choir_aahs'];
  var TYPEVOL = { drums: 0.9, taiko: 1.1, bass: 0.8, lead: 0.55, keys: 0.5, arp: 0.45, strings: 0.35, voice: 0.55, choir: 0.4 };
  var AU = { ctx: null, raw: {}, buf: {} }, NOTES = { count: 0, offGrid: 0, played: 0 };
  window.__LAB = function (inst, files) { AU.raw[inst] = files; if (AU.ctx) decodeInst(inst); };
  if (!AUTO) PACKS.forEach(function (p) { var s = document.createElement('script'); s.src = 'snd/' + p + '.js'; s.async = true; document.head.appendChild(s); });
  function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decodeInst(inst) {
    var r = AU.raw[inst]; if (!r || AU.buf[inst] || r.__busy) return; r.__busy = 1;
    var out = { notes: {}, list: [] }, keys = Object.keys(r).filter(function (k) { return k !== '__busy'; }), left = keys.length;
    keys.forEach(function (k) {
      var p; try { p = AU.ctx.decodeAudioData(b64(r[k])); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(function (b) { out.notes[k] = b; }).catch(function () {}).then(function () {
        if (--left === 0) { out.list = Object.keys(out.notes).map(function (k) { return { k: k, m: parseFloat(k) }; }).sort(function (a, b) { return a.m - b.m; }); AU.buf[inst] = out; }
      });
    });
  }
  function unlock() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!AU.ctx) {
      try { AU.ctx = new AC(); } catch (e) { return; }
      var c = AU.ctx;
      AU.comp = c.createDynamicsCompressor(); AU.comp.threshold.value = -16; AU.comp.ratio.value = 4; AU.comp.connect(c.destination);
      AU.master = c.createGain(); AU.master.gain.value = 0.85; AU.master.connect(AU.comp);
      AU.you = c.createGain(); AU.you.gain.value = 1; AU.them = c.createGain(); AU.them.gain.value = 0.75;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
      if (c.createStereoPanner) { var p1 = c.createStereoPanner(); p1.pan.value = -0.3; AU.you.connect(p1); p1.connect(AU.master); var p2 = c.createStereoPanner(); p2.pan.value = 0.35; AU.them.connect(lp); lp.connect(p2); p2.connect(AU.master); }
      else { AU.you.connect(AU.master); AU.them.connect(lp); lp.connect(AU.master); }
      AU.bed = c.createGain(); AU.bed.gain.value = 0.42; AU.bed.connect(AU.you);
      try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
      Object.keys(AU.raw).forEach(decodeInst);
    }
    if (AU.ctx.state !== 'running') { try { AU.ctx.resume(); } catch (e) {} }
  }
  ['pointerdown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  function audioOn() { return AU.ctx && AU.ctx.state === 'running'; }
  function sampleAt(inst, midi, t, dur, vol, out, ring) {
    var B = AU.buf[inst]; if (!B || !B.list.length) return false;
    var tries = [0, -12, 12, -24, 24];
    for (var j = 0; j < tries.length; j++) {
      var m = midi + tries[j], best = null;
      B.list.forEach(function (e) { if (!best || Math.abs(e.m - m) < Math.abs(best.m - m)) best = e; });
      if (Math.abs(best.m - m) > 7) continue;
      var c = AU.ctx, s = c.createBufferSource(); s.buffer = B.notes[best.k]; s.playbackRate.value = Math.pow(2, (m - best.m) / 12);
      var g = c.createGain(); s.connect(g); g.connect(out);
      var len = s.buffer.duration / s.playbackRate.value, hold = Math.min(len - 0.05, dur + (ring || 0.3));
      hold = Math.max(0.05, hold);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.006);
      g.gain.setValueAtTime(Math.max(0.001, vol), t + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.15);
      s.start(t); s.stop(t + hold + 0.2); return true;
    }
    return false;
  }
  function synth(midi, t, dur, vol, out, type) {
    var c = AU.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    o.connect(g); g.connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    o.start(t); o.stop(t + dur + 0.15);
  }
  function drumAt(race, sym, t, vol, out, n) {
    var R = RACE[race], notes;
    if (sym === 'K') notes = [36]; else if (sym === 'S') notes = R.snare; else if (sym === 'H') notes = [42]; else if (sym === 'C') notes = [49]; else notes = [R.tom[(n || 0) % R.tom.length]];
    notes.forEach(function (k) {
      var B = AU.buf[R.kit];
      if (B && B.notes[String(k)]) { var c = AU.ctx, s = c.createBufferSource(); s.buffer = B.notes[String(k)]; var g = c.createGain(); g.gain.value = vol / notes.length * 1.2; s.connect(g); g.connect(out); s.start(t); }
      else synth(sym === 'K' ? 36 : 48, t, 0.08, vol, out, 'sine');
    });
  }
  // part events per type and level, expanded to single steps
  var PARTS = {};
  Object.keys(SONG.types).forEach(function (ty) {
    PARTS[ty] = {};
    Object.keys(SONG.types[ty].parts).forEach(function (lv) {
      var evs = [];
      SONG.types[ty].parts[lv].forEach(function (e) {
        if (e.silent || !e.p && !e.seq) return;
        if (e.every) { var to = e.to || 16, k = 0; for (var s = e.from != null ? e.from : e.s; s < to; s += e.every) { evs.push({ s: s, p: e.seq ? e.seq[k % e.seq.length] : e.p, len: e.every }); k++; } }
        else evs.push({ s: e.s, p: e.p, len: e.len || 2 });
      });
      evs.sort(function (a, b) { return a.s - b.s; });
      PARTS[ty][lv] = evs;
    });
  });
  function pitch(p, chord) {
    var c = SONG.chords[chord];
    if (p === 'K' || p === 'S' || p === 'H' || p === 'TOM') return { drum: p };
    var m = /^(R|T0|T1|T2|CH)([+-]\d+)?$/.exec(p); if (!m) return null;
    var off = m[2] ? parseInt(m[2], 10) : 0;
    if (m[1] === 'R') return { notes: [c.root + off] };
    if (m[1] === 'CH') return { notes: c.tri.map(function (n) { return n + off; }) };
    return { notes: [c.tri[+m[1][1]] + off] };
  }
  var LEVEL = { C: '1', R: '1', E: '2', L: '2', G: '3', U: '3' };
  // play the item's own part of Iron March at sim time q (its type, its rarity's part, the note nearest that step)
  function playPart(ty, lvl, race, q, out, vol, absT) {
    if (!audioOn()) return;
    var step = Math.round(q / STEP), s16 = ((step % 16) + 16) % 16, bar = Math.floor(step / 16);
    var chord = SONG.prog[((bar % 4) + 4) % 4];
    var evs = PARTS[ty] && PARTS[ty][lvl] || PARTS[ty]['1'];
    if (!evs || !evs.length) return;
    var best = evs[0], bd = 99;
    evs.forEach(function (e) { var d = Math.min(Math.abs(e.s - s16), 16 - Math.abs(e.s - s16)); if (d < bd) { bd = d; best = e; } });
    var pt = pitch(best.p, chord); if (!pt) return;
    var v = (TYPEVOL[ty] || 0.5) * (vol || 1);
    if (pt.drum) { drumAt(race, pt.drum, absT, v, out, step); if (ty === 'taiko') drumAt(race, 'K', absT, v * 0.7, out); return; }
    var R = RACE[race], inst = R[ty] || R.keys, dur = Math.min(1.4, (best.len || 2) * STEP);
    if (ty === 'drums' || ty === 'taiko') { drumAt(race, ty === 'taiko' ? 'TOM' : 'S', absT, v, out, step); return; }
    pt.notes.forEach(function (n) { if (!sampleAt(inst[0], n + inst[1], absT, dur, v / Math.sqrt(pt.notes.length), out)) synth(n, absT, dur, v / pt.notes.length, out); });
  }

  // ======================================================================
  // UI
  // ======================================================================
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var ICON = {
    jar: '<path d="M7 4h10M8 4v3c-2 1-3 3-3 6v5a2 2 0 002 2h10a2 2 0 002-2v-5c0-3-1-5-3-6V4"/><path d="M10 13h4M12 11v5"/>',
    fork: '<path d="M8 3v8a4 4 0 008 0V3M12 15v6M9 21h6"/>',
    conch: '<path d="M4 18c4 2 12 2 16-6-3-6-9-8-13-4-3 3-1 7 3 7 3 0 4-3 2-4"/>',
    cup: '<path d="M5 8h11v6a5 5 0 01-5 5h-1a5 5 0 01-5-5V8zM16 10h2a2 2 0 010 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    collar: '<circle cx="12" cy="12" r="6"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
    banana: '<path d="M5 6c0 8 6 13 14 12-6-2-10-6-11-12z"/><path d="M5 6l-1-2"/>',
    drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>',
    ember: '<path d="M12 3l7 11a7 7 0 01-14 0z"/><path d="M12 11c2 3 3 4 3 5a3 3 0 01-6 0c0-1 1-2 3-5z"/>',
    pad: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/>',
    brush: '<path d="M12 21V9M9 9l-3-6M12 9V2M15 9l3-6M10 9h4"/>',
    cowbell: '<path d="M8 5h8l3 13H5z"/><path d="M10 5V3h4v2M12 18v3"/>',
    stick: '<path d="M6 20L18 4"/><circle cx="18.5" cy="3.5" r="1.6"/>',
    sticks: '<path d="M5 20L17 4M9 20L21 6"/><circle cx="17.5" cy="3.5" r="1.4"/><circle cx="21" cy="5.5" r="1.4"/>',
    pick: '<path d="M5 6c4-3 10-3 14 0-1 6-4 11-7 14-3-3-6-8-7-14z"/>',
    bottle: '<path d="M10 2h4M10 2v5l-3 3v10a2 2 0 002 2h6a2 2 0 002-2V10l-3-3V2"/><path d="M7 14h10"/>',
    bottle2: '<path d="M10 2h4M10 2v5l-3 3v10a2 2 0 002 2h6a2 2 0 002-2V10l-3-3V2"/><path d="M7 13h10M7 17h10"/>',
    bottle3: '<path d="M10 2h4M10 2v5l-3 3v10a2 2 0 002 2h6a2 2 0 002-2V10l-3-3V2"/><path d="M12 12v6M9 15h6"/>',
    vial: '<path d="M9 2h6M10 2v12a2 2 0 004 0V2"/><path d="M10 9h4"/><circle cx="17" cy="18" r="2"/>',
    hammer: '<path d="M4 6h12v5H4zM10 11v10"/>',
    beater: '<path d="M6 20L18 6"/><path d="M14 4l6 6M3 21l3-3"/>',
    guitar: '<circle cx="8" cy="16" r="5"/><path d="M11 13l9-9M17.5 2.5l4 4"/><circle cx="8" cy="16" r="1.5"/>',
    guitar2: '<circle cx="8" cy="16" r="5"/><path d="M11 13l9-9M17 3l4 4"/><path d="M8 13l-1 3h2l-1 3"/>',
    torch: '<path d="M10 21l2-11 2 11"/><path d="M12 10c-3-2-3-5 0-8 3 3 3 6 0 8z"/>',
    gong: '<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="2"/><path d="M5 3h14M8 3v3M16 3v3"/>',
    horn: '<path d="M3 10h4l10-5v14L7 14H3z"/><path d="M7 14l1 6"/>',
    glove: '<path d="M7 21v-8l-2-3V6M7 13V4M10 13V3M13 13V4M16 14V7l2 1v6a7 7 0 01-7 7"/>',
    coat: '<path d="M8 3l4 3 4-3 4 3-2 5v10H6V11L4 6z"/><path d="M12 6v15"/>',
    baton: '<path d="M4 20L18 6"/><path d="M18 6c2-2 2-4 0-4s-3 2-1 3"/>',
    crate: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M7 7V4h10v3M3 12h18"/>',
    record: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="0.8"/>',
    claw: '<path d="M5 20c0-6 2-12 6-16M10 20c0-5 2-10 5-13M15 20c0-4 1-8 4-10"/>',
    fiddle: '<path d="M9 21c-3 0-4-2-3-4l2-2-2-2c-1-2 0-4 3-4h1l5-6 1 1-5 6v1c3 0 4 2 3 4l-2 2 2 2c1 2 0 4-3 4z"/>',
    saw: '<path d="M4 16L18 4l2 2L7 19z"/><path d="M7 15l1 2M10 12l1 2M13 9l1 2"/>',
    flute: '<path d="M3 15L19 5l2 3L5 18z"/><circle cx="9" cy="12.5" r=".8"/><circle cx="12" cy="10.5" r=".8"/><circle cx="15" cy="8.5" r=".8"/>',
    hat: '<path d="M3 17h18M6 17c0-6 2-9 6-9s6 3 6 9"/><path d="M8 13h8"/>',
    boot: '<path d="M7 3h6v10l6 3v4H5v-4l2-3z"/>',
    lamp: '<path d="M8 3h8l2 8H6z"/><path d="M12 11v7M8 21h8M10 18h4"/>',
    gem: '<path d="M6 4h12l3 5-9 12L3 9z"/><path d="M3 9h18M9 4l3 17 3-17"/>',
    pine: '<path d="M12 8c-3 0-5 3-5 7s2 7 5 7 5-3 5-7-2-7-5-7z"/><path d="M12 8V3M9 5l3 3 3-3M9 13l6 4M15 13l-6 4"/>',
    cake: '<path d="M5 12h14v8H5z"/><path d="M5 12c0-4 3-6 7-6s7 2 7 6M12 6V3"/>',
    shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    fanfare: '<path d="M3 12h3l12-7v14L6 12"/><path d="M6 12v6h3"/><path d="M20 9v6"/>',
    wing: '<path d="M4 18c2-8 8-13 16-14-2 3-4 4-6 5 2 0 4 0 5-1-2 4-5 6-9 6 2 1 4 1 5 1-3 3-7 4-11 3z"/>',
    bag: '<path d="M6 8h12l1 12H5z"/><path d="M9 8V6a3 3 0 016 0v2"/>'
  };
  function svgIcon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICON[name] || ICON.bag) + '</svg>'; }
  function portrait(race, art) { return 'img/' + (race === 'stormsong' ? 'st' : 'be') + '-' + art + '.png'; }
  function leaderImg(race, id, view) { return 'img/' + (race === 'stormsong' ? 'ss' : 'bf') + '-' + id + '-' + view + '.png'; }

  // renders one item (or bag) as a shape at tile size T; returns element
  function itemEl(it, T, race, opts) {
    opts = opts || {};
    var d = DEF[it.id], s = shape(it.id, it.rot);
    var e = el('div', 'it r-' + d.r + (d.bag ? ' isbag' : '') + (d.cls ? ' clsbag' : ''));
    e.style.width = s.w * T + 'px'; e.style.height = s.h * T + 'px';
    var has = {}; s.cells.forEach(function (c) { has[c[0] + ',' + c[1]] = 1; });
    s.cells.forEach(function (c) {
      var ce = el('div', 'ic'); ce.style.left = c[0] * T + 'px'; ce.style.top = c[1] * T + 'px'; ce.style.width = T + 'px'; ce.style.height = T + 'px';
      var et = has[c[0] + ',' + (c[1] - 1)] ? 0 : 1, eb = has[c[0] + ',' + (c[1] + 1)] ? 0 : 1, el2 = has[(c[0] - 1) + ',' + c[1]] ? 0 : 1, er = has[(c[0] + 1) + ',' + c[1]] ? 0 : 1;
      ce.style.cssText += ';--t:' + et + ';--b:' + eb + ';--l:' + el2 + ';--r:' + er;
      if (d.bag) { if (et) ce.classList.add('bt'); if (eb) ce.classList.add('bb'); if (el2) ce.classList.add('bl'); if (er) ce.classList.add('br'); }
      e.appendChild(ce);
    });
    var ART = window.BB_ART || {};
    if (!d.bag && ART[it.id]) {
      // our art, cropped to the item's shape (drawn at rotation 0, turned with the item), clipped to its tiles
      var w0 = ART[it.id][0] * T, h0 = ART[it.id][1] * T, W = s.w * T, H = s.h * T, path = '';
      var hasA = {}; s.cells.forEach(function (c) { hasA[c[0] + ',' + c[1]] = 1; });
      s.cells.forEach(function (c) {
        var ins = Math.max(2, T * 0.06);
        var x0 = c[0] * T + (hasA[(c[0] - 1) + ',' + c[1]] ? 0 : ins), x1 = (c[0] + 1) * T - (hasA[(c[0] + 1) + ',' + c[1]] ? 0 : ins);
        var y0 = c[1] * T + (hasA[c[0] + ',' + (c[1] - 1)] ? 0 : ins), y1 = (c[1] + 1) * T - (hasA[c[0] + ',' + (c[1] + 1)] ? 0 : ins);
        path += 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'H' + x1.toFixed(1) + 'V' + y1.toFixed(1) + 'H' + x0.toFixed(1) + 'Z';
      });
      var aw = el('div', 'artw'); aw.style.width = W + 'px'; aw.style.height = H + 'px'; aw.style.clipPath = "path('" + path + "')"; aw.style.webkitClipPath = "path('" + path + "')";
      var im = el('img'); im.alt = ''; im.draggable = false; im.src = 'img/it/' + (race === 'stormsong' ? 'st' : 'be') + '-' + it.id + '.webp';
      im.style.width = w0 + 'px'; im.style.height = h0 + 'px'; im.style.left = (W - w0) / 2 + 'px'; im.style.top = (H - h0) / 2 + 'px';
      im.style.transform = 'rotate(' + (it.rot || 0) * 90 + 'deg)';
      aw.appendChild(im); e.appendChild(aw);
    } else if (!d.bag) {
      // the icon sits on the tile nearest the shape's centre
      var cx = s.w / 2, cy = s.h / 2, best = s.cells[0], bd = 1e9;
      s.cells.forEach(function (c) { var dd = Math.pow(c[0] + 0.5 - cx, 2) + Math.pow(c[1] + 0.5 - cy, 2); if (dd < bd) { bd = dd; best = c; } });
      var rect = s.cells.length === s.w * s.h, fit = rect && s.cells.length > 1;
      var ic = el('div', 'ico' + (d.art ? ' art' : ''));
      var size = fit ? Math.min(s.w, s.h) * T * (s.w === s.h ? 0.8 : 0.86) : T * 0.86;
      ic.style.width = size + 'px'; ic.style.height = size + 'px';
      ic.style.left = (fit ? s.w * T / 2 : (best[0] + 0.5) * T) - size / 2 + 'px';
      ic.style.top = (fit ? s.h * T / 2 : (best[1] + 0.5) * T) - size / 2 + 'px';
      if (d.art) ic.innerHTML = '<img alt="" draggable="false" src="' + portrait(race, d.art) + '">';
      else ic.innerHTML = svgIcon(d.icon);
      e.appendChild(ic);
    }
    if (opts.uid) e.dataset.uid = it.uid;
    return e;
  }

  var ST = { screen: 'select', race: 'bellforge', R: null, sel: null, drag: null, fight: null, toast: null, lastCombos: [] };
  window.__state = { screen: 'select', round: 0, wins: 0, losses: 0, over: false, result: null };
  function syncState() {
    var R = ST.R; window.__state = { notes: NOTES, decoded: Object.keys(AU.buf).length, audio: AU.ctx ? AU.ctx.state : 'none', screen: ST.screen, round: R ? R.round : 0, wins: R ? R.wins : 0, losses: R ? R.losses : 0, gold: R ? R.gold : 0, over: ST.screen === 'end', result: ST.result || null, items: R ? R.items.filter(function (i) { return i.loc === 'bag'; }).length : 0, fights: ST.fightLog || [] };
  }

  function show(name) {
    ['select', 'shop', 'fight', 'end'].forEach(function (s) { $('s-' + s).hidden = s !== name; });
    ST.screen = name; syncState();
  }

  // ---------- select ----------
  function renderSelect() {
    var box = $('leaders'); box.innerHTML = '';
    $('race-b').classList.toggle('on', ST.race === 'bellforge'); $('race-s').classList.toggle('on', ST.race === 'stormsong');
    DATA.leaders.forEach(function (L) {
      var b = el('button', 'lead');
      b.innerHTML = '<img alt="" draggable="false" src="' + leaderImg(ST.race, L.id, 'front') + '"><span class="ln">' + L.n + '</span><span class="lr">' + DEF[L.bag].n + '</span>';
      b.onclick = function () { startRun(L.id); };
      box.appendChild(b);
    });
  }
  $('race-b').onclick = function () { ST.race = 'bellforge'; renderSelect(); };
  $('race-s').onclick = function () { ST.race = 'stormsong'; renderSelect(); };

  function startRun(leader) {
    var seed = (Date.now() & 0xffffff) ^ 0x5bd1;
    if (AUTO) seed = 20261121;
    ST.R = newRun(seed, leader, ST.race); ST.result = null; ST.fightLog = [];
    startShopPhase(ST.R, true);
    var demo = /[?&]demo=(\d+)/.exec(location.search);
    if (demo) { var R = ST.R, n = Math.min(18, +demo[1]); for (var r = 1; r < n; r++) { botShop(R); R.round++; startShopPhase(R, false); } botShop(R); }
    show('shop'); renderShop();
  }

  // ---------- shop ----------
  var T = 48;
  function layoutTile() {
    var W = window.innerWidth, H = window.innerHeight, wide = W >= 760 && W / H > 1.05;
    document.body.classList.toggle('wide', wide);
    if (wide) T = Math.max(44, Math.min(68, Math.floor((H - 170) / ROWS), Math.floor((W * 0.5 - 40) / COLS)));
    else T = Math.max(44, Math.min(56, Math.floor((W - 24) / COLS), Math.floor((H - 376) / ROWS)));
    return T;
  }
  function hud(R) {
    var lives = ''; for (var i = 0; i < LIVES; i++) lives += '<i class="pip' + (i < LIVES - R.losses ? ' on' : '') + '"></i>';
    var wins = ''; for (var j = 0; j < WINS_TO_WIN; j++) wins += '<i class="wp' + (j < R.wins ? ' on' : '') + '"></i>';
    return '<span class="rd">Round ' + R.round + '</span><span class="lv" aria-label="lives">' + lives + '</span><span class="ws" aria-label="wins">' + wins + '</span>' +
      '<span class="hp">' + svgIcon('shield').replace('<svg', '<svg class="mi"') + maxHpFor(R.round) + '</span><span class="gd"><i class="coin"></i>' + R.gold + '</span>';
  }
  function renderShop() {
    var R = ST.R; layoutTile();
    $('hud').innerHTML = hud(R);
    $('me-img').src = leaderImg(R.race, R.leader, 'front');
    // offers
    var sh = $('offers'); sh.innerHTML = '';
    var box = Math.floor(($('offers').clientWidth || 340) / SHOP_SIZE) - 6;
    box = Math.max(56, Math.min(120, box));
    R.shop.forEach(function (o, k) {
      var c = el('div', 'offer' + (o ? '' : ' empty') + (o && o.reserved ? ' res' : '') + (o && o.price > R.gold ? ' poor' : ''));
      c.style.height = box + 16 + 'px';
      if (o) {
        var s = shape(o.id, 0), t = Math.min((box - 8) / s.w, (box - 8) / s.h, T);
        var ie = itemEl({ id: o.id, rot: 0, uid: 0 }, t, R.race); ie.classList.add('mini');
        c.appendChild(ie);
        c.appendChild(el('span', 'price' + (o.sale ? ' sale' : ''), (o.sale ? '<s>' + DEF[o.id].c + '</s>' : '') + o.price));
        if (o.reserved) c.appendChild(el('span', 'lock', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>'));
        c.dataset.shop = k;
        c.addEventListener('pointerdown', onDown);
      }
      sh.appendChild(c);
    });
    $('reroll').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 11a8 8 0 10-2 6"/><path d="M20 4v7h-7"/></svg><span>' + rerollCost(R) + '</span>';
    $('reroll').disabled = R.gold < rerollCost(R);
    renderBag();
    renderStorage();
    renderSheet();
    syncState();
  }
  function renderBag() {
    var R = ST.R, g = $('grid'); g.innerHTML = '';
    g.style.width = COLS * T + 'px'; g.style.height = ROWS * T + 'px';
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { var d = el('div', 'dot'); d.style.left = x * T + 'px'; d.style.top = y * T + 'px'; d.style.width = T + 'px'; d.style.height = T + 'px'; g.appendChild(d); }
    var dragUid = ST.drag && ST.drag.it ? ST.drag.it.uid : -1;
    var hide = {}; if (ST.drag && ST.drag.carry) ST.drag.carry.forEach(function (c) { hide[c.uid] = 1; });
    var combos = pendingCombos(R);
    R.items.filter(function (i) { return i.loc === 'bag'; }).sort(function (a, b) { return (DEF[b.id].bag ? 1 : 0) - (DEF[a.id].bag ? 1 : 0); }).forEach(function (it) {
      if (it.uid === dragUid || hide[it.uid]) return;
      var e = itemEl(it, T, R.race, { uid: 1 });
      e.style.left = it.x * T + 'px'; e.style.top = it.y * T + 'px';
      if (ST.sel && ST.sel.uid === it.uid) e.classList.add('sel');
      if (combos[it.uid]) e.classList.add('combo');
      e.addEventListener('pointerdown', onDown);
      g.appendChild(e);
    });
    // star overlay for the selected or dragged item
    var focus = ST.drag && ST.drag.it && ST.drag.at ? { it: ST.drag.it, x: ST.drag.at[0], y: ST.drag.at[1], rot: ST.drag.rot } : (ST.sel && ST.sel.uid ? { it: ST.sel, x: ST.sel.x, y: ST.sel.y, rot: ST.sel.rot } : null);
    if (focus && focus.it.loc !== 'storage' || (ST.drag && ST.drag.at)) {
      if (focus && !DEF[focus.it.id].bag) {
        var s = shape(focus.it.id, focus.rot), om = occMap(R.items, [focus.it]);
        s.stars.forEach(function (c) {
          var n = [c[0] + focus.x, c[1] + focus.y]; if (!inGrid(n)) return;
          var st = el('div', 'star' + (om[idx(n)] ? ' hit' : ''), '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>');
          st.style.left = n[0] * T + 'px'; st.style.top = n[1] * T + 'px'; st.style.width = T + 'px'; st.style.height = T + 'px';
          g.appendChild(st);
        });
      }
    }
    if (ST.drag && ST.drag.at) {
      var cs = cellsOf(ST.drag.it, ST.drag.at[0], ST.drag.at[1], ST.drag.rot);
      cs.forEach(function (c) { if (!inGrid(c)) return; var f = el('div', 'foot' + (ST.drag.ok ? ' ok' : ' no')); f.style.left = c[0] * T + 'px'; f.style.top = c[1] * T + 'px'; f.style.width = T + 'px'; f.style.height = T + 'px'; g.appendChild(f); });
    }
  }
  function pendingCombos(R) {
    var out = {}, items = R.items, bagged = items.filter(function (i) { return i.loc === 'bag' && !DEF[i.id].bag; });
    DATA.recipes.forEach(function (rc) {
      bagged.forEach(function (a) {
        if (a.id !== rc.a) return;
        bagged.forEach(function (b) { if (b !== a && (b.id === rc.b || b.id === rc.cat) && adjacent(items, a, b)) { out[a.uid] = 1; out[b.uid] = 1; } });
      });
    });
    return out;
  }
  function renderStorage() {
    var R = ST.R, s = $('storage'); s.innerHTML = '';
    var list = R.items.filter(function (i) { return i.loc === 'storage'; });
    s.classList.toggle('empty', !list.length);
    list.forEach(function (it) {
      if (ST.drag && ST.drag.it === it) return;
      var sh = shape(it.id, it.rot), t = Math.min(52 / sh.w, 52 / sh.h, T * 0.7);
      var w = el('div', 'stw'); var e = itemEl(it, t, R.race, { uid: 1 }); e.classList.add('mini');
      w.appendChild(e); w.dataset.uid = it.uid; w.style.width = Math.max(56, sh.w * t + 8) + 'px';
      if (ST.sel && ST.sel.uid === it.uid) w.classList.add('sel');
      w.addEventListener('pointerdown', onDown);
      s.appendChild(w);
    });
  }
  function itemLines(d) {
    var a = [];
    if (d.w && !d.nodmg) a.push((d.w.a + '-' + d.w.b) + ' damage, every ' + d.w.cd + 's, ' + d.w.st + ' stamina, ' + d.w.acc + '% accuracy' + (d.w.m ? '' : ', ranged'));
    else if (d.cd) a.push('Every ' + d.cd + 's' + (d.stc ? ', ' + d.stc + ' stamina' : ''));
    return a.concat(d.tx);
  }
  function recipeLines(id) {
    var a = [];
    DATA.recipes.forEach(function (r) {
      if (r.a === id || r.b === id || r.cat === id) a.push(DEF[r.a].n + (r.b ? ' + ' + DEF[r.b].n : ' next to ' + DEF[r.cat].n) + ' > ' + DEF[r.out].n);
    });
    return a;
  }
  function renderSheet() {
    var sh = $('sheet'), R = ST.R, s = ST.sel;
    if (!s) { sh.classList.remove('open'); sh.innerHTML = ''; return; }
    var d = DEF[s.id], html = '<div class="sh-h"><b>' + d.n + '</b><span class="rar r-' + d.r + '">' + RNAME[d.r] + '</span><span class="tags">' + (d.t || []).join(' / ') + '</span><button class="x" id="sh-x" aria-label="Close">&times;</button></div>';
    html += '<ul>' + itemLines(d).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    var rl = recipeLines(d.id); if (rl.length) html += '<div class="rec">' + rl.join('<br>') + '</div>';
    html += '<div class="sh-b">';
    if (s.shop != null) {
      var o = R.shop[s.shop];
      html += '<button id="b-res" class="ghost">' + (o.reserved ? 'Unreserve' : 'Reserve') + '</button><button id="b-buy" class="pri"' + (o.price > R.gold ? ' disabled' : '') + '>Buy ' + o.price + '</button>';
    } else {
      html += '<button id="b-rot" class="ghost">Rotate</button>';
      if (!d.cls) html += '<button id="b-sell" class="ghost">Sell ' + sellValue(s) + '</button>';
      if (s.loc === 'storage') html += '<button id="b-place" class="pri">Place</button>';
    }
    html += '</div>';
    sh.innerHTML = html; sh.classList.add('open');
    $('sh-x').onclick = function () { ST.sel = null; renderShop(); };
    if (s.shop != null) {
      $('b-res').onclick = function () { R.shop[s.shop].reserved = !R.shop[s.shop].reserved; ST.sel = null; renderShop(); };
      $('b-buy').onclick = function () { var it = buy(R, s.shop); if (it && !autoPlace(R.items, it)) it.loc = 'storage'; ST.sel = null; renderShop(); };
    } else {
      $('b-rot').onclick = function () { rotateInPlace(s); renderShop(); };
      if ($('b-sell')) $('b-sell').onclick = function () { sell(R, s); ST.sel = null; renderShop(); };
      if ($('b-place')) $('b-place').onclick = function () { if (DEF[s.id].bag ? autoPlace(R.items, s) : autoPlace(R.items, s)) { } else toast('No room'); renderShop(); };
    }
  }
  function rotateInPlace(it) {
    var R = ST.R, nr = (it.rot + 1) % 4;
    if (it.loc === 'storage') { it.rot = nr; return; }
    if (DEF[it.id].bag) { if (canPlaceBag(R.items, it, it.x, it.y, nr)) moveBag(R.items, it, it.x, it.y, nr); else toast('No room'); return; }
    var off = [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]];
    for (var k = 0; k < off.length; k++) if (canPlace(R.items, it, it.x + off[k][0], it.y + off[k][1], nr)) { it.x += off[k][0]; it.y += off[k][1]; it.rot = nr; return; }
    toast('No room');
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(ST.toastT); ST.toastT = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  $('reroll').onclick = function () { if (reroll(ST.R)) { ST.sel = null; renderShop(); } };
  $('fight').onclick = function () { ST.sel = null; startFight(); };

  // ---------- drag and drop ----------
  function onDown(ev) {
    if (ST.screen !== 'shop') return;
    if (ST.drag) { if (ev.pointerId !== ST.drag.pid) { ST.drag.rot = (ST.drag.rot + 1) % 4; buildGhost(); moveDrag(ST.drag.lx, ST.drag.ly); } return; }
    ev.preventDefault();
    var R = ST.R, tgt = ev.currentTarget, src;
    if (tgt.dataset.shop != null) src = { shop: +tgt.dataset.shop };
    else { var uid = +tgt.dataset.uid; src = { it: R.items.filter(function (i) { return i.uid === uid; })[0] }; if (!src.it) return; }
    ST.press = { x: ev.clientX, y: ev.clientY, src: src, pid: ev.pointerId, el: tgt, rectEl: tgt.getBoundingClientRect() };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }
  function onMove(ev) {
    var P = ST.press; if (!P || ev.pointerId !== P.pid) return;
    ev.preventDefault();
    if (!ST.drag) {
      if (Math.abs(ev.clientX - P.x) + Math.abs(ev.clientY - P.y) < 8) return;
      beginDrag(P, ev);
    }
    moveDrag(ev.clientX, ev.clientY);
  }
  function beginDrag(P, ev) {
    var R = ST.R, it, from;
    if (P.src.shop != null) { var o = R.shop[P.src.shop]; it = { uid: -1, id: o.id, x: 0, y: 0, rot: 0, loc: 'shop' }; from = 'shop'; }
    else { it = P.src.it; from = it.loc; }
    ST.sel = null;
    var carry = [];
    if (DEF[it.id].bag && it.loc === 'bag') carry = contentsOf(R.items, it).full;
    ST.drag = { it: it, from: from, rot: it.rot, pid: P.pid, carry: carry, shop: P.src.shop, touch: ev.pointerType === 'touch' };
    $('sheet').classList.remove('open');
    buildGhost();
    renderBag(); renderStorage();
    document.body.classList.add('dragging');
  }
  function buildGhost() {
    var D = ST.drag, R = ST.R; if (D.ghost) D.ghost.remove();
    var tmp = { id: D.it.id, rot: D.rot, uid: 0 };
    var g = el('div', 'dragghost'); var e = itemEl(tmp, T, R.race); g.appendChild(e);
    var s = shape(D.it.id, D.rot);
    if (D.carry.length) {
      D.carry.forEach(function (c) { var ce = itemEl(c, T, R.race); ce.style.left = (c.x - D.it.x) * T + 'px'; ce.style.top = (c.y - D.it.y) * T + 'px'; ce.style.position = 'absolute'; if (D.rot === D.it.rot) g.appendChild(ce); });
    }
    g.style.width = s.w * T + 'px'; g.style.height = s.h * T + 'px';
    document.body.appendChild(g); D.ghost = g; D.gw = s.w; D.gh = s.h;
  }
  function moveDrag(x, y) {
    var D = ST.drag, R = ST.R; D.lx = x; D.ly = y;
    var lift = D.touch ? T * 0.9 : 0;
    var gx = x - D.gw * T / 2, gy = y - D.gh * T / 2 - lift;
    D.ghost.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
    var gr = $('grid').getBoundingClientRect();
    var cx = Math.round((gx - gr.left) / T), cy = Math.round((gy - gr.top) / T);
    var over = x > gr.left - T && x < gr.right + T && y - lift > gr.top - T && y - lift < gr.bottom + T;
    D.zone = null;
    if (over) {
      D.at = [cx, cy]; D.zone = 'grid';
      D.ok = DEF[D.it.id].bag ? canPlaceBag(R.items, D.it, cx, cy, D.rot) : canPlace(R.items, D.it, cx, cy, D.rot, [D.it]);
      if (D.from === 'shop' && R.shop[D.shop].price > R.gold) D.ok = false;
    } else {
      D.at = null;
      if (inRect(x, y, $('storage-wrap').getBoundingClientRect())) D.zone = 'storage';
      else if (inRect(x, y, $('shopzone').getBoundingClientRect())) D.zone = 'sell';
    }
    $('storage-wrap').classList.toggle('hot', D.zone === 'storage');
    $('shopzone').classList.toggle('hot', D.zone === 'sell' && D.from !== 'shop' && !DEF[D.it.id].cls);
    renderBag();
  }
  function inRect(x, y, r) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function onUp(ev) {
    var P = ST.press; if (!P || ev.pointerId !== P.pid) return;
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    ST.press = null;
    var R = ST.R;
    if (!ST.drag) {
      // a tap: select and show details
      if (P.src.shop != null) ST.sel = { shop: P.src.shop, id: R.shop[P.src.shop].id };
      else ST.sel = (ST.sel && ST.sel.uid === P.src.it.uid) ? null : P.src.it;
      renderShop(); return;
    }
    var D = ST.drag; ST.drag = null; D.ghost.remove(); document.body.classList.remove('dragging');
    $('storage-wrap').classList.remove('hot'); $('shopzone').classList.remove('hot');
    if (D.zone === 'grid' && D.ok) {
      var it = D.it;
      if (D.from === 'shop') { it = buy(R, D.shop); if (!it) { renderShop(); return; } }
      if (DEF[it.id].bag && it.loc === 'bag') moveBag(R.items, it, D.at[0], D.at[1], D.rot);
      else { it.x = D.at[0]; it.y = D.at[1]; it.rot = D.rot; it.loc = 'bag'; }
      playUi('place');
    } else if (D.zone === 'storage') {
      var it2 = D.it;
      if (D.from === 'shop') { if (R.shop[D.shop].price <= R.gold) { it2 = buy(R, D.shop); it2.rot = D.rot; } }
      else { if (DEF[it2.id].bag && it2.loc === 'bag') { var con = contentsOf(R.items, it2); con.full.concat(con.part).forEach(function (c) { c.loc = 'storage'; }); } it2.loc = 'storage'; it2.rot = D.rot; }
    } else if (D.zone === 'sell' && D.from !== 'shop' && !DEF[D.it.id].cls) {
      sell(R, D.it); playUi('sell');
    }
    renderShop();
  }
  window.addEventListener('contextmenu', function (e) { if (ST.drag) { e.preventDefault(); ST.drag.rot = (ST.drag.rot + 1) % 4; buildGhost(); moveDrag(ST.drag.lx, ST.drag.ly); } });
  window.addEventListener('keydown', function (e) { if (ST.drag && (e.key === 'r' || e.key === 'R')) { ST.drag.rot = (ST.drag.rot + 1) % 4; buildGhost(); moveDrag(ST.drag.lx, ST.drag.ly); } });
  window.addEventListener('wheel', function (e) { if (ST.drag) { ST.drag.rot = (ST.drag.rot + (e.deltaY > 0 ? 1 : 3)) % 4; buildGhost(); moveDrag(ST.drag.lx, ST.drag.ly); } }, { passive: true });
  function playUi(kind) {
    if (!audioOn()) return; var t = AU.ctx.currentTime + 0.01, ch = SONG.chords.Dm;
    if (kind === 'place') sampleAt(RACE[ST.R.race].keys[0], ch.tri[1] + 12, t, 0.15, 0.25, AU.master) || synth(74, t, 0.1, 0.4, AU.master);
    else sampleAt(RACE[ST.R.race].arp[0], ch.tri[2] + 24, t, 0.15, 0.25, AU.master) || synth(81, t, 0.1, 0.4, AU.master);
  }

  // ---------- fight screen ----------
  function startFight() {
    var R = ST.R, g = ghostFor(R.seed, R.round);
    var meItems = R.items.map(function (i) { return Object.assign({}, i); });
    var A = makeSide(meItems, R.leader, R.race, R.round, 'You');
    var B = makeSide(g.items, g.leader, g.race, R.round, g.name);
    var FX = { me: A, op: B, ghost: g, els: new Map() };
    ST.fight = FX;
    show('fight');
    $('f-res').hidden = true;
    buildFightView(FX);
    var F = new Fight(A, B, (R.seed + R.round * 977) >>> 0, {
      flash: function (fi, def) { var e = FX.els.get(fi); if (!e) return; e.classList.remove('fire', 'block'); void e.offsetWidth; e.classList.add(def ? 'block' : 'fire'); },
      gone: function (fi) { var e = FX.els.get(fi); if (e) e.classList.add('gone'); },
      num: function (S, txt, kind) { floatNum(S === A ? 'me' : 'op', txt, kind); },
      note: function (snd, q) {
        NOTES.count++; if (Math.abs(q / Q - Math.round(q / Q)) > 1e-6) NOTES.offGrid++;
        if (FX.speed !== 1 || !audioOn()) return;
        NOTES.played++;
        var abs = FX.t0 + q; if (abs < AU.ctx.currentTime) abs = AU.ctx.currentTime + 0.005;
        if (snd.fatigue) { drumAt(R.race, snd.n === 1 ? 'C' : 'TOM', abs, 0.5, AU.you, snd.n); return; }
        var fi = snd.fi; if (!fi) return;
        var d = fi.def, mine = fi.side === A;
        playPart(d.snd || 'keys', LEVEL[d.r] || '1', fi.side.race, q, mine ? AU.you : AU.them, 1, abs);
      }
    });
    FX.F = F;
    F.start();
    FX.speed = AUTO ? 0 : 1;
    if (!AUTO && audioOn()) {
      FX.t0 = AU.ctx.currentTime + 4 * BEAT + 0.1; // one bar count-in
      for (var b = 0; b < 4; b++) drumAt(R.race, 'H', FX.t0 - (4 - b) * BEAT, b === 0 ? 0.6 : 0.4, AU.you);
      FX.clock = function () { return AU.ctx.currentTime; };
    } else {
      var p0 = performance.now() / 1000; FX.t0 = p0 + (AUTO ? 0 : 4 * BEAT);
      FX.clock = function () { return performance.now() / 1000; };
    }
    FX.bedStep = 0;
    countIn(FX);
    FX.raf = requestAnimationFrame(function loop() { fightFrame(FX); if (!FX.done) FX.raf = requestAnimationFrame(loop); });
  }
  function countIn(FX) {
    var c = $('f-beat'); if (!c) return;
  }
  function fightFrame(FX) {
    var F = FX.F;
    if (FX.speed === 0) { for (var k = 0; k < 120 && !F.over; k++) F.step(1 / 60); }
    else {
      var now = FX.clock(), target = now - FX.t0;
      // music bed (Iron March drums and bass, part 1, part 3 from the fatigue drop) scheduled just ahead
      if (audioOn() && !F.over) {
        while (FX.t0 + FX.bedStep * STEP < AU.ctx.currentTime + 0.2) { bedStep(FX, FX.bedStep); FX.bedStep++; }
      }
      var guard = 0;
      while (F.t < target && !F.over && guard++ < 400) F.step(1 / 120);
    }
    updateFightHud(FX);
    if (F.over && !FX.done) { FX.done = true; endFight(FX); }
  }
  function bedStep(FX, i) {
    if (i < 0) return;
    var race = FX.me.race, abs = FX.t0 + i * STEP, s = i % 16, bar = Math.floor(i / 16), chord = SONG.prog[bar % 4];
    var lvl = i * STEP >= FATIGUE_AT ? '3' : (bar >= 4 ? '2' : '1');
    (PARTS.drums[lvl] || []).forEach(function (e) { if (e.s === s) drumAt(race, e.p, abs, 0.45, AU.bed, i); });
    if (s === 0 && bar > 0 && bar % 4 === 0) drumAt(race, 'C', abs, 0.3, AU.bed);
    (PARTS.bass['1'] || []).forEach(function (e) {
      if (e.s !== s) return; var pt = pitch(e.p, chord); if (!pt || !pt.notes) return;
      var R = RACE[race].bass; sampleAt(R[0], pt.notes[0] + R[1], abs, e.len * STEP, 0.32, AU.bed) || synth(pt.notes[0], abs, e.len * STEP, 0.3, AU.bed, 'sawtooth');
    });
  }
  function sideHtml(S, which) {
    return '<div class="who"><img class="lead-img" alt="" draggable="false" src="' + leaderImg(S.race, S.leader, which === 'me' ? 'back' : 'front') + '">' +
      '<div class="bars"><div class="nm">' + (which === 'me' ? 'You' : S.name) + '</div><div class="hpb"><i></i><span></span></div><div class="stb"></div><div class="chips"></div></div><div class="nums"></div></div>' +
      '<div class="fbag"></div>';
  }
  function buildFightView(FX) {
    var me = $('f-me'), op = $('f-op');
    me.innerHTML = sideHtml(FX.me, 'me'); op.innerHTML = sideHtml(FX.op, 'op');
    var prog = $('f-prog'); prog.innerHTML = SONG.prog.map(function (c) { return '<span>' + c + '</span>'; }).join('') + '<span class="beats"><i></i><i></i><i></i><i></i></span><span class="clock"></span>';
    $('f-skip').onclick = function () { if (FX.done) return; FX.speed = 0; };
    requestAnimationFrame(function () { drawFightBag(FX, FX.me, me.querySelector('.fbag')); drawFightBag(FX, FX.op, op.querySelector('.fbag')); });
  }
  function drawFightBag(FX, S, box) {
    var items = S.allItems.filter(function (i) { return i.loc === 'bag'; });
    var cs = []; items.forEach(function (it) { if (DEF[it.id].bag) cs = cs.concat(cellsOf(it)); });
    if (!cs.length) return;
    var x0 = Math.min.apply(null, cs.map(function (c) { return c[0]; })), y0 = Math.min.apply(null, cs.map(function (c) { return c[1]; }));
    var x1 = Math.max.apply(null, cs.map(function (c) { return c[0]; })), y1 = Math.max.apply(null, cs.map(function (c) { return c[1]; }));
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1, r = box.getBoundingClientRect();
    var t = Math.floor(Math.min((r.width - 8) / bw, (r.height - 8) / bh, 96)); t = Math.max(14, t);
    var g = el('div', 'fgrid'); g.style.width = bw * t + 'px'; g.style.height = bh * t + 'px';
    items.sort(function (a, b) { return (DEF[b.id].bag ? 1 : 0) - (DEF[a.id].bag ? 1 : 0); }).forEach(function (it) {
      var e = itemEl(it, t, S.race); e.style.left = (it.x - x0) * t + 'px'; e.style.top = (it.y - y0) * t + 'px'; g.appendChild(e);
      var fi = S.items.filter(function (f) { return f.inst === it; })[0]; if (fi) FX.els.set(fi, e);
    });
    box.innerHTML = ''; box.appendChild(g);
  }
  function chipHtml(S) {
    var out = '';
    ['block', 'empower', 'heat', 'luck', 'regen', 'spikes', 'vamp'].forEach(function (k) { if (S.b[k] > 0) out += '<span class="chip b-' + k + '">' + BNAME[k] + ' ' + S.b[k] + '</span>'; });
    ['blind', 'cold', 'poison'].forEach(function (k) { if (S.d[k] > 0) out += '<span class="chip d">' + BNAME[k] + ' ' + S.d[k] + '</span>'; });
    return out;
  }
  function updateFightHud(FX) {
    var F = FX.F;
    [['me', FX.me], ['op', FX.op]].forEach(function (p) {
      var root = $('f-' + p[0]), S = p[1];
      var pct = Math.max(0, S.hp) / S.max * 100;
      root.querySelector('.hpb i').style.width = pct + '%';
      root.querySelector('.hpb span').textContent = Math.max(0, Math.round(S.hp)) + ' / ' + S.max;
      var st = ''; for (var k = 0; k < S.stMax; k++) { var f = Math.max(0, Math.min(1, S.st - k)); st += '<i style="--f:' + f + '"></i>'; }
      var sb = root.querySelector('.stb'); if (sb.dataset.v !== st) { sb.innerHTML = st; sb.dataset.v = st; }
      var ch = chipHtml(S), ce = root.querySelector('.chips'); if (ce.dataset.v !== ch) { ce.innerHTML = ch; ce.dataset.v = ch; }
    });
    var t = Math.max(0, F.t), step = Math.floor(t / STEP), bar = Math.floor(step / 16), beat = Math.floor(step / 4) % 4;
    var spans = $('f-prog').querySelectorAll('span'); for (var i = 0; i < 4; i++) spans[i].classList.toggle('on', F.t >= 0 && bar % 4 === i);
    var bs = $('f-prog').querySelectorAll('.beats i'); for (var j = 0; j < 4; j++) bs[j].classList.toggle('on', j === beat);
    var clock = $('f-prog').querySelector('.clock'); clock.textContent = t.toFixed(1) + 's'; clock.classList.toggle('fat', t >= FATIGUE_AT);
  }
  function floatNum(which, txt, kind) {
    var FX = ST.fight; if (!FX || FX.speed === 0) return;
    var box = $('f-' + which).querySelector('.nums'); if (!box) return;
    var n = el('span', 'num ' + kind, txt); n.style.left = (20 + Math.random() * 60) + '%';
    box.appendChild(n); setTimeout(function () { n.remove(); }, 900);
  }
  function endFight(FX) {
    var R = ST.R, F = FX.F, w = F.winner === 'A';
    if (w) R.wins++; else R.losses++;
    ST.fightLog.push({ round: R.round, win: w, t: +F.t.toFixed(2), hpMe: Math.round(FX.me.hp), hpOp: Math.round(FX.op.hp) });
    updateFightHud(FX);
    var res = $('f-res');
    res.querySelector('b').textContent = F.winner === 'draw' ? 'Draw' : w ? 'Win' : 'Loss';
    res.className = 'res ' + (w ? 'win' : 'loss');
    res.hidden = false;
    $('f-me').querySelector('.lead-img').classList.add(w ? 'cheer' : 'slump');
    $('f-op').querySelector('.lead-img').classList.add(w ? 'slump' : 'cheer');
    if (audioOn() && FX.speed === 1) { var t = AU.ctx.currentTime + 0.05; drumAt(R.race, 'C', t, 0.6, AU.you); drumAt(R.race, 'K', t, 0.8, AU.you); }
    syncState();
    $('f-next').onclick = afterFight;
    if (AUTO) setTimeout(afterFight, 30);
  }
  function afterFight() {
    var R = ST.R;
    if (R.wins >= WINS_TO_WIN || R.losses >= LIVES || R.round >= MAX_ROUNDS) { endRun(); return; }
    R.round++;
    var ev = startShopPhase(R, false);
    show('shop'); renderShop();
    var msg = [];
    ev.combos.forEach(function (c) { msg.push(c.ins.map(function (i) { return DEF[i].n; }).join(' + ') + ' > ' + DEF[c.out].n); });
    if (msg.length) toast(msg.join('  '));
    if (AUTO) setTimeout(autoShop, 30);
  }
  function endRun() {
    var R = ST.R, won = R.wins >= WINS_TO_WIN;
    ST.result = won ? 'win' : 'loss';
    $('toast').classList.remove('on');
    $('e-img').src = leaderImg(R.race, R.leader, 'front');
    $('e-img').className = won ? 'cheer' : 'slump';
    $('e-word').textContent = won ? 'Headliner' : 'Run over';
    var pips = ''; for (var i = 0; i < R.wins; i++) pips += '<i class="wp on"></i>'; for (var j = 0; j < R.losses; j++) pips += '<i class="pip"></i>';
    $('e-pips').innerHTML = pips;
    $('e-sub').textContent = 'Round ' + R.round;
    show('end');
  }
  $('e-again').onclick = function () { show('select'); renderSelect(); };

  // ---------- auto play (for the checker) ----------
  function autoShop() {
    var R = ST.R; botShop(R); renderShop();
    setTimeout(function () { startFight(); }, 30);
  }

  // ---------- boot ----------
  window.addEventListener('resize', function () { if (ST.screen === 'shop') renderShop(); else if (ST.screen === 'fight' && ST.fight) { var FX = ST.fight; drawFightBag(FX, FX.me, $('f-me').querySelector('.fbag')); drawFightBag(FX, FX.op, $('f-op').querySelector('.fbag')); } });
  renderSelect(); show('select');
  if (AUTO) setTimeout(function () { startRun('countin'); setTimeout(autoShop, 30); }, 50);
  window.__BB = { ST: ST, DEF: DEF, ghostFor: ghostFor, maxHpFor: maxHpFor, Fight: Fight, makeSide: makeSide, combine: combine, newRun: newRun };
})();
