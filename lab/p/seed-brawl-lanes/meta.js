// Seed Brawl Lanes: progress between matches, saved on the phone. No account, no server, nothing leaves the device.
// Every number of the loop is in TABLE below: change one line there and the whole app follows (the road, floors,
// the bots' level, what is unlocked). All of TABLE is Claude's draft, not ruled by the owner (DECISIONS.md 2026-11-14).
// Creep id: '<kind>_<tier>', kind thorn | spitter | runner (SBL.KINDS order), tier 1..5 = Grunt, Brute, Splasher,
// Flyer, Colossus (SBL.BODIES index). Hero id: the SBL.HEROES id. Homie id: '<hero id>_<tier>' (SBL.HOMIES).
// Plain script; exposes window.SBL_META (and module.exports under node, for the tests).
(function (root) {
  'use strict';
  const TABLE = {
    // ---- homies off (?homies=0): build 8 exactly
    trophies: { win: 30, draw: 5, loss: 12 },    // a loss never takes you below the highest road mark you have reached
    deckSize: 6,
    startHero: 'mower',
    // the road: at that many trophies (best ever), these unlock. The first row is what a new player owns.
    road: [
      { at: 0, heroes: ['mower', 'sow', 'bramble'], creeps: ['thorn_1', 'spitter_1', 'runner_1', 'thorn_2', 'spitter_2', 'runner_2'] },
      { at: 50, creeps: ['thorn_3'] },
      { at: 100, heroes: ['foxglove'] },
      { at: 170, creeps: ['spitter_3'] },
      { at: 240, creeps: ['runner_3'] },
      { at: 330, heroes: ['magpie'] },
      { at: 430, creeps: ['thorn_4'] },
      { at: 540, creeps: ['spitter_4'] },
      { at: 660, heroes: ['thistle'] },
      { at: 790, creeps: ['runner_4'] },
      { at: 930, creeps: ['thorn_5'] },
      { at: 1080, heroes: ['drover'] },
      { at: 1250, creeps: ['spitter_5'] },
      { at: 1440, heroes: ['shade'] },
      { at: 1650, creeps: ['runner_5'] },
      { at: 1880, heroes: ['bamboo'] },
    ],
    // bots get harder with your trophies: level n from botLevels[n] trophies up (0..4)
    botLevels: [0, 50, 330, 930, 1440],
    // a losing run eases the bots: after `after` losses in a row they play one level easier, one more for each further loss
    // (at most `max` levels easier, never under level 0); each win takes one step back
    ease: { after: 2, max: 2 },

    // ---- homies on (the default): road and reward pace draft 1 (work/road-draft/ROAD-DRAFT-2026-11-15.md, his "Yes, build
    // it" 2026-11-15). Start with Champ and his tier 1 to 3 homies; each other hero arrives with his tier 1 to 3, then his tier
    // 4, then his tier 5. Old Shell (Kero tier 5) has no body: no mark. Gyoji (Bao tier 2) has no body: he comes with Bao as
    // the stand-in build 9 draws (standIn), not named on the road. Every number here is Claude's draft.
    homies: {
      start: { hero: 'bramble', homies: ['bramble_1', 'bramble_2', 'bramble_3'] },
      road: [
        { at: 30, homies: ['bramble_4'] },                                  // Bags
        { at: 60, hero: 'sow', homies: ['sow_1', 'sow_2', 'sow_3'] },        // Hoot with Owlet, Chips, Fawn
        { at: 100, homies: ['bramble_5'] },                                 // Mitts
        { at: 140, homies: ['sow_4'] },                                     // Burrow
        { at: 180, hero: 'mower', homies: ['mower_1', 'mower_2', 'mower_3'] },   // Kero with Pupil, Dart, Kingfisher
        { at: 230, homies: ['sow_5'] },                                     // Bristle
        { at: 280, homies: ['mower_4'] },                                   // Taiko
        { at: 340, hero: 'foxglove', homies: ['foxglove_1', 'foxglove_2', 'foxglove_3'] },   // Sly with Stinker, Quills, Scruff
        { at: 400, homies: ['foxglove_4'] },                                // Flit
        { at: 470, homies: ['foxglove_5'] },                                // Hog
        { at: 550, hero: 'magpie', homies: ['magpie_1', 'magpie_2', 'magpie_3'] },   // Whiskers with Coo, Gutter, Junk
        { at: 640, homies: ['magpie_4'] },                                  // Slick
        { at: 730, homies: ['magpie_5'] },                                  // Vault
        { at: 830, hero: 'thistle', homies: ['thistle_1', 'thistle_2', 'thistle_3'] },   // Presto with Dove, Bunny, Juggles
        { at: 940, homies: ['thistle_4'] },                                 // Boomer
        { at: 1070, homies: ['thistle_5'] },                                // Atlas
        { at: 1210, hero: 'drover', homies: ['drover_1', 'drover_2', 'drover_3'] },   // Tusk with Rattle, Sandbag, Billy
        { at: 1360, homies: ['drover_4'] },                                 // Big Bertha
        { at: 1530, homies: ['drover_5'] },                                 // Sarge
        { at: 1710, hero: 'shade', homies: ['shade_1', 'shade_2', 'shade_3'] },   // Kuro with Pin, Caw, Ox
        { at: 1910, homies: ['shade_4'] },                                  // Puff
        { at: 2130, homies: ['shade_5'] },                                  // Old Mole
        { at: 2370, hero: 'bamboo', homies: ['bamboo_1', 'bamboo_3'], standIn: ['bamboo_2'] },   // Bao with Kit, Salty (Gyoji as his stand-in)
        { at: 2640, homies: ['bamboo_4'] },                                 // Chef
        { at: 2940, homies: ['bamboo_5'] },                                 // Elder Yak
      ],
      // a win +30, a draw +5; a loss costs by your trophies: [from, cost] (0 under 100, 3 to 399, 6 to 999, 9 to 1,999, then 12)
      trophies: { win: 30, draw: 5, loss: [[0, 0], [100, 3], [400, 6], [1000, 9], [2000, 12]] },
      // build 8's five bot levels (0, 50, 330, 930, 1440 over a 1,880 road) in the same proportions over the 2,940 road, to 10
      botLevels: [0, 80, 520, 1450, 2250],
      // bots and team mates may be the heroes you own plus the next `aheadHeroes` heroes on the road
      aheadHeroes: 2,
    },
  };
  const KEY = 'seedbrawl.meta.v1', KINDS = ['thorn', 'spitter', 'runner'], HT = TABLE.homies;
  const clone = o => JSON.parse(JSON.stringify(o));
  const startRow = () => TABLE.road[0];
  const okDeck = (ids, own) => Array.isArray(ids) && ids.length === TABLE.deckSize && new Set(ids).size === ids.length && ids.every(id => own.includes(id));
  const HON = () => !!(root.SBL && root.SBL.homiesOn);
  const startOwn = () => ({ heroes: [HT.start.hero], homies: HT.start.homies.slice() });
  function fresh() {
    return { v: 2, trophies: 0, best: 0, hero: HON() ? HT.start.hero : TABLE.startHero, deck: startRow().creeps.slice(0, TABLE.deckSize), decks: {}, seen: [...(startRow().heroes || []), ...(startRow().creeps || []), ...HT.start.homies],
      own: startOwn(), played: 0, wins: 0, losses: 0, draws: 0, lossRun: 0, ease: 0, firstRun: true, settings: { music: true, sound: true, vibrate: true }, last: null,
      cos: { owned: [], fresh: [], loadouts: {} } };   // cosmetics (Rollybully Profile shape): items given, not yet seen, and per hero the equipped item per slot ("" = the slot's default)
  }
  let store = null; try { store = root.localStorage || null; } catch (e) { store = null; }
  const M = { TABLE, KEY, state: fresh() };
  M.homies = HON;

  // ---- homies on: what you own. state.own (heroes, homies) is kept in the save and only ever grows; the road up to your best
  // is added on every load, so a mark reached is never lost. A homie with no body (SBL.HOUT: Old Shell) is on no mark, so only an
  // old save that owned his hero's whole crew in build 8 or 9 owns him (on his stand-in).
  const out = id => !!(root.SBL && root.SBL.HOUT && root.SBL.HOUT.has(id));
  const tiersAll = hero => [1, 2, 3, 4, 5].filter(t => !(root.SBL && root.SBL.HOMIES) || root.SBL.HOMIES[hero + '_' + t]);   // every tier he has, Old Shell included
  M.crewList = (hero = M.state.hero) => tiersAll(hero).map(t => hero + '_' + t).filter(id => M.ownsHomie(id) || !out(id));   // the crew screen: owned, then the ones still on the road
  const rowGives = r => [...(r.hero ? [r.hero] : []), ...(r.homies || []), ...(r.standIn || [])];
  function roadOwn(best) { const o = startOwn(); for (const r of HT.road) if (r.at <= best) { if (r.hero) o.heroes.push(r.hero); o.homies.push(...(r.homies || []), ...(r.standIn || [])); } return o; }
  function addOwn(s, o) { s.own = s.own || { heroes: [], homies: [] }; for (const h of o.heroes) if (!s.own.heroes.includes(h)) s.own.heroes.push(h); for (const h of o.homies) if (!s.own.homies.includes(h)) s.own.homies.push(h); }
  M.ownedHeroes = () => M.state.own.heroes.slice();
  M.ownedTiers = (hero = M.state.hero) => tiersAll(hero).filter(t => M.state.own.homies.includes(hero + '_' + t));
  M.ownsHomie = id => M.state.own.homies.includes(id);
  M.crew = (hero = M.state.hero) => (root.SBL && root.SBL.crewDeck ? root.SBL.crewDeck(hero, M.ownedTiers(hero)) : []).map(c => c.hid);
  M.deckIds = () => HON() ? M.crew() : M.state.deck;
  M.markOf = id => { if (HT.start.hero === id || HT.start.homies.includes(id)) return 0; const r = HT.road.find(r => rowGives(r).includes(id)); return r ? r.at : null; };   // the trophies that give a hero or homie
  M.lossAt = t => { let c = 0; for (const [from, cost] of HT.trophies.loss) if (t >= from) c = cost; return c; };   // homies on: what a loss costs at t trophies
  // the bots' fair rule: a bot (or team mate) hero brings the homies of his that the road has given by your best trophies;
  // a hero the road has not given yet brings what he arrives with (tier 1 to 3). Never more than you could own at your place.
  M.fairTiers = (hero, best = M.state.best) => { const o = roadOwn(best), arrive = HT.road.find(r => r.hero === hero) || (HT.start.hero === hero ? { homies: HT.start.homies } : null);
    const ids = new Set(o.homies.filter(id => id.startsWith(hero + '_'))); if (!o.heroes.includes(hero) && arrive) for (const id of [...(arrive.homies || []), ...(arrive.standIn || [])]) ids.add(id);
    return tiersAll(hero).filter(t => ids.has(hero + '_' + t)); };
  M.botHeroes = (best = M.state.best) => { const own = M.ownedHeroes(), ahead = HT.road.filter(r => r.hero && r.at > best && !own.includes(r.hero)).slice(0, HT.aheadHeroes).map(r => r.hero); return [...own, ...ahead]; };

  // ---- the road
  const rewardsOf = r => [...(r.heroes || []).map(id => ({ type: 'hero', id })), ...(HON() ? [] : (r.creeps || []).map(id => ({ type: 'creep', id })))];
  const hRewards = r => r.hero ? [{ type: 'hero', id: r.hero, crew: [...(r.homies || []), ...(r.standIn || [])].sort() }] : (r.homies || []).map(id => ({ type: 'homie', id, hero: id.split('_')[0] }));
  const ROAD = () => HON() ? HT.road.map(r => ({ at: r.at, rewards: hRewards(r) })) : TABLE.road.slice(1).map(r => ({ at: r.at, rewards: rewardsOf(r) })).filter(m => m.rewards.length);
  M.marks = () => ROAD();
  M.unlocked = (best = M.state.best) => { if (HON()) return { heroes: M.ownedHeroes(), creeps: [] }; const h = [], c = []; for (const r of TABLE.road) if (r.at <= best) { h.push(...(r.heroes || [])); c.push(...(r.creeps || [])); } return { heroes: h, creeps: c }; };
  M.isUnlocked = (id, best) => { const u = M.unlocked(best); return u.heroes.includes(id) || u.creeps.includes(id); };
  M.markFor = id => { if (HON()) return M.markOf(id); for (const r of TABLE.road) if ((r.heroes || []).includes(id) || (r.creeps || []).includes(id)) return r.at; return null; };
  M.floor = (best = M.state.best) => { let f = 0; for (const r of (HON() ? HT.road : TABLE.road)) if (r.at <= best) f = r.at; return f; };
  M.next = (t = M.state.trophies) => { const m = ROAD().find(m => m.at > t); return m || null; };
  M.prev = (t = M.state.trophies) => { let p = 0; for (const m of ROAD()) if (m.at <= t) p = m.at; return p; };
  M.progress = (t = M.state.trophies) => { const n = M.next(t); if (!n) return 1; const p = M.prev(t); return (t - p) / (n.at - p); };
  M.botLevel = (t = M.state.trophies) => { let l = 0; (HON() ? HT.botLevels : TABLE.botLevels).forEach((at, i) => { if (t >= at) l = i; }); return l; };
  M.matchLevel = () => Math.max(0, M.botLevel() - Math.max(0, Math.min(TABLE.ease.max, M.state.ease | 0)));   // the level the next match's bots play at
  M.allCreeps = () => { const a = []; for (const k of KINDS) for (let t = 1; t <= 5; t++) a.push(k + '_' + t); return a; };
  M.parse = id => { const [k, t] = id.split('_'); return { kind: KINDS.indexOf(k), tier: +t }; };   // {kind 0..2, tier 1..5}, the match's deck shape

  // ---- load and save
  // migration to v2 (road draft 1): a save from build 8 or 9 (v1) keeps every hero it owned there AND his whole crew (every
  // homie of his that takes part), whatever the new road says; trophies and best stay. Nothing a save has is taken away.
  function migrate(s) {
    if (s.v === 2 && s.own && Array.isArray(s.own.heroes) && Array.isArray(s.own.homies)) return s;
    const had = []; for (const r of TABLE.road) if (r.at <= s.best) had.push(...(r.heroes || []));
    const o = { heroes: had, homies: [] }; for (const h of had) for (const t of tiersAll(h)) o.homies.push(h + '_' + t);
    s.own = { heroes: [], homies: [] }; addOwn(s, startOwn()); addOwn(s, o); s.migratedFrom = s.v || 1; s.v = 2;
    if (!Array.isArray(s.seen)) s.seen = []; for (const id of [...s.own.heroes, ...s.own.homies]) if (!s.seen.includes(id)) s.seen.push(id);   // nothing old shows as new
    return s;
  }
  function repair(s) {
    const d = fresh(); for (const k of Object.keys(d)) if (k !== 'v' && k !== 'own' && (s[k] === undefined || s[k] === null && d[k] !== null)) s[k] = d[k];
    s.trophies = Math.max(0, +s.trophies || 0); s.best = Math.max(s.trophies, +s.best || 0);
    migrate(s); addOwn(s, roadOwn(s.best));
    const u = M.unlocked(s.best);
    if (HON()) { if (!s.own.heroes.includes(s.hero)) s.hero = s.own.heroes.includes(HT.start.hero) ? HT.start.hero : s.own.heroes[0]; }
    else if (!u.heroes.includes(s.hero)) s.hero = TABLE.startHero;
    const uc = HON() ? (() => { const c = []; for (const r of TABLE.road) if (r.at <= s.best) c.push(...(r.creeps || [])); return c; })() : u.creeps;   // the creep deck stays as build 8 keeps it, for ?homies=0
    const deck = []; for (const id of Array.isArray(s.deck) ? s.deck : []) if (uc.includes(id) && !deck.includes(id)) deck.push(id);
    for (const id of uc) if (deck.length < TABLE.deckSize && !deck.includes(id)) deck.push(id);
    s.deck = deck.slice(0, TABLE.deckSize);
    if (!s.decks || typeof s.decks !== 'object' || Array.isArray(s.decks)) s.decks = {};
    for (const h of Object.keys(s.decks)) if (!okDeck(s.decks[h], uc)) delete s.decks[h];
    if (!Array.isArray(s.seen)) s.seen = d.seen;
    s.settings = Object.assign({}, d.settings, s.settings || {});
    // ---- cosmetics (ff-looks): an old save has none, so every hero loads in his default skin
    const c = s.cos && typeof s.cos === 'object' && !Array.isArray(s.cos) ? s.cos : (s.cos = {});
    for (const k of ['owned', 'fresh']) c[k] = Array.isArray(c[k]) ? c[k].filter(x => typeof x === 'string') : [];
    if (!c.loadouts || typeof c.loadouts !== 'object' || Array.isArray(c.loadouts)) c.loadouts = {};
    for (const h of Object.keys(c.loadouts)) { const l = c.loadouts[h]; if (!l || typeof l !== 'object') delete c.loadouts[h]; else for (const k of Object.keys(l)) if (typeof l[k] !== 'string') delete l[k]; }
    return s;
  }
  M.migrate = s => repair(s);   // for the test: a save object as stored, after load
  M.load = () => { let s = null; try { const raw = store && store.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; } M.state = repair(s && typeof s === 'object' ? s : fresh()); return M.state; };
  M.save = () => { try { if (store) store.setItem(KEY, JSON.stringify(M.state)); return true; } catch (e) { return false; } };
  M.reset = () => { M.state = fresh(); M.save(); return M.state; };

  // ---- choices
  // each hero keeps its own deck: picking a hero brings back the deck last saved with him; a hero with none gets his own default
  // deck (SBL.DECKS, work/balance/creeps.md) once every creep in it is owned, else keeps the deck in hand
  M.heroDefault = id => { const D = root.SBL && root.SBL.DECKS; const d = D && D[id]; return Array.isArray(d) ? d.map(c => KINDS[c.kind] + '_' + c.tier) : null; };
  M.setHero = id => {
    if (HON()) { if (!M.state.own.heroes.includes(id)) return false; M.state.hero = id; M.save(); return true; }
    if (!M.isUnlocked(id)) return false; const s = M.state, own = M.unlocked().creeps;
    if (id !== s.hero) { s.decks[s.hero] = s.deck.slice(); const mine = s.decks[id], def = M.heroDefault(id);
      if (okDeck(mine, own)) s.deck = mine.slice(); else if (okDeck(def, own)) s.deck = def; }
    s.hero = id; M.save(); return true;
  };
  M.setDeck = ids => {
    if (!okDeck(ids, M.unlocked().creeps)) return false;
    M.state.deck = ids.slice(); M.state.decks[M.state.hero] = ids.slice(); M.save(); return true;
  };
  M.swap = (slot, id) => { const d = M.state.deck.slice(); if (slot < 0 || slot >= d.length || !M.unlocked().creeps.includes(id)) return false; const j = d.indexOf(id); if (j >= 0) d[j] = d[slot]; d[slot] = id; return M.setDeck(d); };
  // ---- cosmetics (ff-looks), Rollybully's Profile logic (C:/Dev/ball-mech/Assets/Scripts/Profile.cs): the catalog
  // (game/assets/heroes/cosmetics.json, handed in by main.js) says what exists; the save says what was given and what
  // each hero wears. Owned: given, or free, or an earn rule met (no earn rule is known yet, so none is met).
  let CAT = [];
  M.setCatalog = items => { CAT = Array.isArray(items) ? items : []; };
  const item = id => CAT.find(it => it.id === id) || null;
  const fits = (it, hero) => it.hero === hero || it.hero === 'any';
  const cosOf = () => M.state.cos || (M.state.cos = { owned: [], fresh: [], loadouts: {} });
  M.isOwned = id => { if (!id) return true; if (cosOf().owned.includes(id)) return true; const it = item(id); return !!it && it.get === 'free'; };
  M.unlockItem = id => { const c = cosOf(); if (!id || c.owned.includes(id)) return false; c.owned.push(id); if (!c.fresh.includes(id)) c.fresh.push(id); M.save(); return true; };
  M.slotDefault = (hero, slot) => CAT.find(it => it.slot === slot && fits(it, hero) && /\.default$/.test(it.id)) || null;
  M.itemsFor = (hero, slot) => CAT.filter(it => it.slot === slot && fits(it, hero));
  // the item a hero wears in a slot: the equipped one if it still exists, fits and is owned, else the slot's default
  M.equipped = (hero, slot = 'skin') => { const l = cosOf().loadouts[hero] || {}, it = item(l[slot]); if (it && it.slot === slot && fits(it, hero) && M.isOwned(it.id)) return it; return M.slotDefault(hero, slot); };
  // equip: '' or the default puts the slot back to its default (stored as '' so a later default change carries)
  M.equip = (hero, id) => {
    const it = item(id); if (!it) return { ok: false, reason: 'NOT FOUND' }; if (!fits(it, hero)) return { ok: false, reason: 'NOT FOR THIS HERO' }; if (!M.isOwned(id)) return { ok: false, reason: 'LOCKED' };
    const c = cosOf(), l = c.loadouts[hero] || (c.loadouts[hero] = {}), def = M.slotDefault(hero, it.slot), to = def && def.id === id ? '' : id;
    if ((l[it.slot] || '') === to) return { ok: true }; if (to) l[it.slot] = to; else delete l[it.slot]; if (!Object.keys(l).length) delete c.loadouts[hero];
    M.save(); return { ok: true };
  };
  M.skinOf = hero => { const it = M.equipped(hero, 'skin'); return it ? it.id : ''; };   // '' before the catalog is in: the hero as he is
  M.markSeen = id => { if (!M.state.seen.includes(id)) { M.state.seen.push(id); M.save(); } };
  M.unseen = () => { if (HON()) return [...M.state.own.heroes, ...M.state.own.homies].filter(id => !M.state.seen.includes(id)); const u = M.unlocked(); return [...u.heroes, ...u.creeps].filter(id => !M.state.seen.includes(id)); };

  // ---- a match: what to start it with, and what its result does
  // heroes: SBL.HEROES (to turn ids into indexes). Homies off: bots draw from what you own plus the next mark, so nobody fields a
  // body before you could. Homies on: the bots' heroes and crews follow M.botHeroes and M.fairTiers.
  M.matchStart = heroes => {
    const s = M.state, idx = id => heroes ? heroes.findIndex(h => h.id === id) : -1;
    if (HON()) {
      const ids = M.botHeroes(s.best), crews = {}; for (const h of ids) crews[h] = M.fairTiers(h, s.best);
      return { heroIndex: Math.max(0, idx(s.hero)), deck: null, pool: null, botLevel: M.matchLevel(), heroes: ids, myCrew: M.ownedTiers(s.hero), crews };
    }
    const u = M.unlocked(), n = M.next(s.best), ahead = n ? n.rewards : [];
    const heroIds = [...u.heroes, ...ahead.filter(r => r.type === 'hero').map(r => r.id)];
    const poolIds = [...u.creeps, ...ahead.filter(r => r.type === 'creep').map(r => r.id)];
    return { heroIndex: Math.max(0, idx(s.hero)), deck: s.deck.map(M.parse), pool: poolIds.map(M.parse), botLevel: M.matchLevel(), heroes: heroIds };
  };
  M.record = result => {
    const s = M.state, before = s.trophies, bestBefore = s.best, H = HON(), T = H ? HT.trophies : TABLE.trophies;
    let after = before;
    if (result === 'win') { after += T.win; s.wins++; s.lossRun = 0; s.ease = Math.max(0, (s.ease | 0) - 1); }
    else if (result === 'draw') { after += T.draw; s.draws++; s.lossRun = 0; }
    else { after = Math.max(M.floor(bestBefore), before - (H ? M.lossAt(before) : T.loss)); s.losses++; s.lossRun = (s.lossRun | 0) + 1; if (s.lossRun >= TABLE.ease.after) s.ease = Math.min(TABLE.ease.max, (s.ease | 0) + 1); }
    s.trophies = after; s.best = Math.max(bestBefore, after); s.played++; s.firstRun = false;
    const crossed = ROAD().filter(m => m.at > bestBefore && m.at <= s.best), had = H ? clone(s.own) : null;
    const unlocks = []; for (const c of crossed) for (const r of c.rewards) if (!had || !(r.type === 'hero' ? had.heroes.includes(r.id) : had.homies.includes(r.id))) unlocks.push(r);   // an old save that already has it sees no reveal
    if (H) addOwn(s, roadOwn(s.best));   // a homie is in his hero's deck from the moment his mark is crossed
    s.last = { result, before, after, t: Date.now() };
    M.save();
    return { result, before, after, delta: after - before, floor: M.floor(bestBefore), crossed, unlocks };
  };
  M.setTrophies = t => { M.state.trophies = Math.max(0, t | 0); M.state.best = Math.max(M.state.best, M.state.trophies); if (HON()) addOwn(M.state, roadOwn(M.state.best)); M.save(); };   // test hook and ?meta=
  M.clone = clone;

  if (typeof module !== 'undefined' && module.exports) module.exports = M; else root.SBL_META = M;
})(typeof window !== 'undefined' ? window : globalThis);
