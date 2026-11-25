// Checks Sing Island World's rules data. Fails (exit 1) on any broken rule.
// node tools/check_data.mjs   (run from the sing-island-world folder or anywhere)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = f => readFileSync(join(root, f), 'utf8');
const SP = JSON.parse(raw('data/species.json'));
const IS = JSON.parse(raw('data/islands.json'));
const EC = JSON.parse(raw('data/economy.json'));

const errs = [], notes = [];
const bad = m => errs.push(m);
const els = Object.keys(SP.elements);
const byId = {};
const sub = (a, b) => a.every(e => b.includes(e));
const key = a => [...a].sort().join('+');

// species
const combos = {};
for (const s of SP.species) {
  if (byId[s.id]) bad(`species ${s.id} listed twice`);
  byId[s.id] = s;
  if (!s.elements.length || s.elements.some(e => !els.includes(e))) bad(`species ${s.id} has an unknown element`);
  if (new Set(s.elements).size !== s.elements.length) bad(`species ${s.id} repeats an element`);
  if (s.tier !== s.elements.length) bad(`species ${s.id} tier ${s.tier} is not its element count ${s.elements.length}`);
  if (!existsSync(join(root, 'img', s.picture + '.webp'))) bad(`species ${s.id} picture img/${s.picture}.webp is missing`);
  if (!s.mouth || typeof s.mouth.x !== 'number') bad(`species ${s.id} has no mouth position`);
  else if (!existsSync(join(root, 'img', 'mouths-' + s.mouth.atlas + '.webp'))) bad(`species ${s.id} mouth atlas ${s.mouth.atlas} is missing`);
  const k = key(s.elements);
  if (combos[k]) bad(`species ${s.id} and ${combos[k]} have the same elements ${k}`);
  combos[k] = s.id;
}
const want = 2 ** els.length - 1;
if (SP.species.length !== want) bad(`${SP.species.length} species, want ${want} (every mix of ${els.length} elements)`);

// duplicate keys inside each "parts" block (JSON.parse would hide them)
const partsBlocks = [...raw('data/islands.json').matchAll(/"parts":\s*\{([^}]*)\}/g)];
partsBlocks.forEach((m, i) => {
  const ks = [...m[1].matchAll(/"([^"]+)"\s*:/g)].map(x => x[1]);
  const seen = {};
  ks.forEach(k => { if (seen[k]) bad(`island #${i + 1}: part ${k} has two owners`); seen[k] = 1; });
});

// islands
const ids = IS.islands.map(i => i.id);
for (const I of IS.islands) {
  const parts = Object.entries(I.parts);
  const owners = {};
  for (const [part, id] of parts) {
    if (!id) { bad(`${I.id}: part ${part} has no owner`); continue; }
    const s = byId[id];
    if (!s) { bad(`${I.id}: part ${part} owner ${id} is not a species`); continue; }
    if (owners[id]) bad(`${I.id}: ${id} owns two parts (${owners[id]}, ${part})`);
    owners[id] = part;
    if (!sub(s.elements, I.elements)) bad(`${I.id}: ${id} (${s.elements.join('+')}) does not fit the island's elements`);
    if (s.home && s.home !== I.id && !I.stage) bad(`${I.id}: ${id} lives only on ${s.home}`);
  }
  if (I.next && !ids.includes(I.next)) bad(`${I.id}: next island ${I.next} does not exist`);
  if (!I.stage) {
    // every species that fits must live here, with the MSM shape
    const fits = SP.species.filter(s => sub(s.elements, I.elements) && (!s.home || s.home === I.id));
    for (const s of fits) if (!owners[s.id]) bad(`${I.id}: ${s.id} fits the island but owns no part`);
    const tiers = [0, 0, 0, 0, 0];
    Object.keys(owners).forEach(id => tiers[byId[id].tier]++);
    if (parts.length !== 15 || tiers.slice(1).join() !== '4,6,4,1') bad(`${I.id}: ${parts.length} parts, tiers ${tiers.slice(1).join('/')}, want 15 as 4/6/4/1`);
  } else {
    for (const id of Object.keys(owners)) if (byId[id].tier < 4) bad(`${I.id}: ${id} is not a lead (the stage holds quads and the quint)`);
  }
  // audio: which parts exist today
  if (I.audio) {
    const f = join(root, I.audio, 'stems.json');
    if (!existsSync(f)) { notes.push(`${I.id}: no ${I.audio}stems.json yet`); continue; }
    const have = Object.keys(JSON.parse(readFileSync(f, 'utf8')).stems).map(k => k.replace(/^voice_voice_/, 'voice_'));
    const coming = Object.keys(I.parts).filter(p => !have.includes(p));
    const unused = have.filter(p => !(p in I.parts));
    notes.push(`${I.id}: ${Object.keys(I.parts).length - coming.length} parts in the song${coming.length ? ', coming: ' + coming.join(' ') : ''}${unused.length ? ', not used: ' + unused.join(' ') : ''}`);
  }
}
// every species lives somewhere
for (const s of SP.species) if (!IS.islands.some(I => Object.values(I.parts).includes(s.id))) bad(`${s.id} lives on no island`);

// economy
for (const [id] of Object.entries(EC.shop.singles)) if (!byId[id] || byId[id].tier !== 1) bad(`shop sells ${id}, which is not a single`);
for (const s of SP.species.filter(s => s.tier === 1)) if (!(s.id in EC.shop.singles)) bad(`single ${s.id} has no shop price`);
const L = EC.levels;
if (!Array.isArray(L.treats_per_feed) || L.treats_per_feed.length !== L.max) bad(`levels.treats_per_feed needs ${L.max} entries`);
if (!(L.feeds_per_level >= 1)) bad('levels.feeds_per_level missing');
if (!(L.breed_gate >= 1 && L.breed_gate <= L.max)) bad('levels.breed_gate out of range');
for (const t of ['1', '2', '3', '4']) {
  for (const m of ['real', 'fast']) {
    if (!(EC.breeding.times.breed[m][t] > 0) || !(EC.breeding.times.hatch[m][t] > 0)) bad(`breeding time missing for tier ${t} (${m})`);
  }
}
for (const r of EC.bakery.recipes) if (!(r.real > 0 && r.fast > 0 && r.coins > 0 && r.treats > 0)) bad(`bakery recipe ${r.id} is incomplete`);
const pl = EC.structures.castle.levels.map(l => l.plots);
if (pl.join() !== '6,10,15') bad(`castle plots ${pl.join()}, want 6,10,15`);

notes.forEach(n => console.log('  ' + n));
if (errs.length) { console.log(`check_data: ${errs.length} problem(s)`); errs.forEach(e => console.log('  FAIL ' + e)); process.exit(1); }
console.log(`check_data: ok (${SP.species.length} species, ${IS.islands.length} islands)`);
