// Seed Brawl Lanes: progress between matches, saved on the phone. No account, no server, nothing leaves the device.
// Every number of the loop is in TABLE below: change one line there and the whole app follows (the road, floors,
// the bots' level, what is unlocked). All of TABLE is Claude's draft, not ruled by Vyas (DECISIONS.md 2026-11-14).
// Creep id: '<kind>_<tier>', kind thorn | spitter | runner (SBL.KINDS order), tier 1..5 = Grunt, Brute, Splasher,
// Flyer, Colossus (SBL.BODIES index). Hero id: the SBL.HEROES id. Plain script; exposes window.SBL_META (and
// module.exports under node, for the test).
(function (root) {
  'use strict';
  const TABLE = {
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
  };
  const KEY = 'seedbrawl.meta.v1', KINDS = ['thorn', 'spitter', 'runner'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const startRow = () => TABLE.road[0];
  function fresh() {
    return { v: 1, trophies: 0, best: 0, hero: TABLE.startHero, deck: startRow().creeps.slice(0, TABLE.deckSize), seen: [...(startRow().heroes || []), ...(startRow().creeps || [])],
      played: 0, wins: 0, losses: 0, draws: 0, firstRun: true, settings: { music: true, sound: true, vibrate: true }, last: null };
  }
  let store = null; try { store = root.localStorage || null; } catch (e) { store = null; }
  const M = { TABLE, KEY, state: fresh() };

  // ---- the road
  const rewardsOf = r => [...(r.heroes || []).map(id => ({ type: 'hero', id })), ...(r.creeps || []).map(id => ({ type: 'creep', id }))];
  M.marks = () => TABLE.road.slice(1).map(r => ({ at: r.at, rewards: rewardsOf(r) }));
  M.unlocked = (best = M.state.best) => { const h = [], c = []; for (const r of TABLE.road) if (r.at <= best) { h.push(...(r.heroes || [])); c.push(...(r.creeps || [])); } return { heroes: h, creeps: c }; };
  M.isUnlocked = (id, best) => { const u = M.unlocked(best); return u.heroes.includes(id) || u.creeps.includes(id); };
  M.markFor = id => { for (const r of TABLE.road) if ((r.heroes || []).includes(id) || (r.creeps || []).includes(id)) return r.at; return null; };
  M.floor = (best = M.state.best) => { let f = 0; for (const r of TABLE.road) if (r.at <= best) f = r.at; return f; };
  M.next = (t = M.state.trophies) => { const r = TABLE.road.find(r => r.at > t); return r ? { at: r.at, rewards: rewardsOf(r) } : null; };
  M.prev = (t = M.state.trophies) => { let p = 0; for (const r of TABLE.road) if (r.at <= t) p = r.at; return p; };
  M.progress = (t = M.state.trophies) => { const n = M.next(t); if (!n) return 1; const p = M.prev(t); return (t - p) / (n.at - p); };
  M.botLevel = (t = M.state.trophies) => { let l = 0; TABLE.botLevels.forEach((at, i) => { if (t >= at) l = i; }); return l; };
  M.allCreeps = () => { const a = []; for (const k of KINDS) for (let t = 1; t <= 5; t++) a.push(k + '_' + t); return a; };
  M.parse = id => { const [k, t] = id.split('_'); return { kind: KINDS.indexOf(k), tier: +t }; };   // {kind 0..2, tier 1..5}, the match's deck shape

  // ---- load and save
  function repair(s) {
    const d = fresh(); for (const k of Object.keys(d)) if (s[k] === undefined || s[k] === null && d[k] !== null) s[k] = d[k];
    s.trophies = Math.max(0, +s.trophies || 0); s.best = Math.max(s.trophies, +s.best || 0);
    const u = M.unlocked(s.best);
    if (!u.heroes.includes(s.hero)) s.hero = TABLE.startHero;
    const deck = []; for (const id of Array.isArray(s.deck) ? s.deck : []) if (u.creeps.includes(id) && !deck.includes(id)) deck.push(id);
    for (const id of u.creeps) if (deck.length < TABLE.deckSize && !deck.includes(id)) deck.push(id);
    s.deck = deck.slice(0, TABLE.deckSize);
    if (!Array.isArray(s.seen)) s.seen = d.seen;
    s.settings = Object.assign({}, d.settings, s.settings || {});
    return s;
  }
  M.load = () => { let s = null; try { const raw = store && store.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; } M.state = repair(s && typeof s === 'object' ? s : fresh()); return M.state; };
  M.save = () => { try { if (store) store.setItem(KEY, JSON.stringify(M.state)); return true; } catch (e) { return false; } };
  M.reset = () => { M.state = fresh(); M.save(); return M.state; };

  // ---- choices
  M.setHero = id => { if (!M.isUnlocked(id)) return false; M.state.hero = id; M.save(); return true; };
  M.setDeck = ids => {
    if (!Array.isArray(ids) || ids.length !== TABLE.deckSize || new Set(ids).size !== ids.length) return false;
    const u = M.unlocked().creeps; if (!ids.every(id => u.includes(id))) return false;
    M.state.deck = ids.slice(); M.save(); return true;
  };
  M.swap = (slot, id) => { const d = M.state.deck.slice(); if (slot < 0 || slot >= d.length || !M.unlocked().creeps.includes(id)) return false; const j = d.indexOf(id); if (j >= 0) d[j] = d[slot]; d[slot] = id; return M.setDeck(d); };
  M.markSeen = id => { if (!M.state.seen.includes(id)) { M.state.seen.push(id); M.save(); } };
  M.unseen = () => { const u = M.unlocked(); return [...u.heroes, ...u.creeps].filter(id => !M.state.seen.includes(id)); };

  // ---- a match: what to start it with, and what its result does
  // heroes: SBL.HEROES (to turn ids into indexes). Bots draw from what you own plus the next mark, so nobody fields a body
  // before you could.
  M.matchStart = heroes => {
    const s = M.state, u = M.unlocked(), n = M.next(s.best), ahead = n ? n.rewards : [];
    const idx = id => heroes ? heroes.findIndex(h => h.id === id) : -1;
    const heroIds = [...u.heroes, ...ahead.filter(r => r.type === 'hero').map(r => r.id)];
    const poolIds = [...u.creeps, ...ahead.filter(r => r.type === 'creep').map(r => r.id)];
    return { heroIndex: Math.max(0, idx(s.hero)), deck: s.deck.map(M.parse), pool: poolIds.map(M.parse), botLevel: M.botLevel(), heroes: heroIds };
  };
  M.record = result => {
    const s = M.state, before = s.trophies, bestBefore = s.best, T = TABLE.trophies;
    let after = before;
    if (result === 'win') { after += T.win; s.wins++; } else if (result === 'draw') { after += T.draw; s.draws++; } else { after = Math.max(M.floor(bestBefore), before - T.loss); s.losses++; }
    s.trophies = after; s.best = Math.max(bestBefore, after); s.played++; s.firstRun = false;
    const crossed = TABLE.road.filter(r => r.at > bestBefore && r.at <= s.best).map(r => ({ at: r.at, rewards: rewardsOf(r) }));
    const unlocks = []; for (const c of crossed) for (const r of c.rewards) unlocks.push(r);
    s.last = { result, before, after, t: Date.now() };
    M.save();
    return { result, before, after, delta: after - before, floor: M.floor(bestBefore), crossed, unlocks };
  };
  M.setTrophies = t => { M.state.trophies = Math.max(0, t | 0); M.state.best = Math.max(M.state.best, M.state.trophies); M.save(); };   // test hook and ?meta=
  M.clone = clone;

  if (typeof module !== 'undefined' && module.exports) module.exports = M; else root.SBL_META = M;
})(typeof window !== 'undefined' ? window : globalThis);
