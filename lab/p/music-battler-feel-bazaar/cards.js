// The Bazaar, ported: Vanessa's items (game data v5.0.0, docs/research/families/bazaar.json) as the Tide Captain's
// instruments. Names and stage text from docs/design/model-game.md section 5 (the 53 Bronze-start items); the Silver,
// Gold and Diamond starters are ours, mapped the same way. Numbers per tier are the game's.
// Terms: Hit = Damage, Hold = Shield, Swell = Heal, Sustain = Regen, Feedback = Burn, Dissonance = Poison,
// Accent = Crit, Double time = Haste, Half time = Slow, Rest = Freeze, Pickup = Charge, Repeat = Multicast, Takes = Ammo.
// Tags: Strike = Weapon, Gear = Tool, Electric = Tech, Heirloom = Relic, Player = Friend, Rider = Food,
// Fixture = Property, Tide = Aquatic, Stagewear = Apparel, Tour = Vehicle, Noisemaker = Toy, Beam = Ray.
// Fields: size 1/2/3, start tier (0 Bronze .. 3 Diamond), type = the musician who plays it (art and sound part),
// hit = its note when it fires, cd = cooldown seconds per tier, am = takes, mc = repeat, crit = base Accent %,
// x4 = "its Accents count double again", dmg/sh/hl/bn/ps = base Hit/Hold/Swell/Feedback/Dissonance per tier,
// st = statuses it causes (for Storm Glass). Arrays run from the card's start tier.
(function () {
  "use strict";
  var C = [];
  function card(o) { C.push(o); }
  function adjHas(c, tag) { return c.adj().filter(function (x) { return x.card.tags.indexOf(tag) >= 0; }); }

  // ---------------- Bronze (Vanessa's 53 Bronze-start items) ----------------
  card({ id: "barrel", bz: "Barrel", name: "Harbor Tuba", size: 2, tags: [], start: 0, type: "bass", hit: "R",
    cd: [6], sh: [20], text: "Hold 20. When a neighbour plays, +10/20/30/40 Hold this fight.",
    on: { use: function (c, d) { if (c.isAdj(d.item)) c.gainF(c.item, "sh", c.v([10, 20, 30, 40])); } } });
  card({ id: "clamera", bz: "Clamera", name: "Conch Horn", size: 1, tags: ["Tide"], start: 0, type: "voice", hit: "T0",
    cd: [7, 6, 5, 4], st: ["slow"], text: "Plays on the first beat of the fight. Half time on 1 rival instrument for 2 s (4 beats).",
    use: function (c) { c.slowFoe(1, 2); }, on: { fightStart: function (c) { c.useNow(); } } });
  card({ id: "preserver", bz: "Life Preserver", name: "Buoy Bell", size: 2, tags: ["Tide"], start: 0, type: "arp", hit: "T0",
    cd: [7], sh: [10, 20, 40, 80], text: "Hold 10/20/40/80. The first time your bandleader would fall each fight, Swell 200/600/1200/2000.",
    on: { defeat: function (c) { if (c.item.fs.saved) return false; c.item.fs.saved = 1; c.healRaw(c.v([200, 600, 1200, 2000])); return true; } } });
  card({ id: "pearl", bz: "Pearl", name: "Pearl Chimes", size: 1, tags: ["Tide"], start: 0, type: "arp", hit: "T2+12",
    cd: [5], sh: [10, 20, 30, 40], text: "Hold 10/20/30/40. When another Tide instrument plays, Pickup 1 s (2 beats) on this.",
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Tide") >= 0) c.charge([c.item], 1); } } });
  card({ id: "seashell", bz: "Sea Shell", name: "Shell Shaker", size: 1, tags: ["Tide"], start: 0, type: "drums", hit: "hat",
    cd: [6], text: "Hold 10/15/20/25 for each Tide instrument you have.",
    use: function (c) { c.shield(c.v([10, 15, 20, 25]) * c.count(function (x) { return x.card.tags.indexOf("Tide") >= 0; })); } });
  card({ id: "seaweed", bz: "Seaweed", name: "Kelp Harp", size: 1, tags: ["Tide"], start: 0, type: "arp", hit: "T1+12",
    cd: [7], hl: [20], text: "Swell 20. When a Tide instrument plays, +5/10/15/20 Swell this fight.",
    on: { use: function (c, d) { if (d.item.card.tags.indexOf("Tide") >= 0) c.gainF(c.item, "hl", c.v([5, 10, 15, 20])); } } });
  card({ id: "vents", bz: "Volcanic Vents", name: "Vent Calliope", size: 2, tags: ["Tide"], start: 0, type: "voice", hit: "T0+12",
    cd: [7], mc: [3], bn: [3, 6, 9, 12], st: ["burn"], text: "Feedback 3/6/9/12. Repeat 3." });
  card({ id: "coralarmor", bz: "Coral Armor", name: "Coral Cello", size: 2, tags: ["Tide", "Stagewear", "Heirloom"], start: 0, type: "strings", hit: "CH",
    cd: [6], sh: [50], text: "Hold 50. When you buy another Tide instrument, +10/20/30/40 Hold for good.",
    run: { buyOther: function (r, it, b) { if (b.card.tags.indexOf("Tide") >= 0) it.perm.sh = (it.perm.sh || 0) + val(it, [10, 20, 30, 40]); } } });
  card({ id: "wetware", bz: "Wetware", name: "Wet Synth Pad", size: 2, tags: ["Tide", "Stagewear", "Electric"], start: 0, type: "strings", hit: "CH",
    cd: [8], sh: [10], text: "Hold 10. When a Strike plays, +15/25/35/45 Hold this fight. With another Electric instrument its loop is 2 s (4 beats) shorter.",
    aura: function (c) { if (c.count(function (x) { return x !== c.item && x.card.tags.indexOf("Electric") >= 0; })) c.item.st.cdFlat -= 2; },
    on: { use: function (c, d) { if (d.item.card.tags.indexOf("Strike") >= 0) c.gainF(c.item, "sh", c.v([15, 25, 35, 45])); } } });
  card({ id: "chum", bz: "Chum", name: "Fish Fry", size: 1, tags: ["Tide", "Rider"], start: 0, type: "drums", hit: "rim",
    cd: [4], text: "Your Tide instruments +3/6/9/12% Accent chance this fight. Buying it brings a Piranha Drummer.",
    use: function (c) { var n = c.v([3, 6, 9, 12]); c.mine(function (x) { return x.card.tags.indexOf("Tide") >= 0; }).forEach(function (x) { c.gainF(x, "crit", n); }); },
    run: { buySelf: function (r) { r.give("piranha", 0); } } });
  card({ id: "catfish", bz: "Catfish", name: "Catfish Bassist", size: 1, tags: ["Tide", "Player"], start: 0, type: "bass", hit: "R",
    cd: [5], ps: [3], st: ["poison"], text: "Dissonance 3. When it gets double time, +2/4/6/8 Dissonance this fight.",
    on: { hasted: function (c) { c.gainF(c.item, "ps", c.v([2, 4, 6, 8])); } } });
  card({ id: "jellyfish", bz: "Jellyfish", name: "Jelly Thereminist", size: 1, tags: ["Tide", "Player"], start: 0, type: "voice", hit: "T2+12",
    cd: [7], ps: [3, 6, 9, 12], st: ["poison"], text: "Dissonance 3/6/9/12. When a Tide neighbour plays, double time on this for 1/2/3/4 s.",
    on: { use: function (c, d) { if (c.isAdj(d.item) && d.item.card.tags.indexOf("Tide") >= 0) c.haste([c.item], c.v([1, 2, 3, 4])); } } });
  card({ id: "yeticrab", bz: "Yeti Crab", name: "Crab Castanets", size: 1, tags: ["Tide", "Player"], start: 0, type: "drums", hit: "rim",
    cd: [7], st: ["freeze"], text: "Rest 1 rival instrument for 1 s (2 beats). When you cause a Rest, its Dissonance neighbours gain +2/4/6/8 Dissonance this fight.",
    use: function (c) { c.freezeFoe(1, 1); },
    on: { froze: function (c) { var n = c.v([2, 4, 6, 8]); c.adj().forEach(function (x) { if (x.card.ps || (x.card.st || []).indexOf("poison") >= 0) c.gainF(x, "ps", n); }); } } });
  card({ id: "illusoray", bz: "IllusoRay", name: "Lanternfish Glock", size: 1, tags: ["Tide", "Player", "Beam"], start: 0, type: "keys", hit: "T2+12",
    cd: [7], st: ["slow"], text: "Half time on 1 rival instrument for 1/2/3/4 s. +1 Repeat for each Player or Beam neighbour.",
    aura: function (c) { c.item.st.mc += c.adj().filter(function (x) { return x.card.tags.indexOf("Player") >= 0 || x.card.tags.indexOf("Beam") >= 0; }).length; },
    use: function (c) { c.slowFoe(1, c.v([1, 2, 3, 4])); } });
  card({ id: "cove", bz: "Cove", name: "Sea Cave Organ", size: 3, tags: ["Tide", "Fixture"], start: 0, type: "strings", hit: "CH",
    cd: [4], text: "Hold equal to 1/2/3/4 times its value. When you sell an instrument, +1/1/1/2 value.",
    use: function (c) { c.shield(c.v([1, 2, 3, 4]) * c.value(c.item)); },
    run: { sellOther: function (r, it) { it.perm.value = (it.perm.value || 0) + val(it, [1, 1, 1, 2]); } } });
  card({ id: "ambergris", bz: "Ambergris", name: "Amber Music Box", size: 1, tags: ["Tide", "Heirloom"], start: 0, type: "keys", hit: "T0+12",
    cd: [4], text: "Swell equal to 1/2/3/4 times its value. When you buy another Tide instrument, +1/2/3/4 value.",
    use: function (c) { c.heal(c.v([1, 2, 3, 4]) * c.value(c.item)); },
    run: { buyOther: function (r, it, b) { if (b.card.tags.indexOf("Tide") >= 0) it.perm.value = (it.perm.value || 0) + val(it, [1, 2, 3, 4]); } } });
  card({ id: "coral", bz: "Coral", name: "Coral Handbell", size: 1, tags: ["Tide", "Heirloom"], start: 0, type: "arp", hit: "T0+12",
    cd: [6], hl: [20], text: "Swell 20. When you buy a Tide instrument, +5/10/15/20 Swell for good.",
    run: { buyOther: function (r, it, b) { if (b.card.tags.indexOf("Tide") >= 0) it.perm.hl = (it.perm.hl || 0) + val(it, [5, 10, 15, 20]); } } });
  card({ id: "fishingnet", bz: "Fishing Net", name: "Choke Cymbal", size: 2, tags: ["Tide", "Gear"], start: 0, type: "drums", hit: "crash",
    cd: [6], st: ["slow"], text: "Half time on 1/2/3/4 rival instruments for 2 s (4 beats). Each night, brings a Piranha Drummer.",
    use: function (c) { c.slowFoe(c.v([1, 2, 3, 4]), 2); }, run: { day: function (r) { r.give("piranha", 0); } } });
  card({ id: "fishingrod", bz: "Fishing Rod", name: "Tide Metronome", size: 2, tags: ["Tide", "Gear"], start: 0, type: "drums", hit: "rim",
    cd: [5], text: "Double time on the Tide instrument to its right for 2 s (4 beats). Each night, brings a Small Tide instrument.",
    use: function (c) { var r = c.right(); if (r && r.card.tags.indexOf("Tide") >= 0) c.haste([r], 2); },
    run: { day: function (r) { r.giveRandom(function (k) { return k.size === 1 && k.tags.indexOf("Tide") >= 0 && k.start === 0; }); } } });
  card({ id: "beachball", bz: "Beach Ball", name: "Steel Pan", size: 2, tags: ["Tide", "Noisemaker"], start: 0, type: "keys", hit: "T1+12",
    cd: [5], text: "Double time on 2/3/4/5 Tide or Noisemaker instruments for 2 s (4 beats).",
    use: function (c) { c.haste(c.pick(c.mine(function (x) { return x !== c.item && (x.card.tags.indexOf("Tide") >= 0 || x.card.tags.indexOf("Noisemaker") >= 0); }), c.v([2, 3, 4, 5])), 2); } });
  card({ id: "sharkclaws", bz: "Sharkclaws", name: "Shark Toms", size: 2, tags: ["Tide", "Strike"], start: 0, type: "taiko", hit: "tom",
    cd: [6], dmg: [10, 20, 30, 40], text: "Hit 10/20/30/40. Your other Strike instruments +10/20/30/40 Hit this fight.",
    use: function (c) { var n = c.v([10, 20, 30, 40]); c.mine(function (x) { return x !== c.item && x.card.tags.indexOf("Strike") >= 0; }).forEach(function (x) { c.gainF(x, "dmg", n); }); } });
  card({ id: "mantis", bz: "Mantis Shrimp", name: "Shrimp Snapper", size: 1, tags: ["Tide", "Strike", "Player"], start: 0, type: "drums", hit: "snare",
    cd: [9], am: [2], dmg: [20], bn: [2], st: ["burn"], text: "2 takes. Hit 20, Feedback 2. When you cause half time, +10/15/20/25 Hit and +2/3/4/5 Feedback this fight.",
    on: { slowed: function (c) { c.gainF(c.item, "dmg", c.v([10, 15, 20, 25])); c.gainF(c.item, "bn", c.v([2, 3, 4, 5])); } } });
  card({ id: "narwhal", bz: "Narwhal", name: "Narwhal Hats", size: 1, tags: ["Tide", "Strike", "Player"], start: 0, type: "drums", hit: "hat",
    cd: [3], dmg: [5, 10, 15, 20], text: "Hit 5/10/15/20." });
  card({ id: "piranha", bz: "Piranha", name: "Piranha Drummer", size: 1, tags: ["Tide", "Strike", "Player"], start: 0, type: "drums", hit: "snare",
    cd: [6], dmg: [6, 12, 18, 24], crit: 20, x4: 1, text: "Hit 6/12/18/24. 20% Accent chance; its Accents count double again." });
  card({ id: "zoarcid", bz: "Zoarcid", name: "Eel Bassist", size: 1, tags: ["Tide", "Strike", "Player"], start: 0, type: "bass", hit: "R+12",
    cd: [8, 7, 6, 5], dmg: [20], text: "Hit 20; double time on its neighbours for 2 s (4 beats). When you cause Feedback, Pickup 1 s on this.",
    use: function (c) { c.haste(c.adj(), 2); }, on: { burned: function (c) { c.charge([c.item], 1); } } });
  card({ id: "sharkray", bz: "Sharkray", name: "Ray Guitarist", size: 2, tags: ["Tide", "Strike", "Player", "Beam"], start: 0, type: "lead", hit: "POW",
    cd: [6], dmg: [20], text: "Hit 20. When you cause double time, +10/20/30/40 Hit this fight.",
    on: { hasted: function (c) { }, hasteAny: function (c) { c.gainF(c.item, "dmg", c.v([10, 20, 30, 40])); } } });
  card({ id: "peskypete", bz: "Pesky Pete", name: "Pesky Piper", size: 1, tags: ["Player"], start: 0, type: "voice", hit: "T2+12",
    cd: [8, 7, 6, 5], bn: [2], st: ["burn"], text: "Feedback 2. +1 Repeat for each Player or Fixture neighbour.",
    aura: function (c) { c.item.st.mc += c.adj().filter(function (x) { return x.card.tags.indexOf("Player") >= 0 || x.card.tags.indexOf("Fixture") >= 0; }).length; } });
  card({ id: "calico", bz: "Calico", name: "Calico Fiddler", size: 1, tags: ["Player", "Strike"], start: 0, type: "strings", hit: "T1+12",
    cd: [7], dmg: [15, 30, 45, 60], x4: 1, text: "Hit 15/30/45/60. When another Strike plays, +5/10/15/20% Accent chance this fight; its Accents count double again.",
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Strike") >= 0) c.gainF(c.item, "crit", c.v([5, 10, 15, 20])); } } });
  card({ id: "honingsteel", bz: "Honing Steel", name: "Tuning Fork", size: 1, tags: ["Gear"], start: 0, type: "arp", hit: "T0+12",
    cd: [4], text: "The Strike to its right +6/12/18/24 Hit this fight.",
    use: function (c) { var r = c.right(); if (r && r.card.tags.indexOf("Strike") >= 0) c.gainF(r, "dmg", c.v([6, 12, 18, 24])); } });
  card({ id: "lighter", bz: "Lighter", name: "Fuzz Pedal", size: 1, tags: ["Gear"], start: 0, type: "lead", hit: "T0+12",
    cd: [3], bn: [3, 5, 7, 9], st: ["burn"], text: "Feedback 3/5/7/9." });
  card({ id: "powderhorn", bz: "Powder Horn", name: "Stick Bag", size: 1, tags: ["Gear"], start: 0, type: "drums", hit: "rim",
    cd: [4], text: "The instrument to its right gets 1/2/3/4 more takes.",
    use: function (c) { var r = c.right(); if (r && r.ammoMax) c.reload(r, c.v([1, 2, 3, 4])); } });
  card({ id: "starchart", bz: "Star Chart", name: "Old Setlist", size: 2, tags: ["Gear", "Heirloom"], start: 0, type: "keys", hit: null,
    cd: null, text: "No loop. Neighbours +10/15/20/25% Accent chance and loops 5/10/15/20% shorter.",
    aura: function (c) { var a = c.v([10, 15, 20, 25]), p = c.v([5, 10, 15, 20]); c.adj().forEach(function (x) { x.st.crit += a; x.st.cdPct += p; }); } });
  card({ id: "popsnappers", bz: "Pop Snappers", name: "Snap Poppers", size: 1, tags: ["Noisemaker"], start: 0, type: "drums", hit: "clap",
    cd: [3], am: [4], bn: [4, 6, 8, 10], st: ["burn"], text: "4 takes. Feedback 4/6/8/10." });
  card({ id: "bayonet", bz: "Bayonet", name: "Crash Cymbal", size: 1, tags: ["Strike"], start: 0, type: "drums", hit: "crash",
    cd: null, dmg: [10, 15, 20, 25], text: "No loop. When the Strike to its left plays, Hit 10/15/20/25.",
    on: { use: function (c, d) { var l = c.left(); if (l && d.item === l && l.card.tags.indexOf("Strike") >= 0) { c.dmg(c.dmgOf(c.item)); c.ping(); } } } });
  card({ id: "bolas", bz: "Bolas", name: "Bongo Pair", size: 1, tags: ["Strike"], start: 0, type: "taiko", hit: "tom",
    cd: [4], am: [2], dmg: [20, 40, 60, 80], st: ["slow"], text: "2 takes. Hit 20/40/60/80; half time on 1 rival instrument for 2/3/4/5 s.",
    use: function (c) { c.slowFoe(1, c.v([2, 3, 4, 5])); } });
  card({ id: "cannon", bz: "Cannon", name: "Cannon Bass Drum", size: 2, tags: ["Strike"], start: 0, type: "taiko", hit: "kick",
    cd: [4], am: [2], dmg: [40, 60, 80, 100], st: ["burn"], text: "2 takes. Hit 40/60/80/100; Feedback equal to 10% of the Hit.",
    use: function (c) { c.burn(Math.floor(c.dmgOf(c.item) * 0.1)); } });
  card({ id: "cutlass", bz: "Cutlass", name: "Twin Snare", size: 2, tags: ["Strike"], start: 0, type: "drums", hit: "snare",
    cd: [5], mc: [2], dmg: [10, 20, 30, 40], x4: 1, text: "Hit 10/20/30/40, Repeat 2; its Accents count double again." });
  card({ id: "doublebarrel", bz: "Double Barrel", name: "Double Kick", size: 2, tags: ["Strike"], start: 0, type: "drums", hit: "kick",
    cd: [4], am: [2], mc: [2], dmg: [20, 40, 60, 80], text: "2 takes. Hit 20/40/60/80, Repeat 2." });
  card({ id: "grapeshot", bz: "Grapeshot", name: "Shot Woodblock", size: 1, tags: ["Strike"], start: 0, type: "drums", hit: "rim",
    cd: [4], am: [1], dmg: [20, 30, 40, 50], text: "1 take. Hit 20/30/40/50. When another instrument with takes plays, it gets 1 take back.",
    on: { use: function (c, d) { if (d.item !== c.item && d.item.ammoMax) c.reload(c.item, 1); } } });
  card({ id: "grenade", bz: "Grenade", name: "Tam-tam", size: 1, tags: ["Strike"], start: 0, type: "taiko", hit: "crash",
    cd: [5], am: [1], dmg: [50, 100, 150, 200], crit: 25, text: "1 take. Hit 50/100/150/200; 25% Accent chance." });
  card({ id: "handaxe", bz: "Handaxe", name: "Frame Drum", size: 1, tags: ["Strike"], start: 0, type: "taiko", hit: "tom",
    cd: [6], dmg: [10, 15, 20, 25], text: "Hit 10/15/20/25. Your Strike instruments +6/9/12/15 Hit.",
    aura: function (c) { var n = c.v([6, 9, 12, 15]); c.mine(function (x) { return x.card.tags.indexOf("Strike") >= 0; }).forEach(function (x) { x.st.dmg += n; }); } });
  card({ id: "katana", bz: "Katana", name: "Ride Cymbal", size: 2, tags: ["Strike"], start: 0, type: "drums", hit: "ride",
    cd: [2], dmg: [5, 10, 15, 20], text: "Hit 5/10/15/20." });
  card({ id: "revolver", bz: "Revolver", name: "Timbales", size: 1, tags: ["Strike"], start: 0, type: "taiko", hit: "tom",
    cd: [3], am: [6], dmg: [8, 16, 24, 32], text: "6 takes. Hit 8/16/24/32." });
  card({ id: "rifle", bz: "Rifle", name: "Rimshot Snare", size: 2, tags: ["Strike"], start: 0, type: "drums", hit: "snare",
    cd: [3], am: [1], dmg: [20, 40, 60, 80], text: "1 take. Hit 20/40/60/80, then +20/40/60/80 Hit this fight.",
    use: function (c) { c.gainF(c.item, "dmg", c.v([20, 40, 60, 80])); } });
  card({ id: "shuriken", bz: "Shuriken", name: "Tambourine Roll", size: 1, tags: ["Strike"], start: 0, type: "drums", hit: "ohat",
    cd: [8], am: [3, 4, 5, 6], dmg: [5, 10, 15, 20], roll: 1, text: "3/4/5/6 takes. Hits 5/10/15/20 once for each take left, then spends them all." });
  card({ id: "switchblade", bz: "Switchblade", name: "Claves", size: 1, tags: ["Strike"], start: 0, type: "drums", hit: "rim",
    cd: [4], dmg: [4, 8, 12, 16], text: "Hit 4/8/12/16. When a Strike neighbour plays, that neighbour +4/8/12/16 Hit this fight.",
    on: { use: function (c, d) { if (c.isAdj(d.item) && d.item.card.tags.indexOf("Strike") >= 0) c.gainF(d.item, "dmg", c.v([4, 8, 12, 16])); } } });
  card({ id: "tinycutlass", bz: "Tiny Cutlass", name: "Piccolo Snare", size: 1, tags: ["Strike"], start: 0, type: "drums", hit: "snare",
    cd: [6], mc: [2], dmg: [6, 12, 24, 48], x4: 1, text: "Hit 6/12/24/48, Repeat 2; its Accents count double again." });
  card({ id: "shoeblade", bz: "Shoe Blade", name: "Tap Shoes", size: 1, tags: ["Strike", "Stagewear"], start: 0, type: "drums", hit: "rim",
    cd: [6], dmg: [20, 40, 60, 80], firstCrit: 1, text: "Hit 20/40/60/80; its first play each fight is always an Accent." });
  card({ id: "petrock", bz: "Pet Rock", name: "Stone Rattle Kid", size: 1, tags: ["Strike", "Player", "Noisemaker"], start: 0, type: "drums", hit: "hat",
    cd: [6], dmg: [8, 16, 24, 32], text: "Hit 8/16/24/32. If it is your only Player, your instruments +10/15/20/25% Accent chance.",
    aura: function (c) { if (c.count(function (x) { return x.card.tags.indexOf("Player") >= 0; }) === 1) { var n = c.v([10, 15, 20, 25]); c.mine(function () { return true; }).forEach(function (x) { x.st.crit += n; }); } } });
  card({ id: "langxian", bz: "Langxian", name: "War Horn", size: 2, tags: ["Strike", "Heirloom"], start: 0, type: "choir", hit: "R+12",
    cd: [10], dmg: [40], text: "Hit 40. Each battle won with it: +40/60/80/100 Hit for good.",
    run: { win: function (r, it) { it.perm.dmg = (it.perm.dmg || 0) + val(it, [40, 60, 80, 100]); } } });
  card({ id: "cybersai", bz: "Cyber-Sai", name: "Drum Machine", size: 2, tags: ["Strike", "Electric"], start: 0, type: "drums", hit: "clap",
    cd: [3], dmg: [10, 20, 30, 40], text: "Hit 10/20/30/40. Its first 2/3/4/5 Accents each fight make your bandleader take no hits for 1 s (2 beats).",
    on: { critSelf: function (c) { if ((c.item.fs.cs || 0) < c.v([2, 3, 4, 5])) { c.item.fs.cs = (c.item.fs.cs || 0) + 1; c.me.invuln = Math.max(c.me.invuln, 1); } } } });
  card({ id: "grapplinghook", bz: "Grappling Hook", name: "Slapstick", size: 1, tags: ["Strike", "Gear"], start: 0, type: "drums", hit: "clap",
    cd: [7], dmg: [20, 40, 60, 80], st: ["slow"], text: "Hit 20/40/60/80; half time on 1/2/3/4 rival instruments for 1 s (2 beats).",
    use: function (c) { c.slowFoe(c.v([1, 2, 3, 4]), 1); } });
  card({ id: "shovel", bz: "Shovel", name: "Washboard", size: 2, tags: ["Strike", "Gear"], start: 0, type: "drums", hit: "hat",
    cd: [5], dmg: [20, 40, 60, 80], text: "Hit 20/40/60/80. Each night, brings a Small instrument.",
    run: { day: function (r) { r.giveRandom(function (k) { return k.size === 1 && k.start === 0; }); } } });

  // ---------------- Silver starters (Vanessa's Silver items) ----------------
  card({ id: "butterfly", bz: "Butterfly Swords", name: "Twin Sticks", size: 1, tags: ["Strike"], start: 1, type: "drums", hit: "snare",
    cd: [7, 6, 5], mc: [2, 3, 4], dmg: [10], text: "Hit 10. Repeat 2/3/4." });
  card({ id: "jitte", bz: "Jitte", name: "Brush Snare", size: 1, tags: ["Strike"], start: 1, type: "drums", hit: "snare",
    cd: [5], dmg: [20], st: ["slow"], text: "Hit 20. Half time on 1 rival instrument for 1/2/3 s. When you cause half time, +10/20/30 Hit this fight.",
    use: function (c) { c.slowFoe(1, c.v([1, 2, 3])); }, on: { slowed: function (c) { c.gainF(c.item, "dmg", c.v([10, 20, 30])); } } });
  card({ id: "icepick", bz: "Ice Pick", name: "Triangle", size: 1, tags: ["Strike", "Gear"], start: 1, type: "arp", hit: "T2+12",
    cd: [5], dmg: [25], st: ["freeze"], text: "Hit 25. Rest 1 rival instrument for 1 s. When you cause a Rest, +15/30/45 Hit this fight.",
    use: function (c) { c.freezeFoe(1, 1); }, on: { froze: function (c) { c.gainF(c.item, "dmg", c.v([15, 30, 45])); } } });
  card({ id: "turtleshell", bz: "Turtle Shell", name: "Shell Gong", size: 2, tags: ["Tide"], start: 1, type: "taiko", hit: "crash",
    cd: [10], sh: [25], text: "Hold 25. Your Hold instruments +10/15/20 Hold this fight. When another non-Strike plays, Pickup 2 s on this.",
    use: function (c) { var n = c.v([10, 15, 20]); c.mine(function (x) { return !!x.card.sh; }).forEach(function (x) { c.gainF(x, "sh", n); }); },
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Strike") < 0) c.charge([c.item], 2); } } });
  card({ id: "pufferfish", bz: "Pufferfish", name: "Puffer Piper", size: 2, tags: ["Tide", "Player"], start: 1, type: "voice", hit: "T1+12",
    cd: [8, 7, 6], ps: [10, 20, 30], st: ["poison"], text: "Dissonance 10/20/30. When you cause double time, Pickup 2 s on this.",
    on: { hasteAny: function (c) { c.charge([c.item], 2); } } });
  card({ id: "angler", bz: "Darkwater Anglerfish", name: "Angler Organist", size: 2, tags: ["Player", "Tide"], start: 1, type: "strings", hit: "CH",
    cd: [8, 7, 6], bn: [10, 20, 30], st: ["burn"], text: "Feedback 10/20/30. When you cause half time, Pickup 2 s on this.",
    on: { slowed: function (c) { c.charge([c.item], 2); } } });
  card({ id: "richardson", bz: "Mr. Richardson", name: "Barnacle Cellist", size: 1, tags: ["Player", "Tide"], start: 1, type: "strings", hit: "R+12",
    cd: [6], sh: [30], text: "Hold 30. When you cause double time or half time, +5/10/15 Hold this fight.",
    on: { hasteAny: function (c) { c.gainF(c.item, "sh", c.v([5, 10, 15])); }, slowed: function (c) { c.gainF(c.item, "sh", c.v([5, 10, 15])); } } });
  card({ id: "docklines", bz: "Dock Lines", name: "Damper Pedal", size: 2, tags: ["Gear", "Tide"], start: 1, type: "keys", hit: "CH",
    cd: [4], st: ["slow"], text: "Half time on 2/3/4 rival instruments for 3 s.",
    use: function (c) { c.slowFoe(c.v([2, 3, 4]), 3); } });
  card({ id: "astrolabe", bz: "Astrolabe", name: "Baton", size: 2, tags: ["Gear"], start: 1, type: "arp", hit: "T0+12",
    cd: [6], text: "Double time on 2/3/4 instruments for 1 s. When another non-Strike plays, Pickup 1 s on this.",
    use: function (c) { c.haste(c.pick(c.mine(function (x) { return x !== c.item; }), c.v([2, 3, 4])), 1); },
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Strike") < 0) c.charge([c.item], 1); } } });
  card({ id: "submarine", bz: "Submarine", name: "Deep Drum Rig", size: 3, tags: ["Tide", "Strike", "Tour", "Electric"], start: 1, type: "drums", hit: "kick",
    cd: [4, 3, 2], dmg: [50], text: "Hit 50. Hold equal to its Hit.",
    use: function (c) { c.shield(c.dmgOf(c.item)); } });
  card({ id: "trebuchet", bz: "Trebuchet", name: "Siege Timpani", size: 3, tags: ["Strike"], start: 1, type: "taiko", hit: "kick",
    cd: [10], dmg: [75, 150, 250], bn: [5, 15, 25], st: ["burn"], text: "Hit 75/150/250, Feedback 5/15/25. When another Strike plays or you cause double time, Pickup 2 s on this.",
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Strike") >= 0) c.charge([c.item], 2); }, hasteAny: function (c) { c.charge([c.item], 2); } } });
  card({ id: "weatherglass", bz: "Weather Glass", name: "Storm Glass Harp", size: 2, tags: ["Gear"], start: 1, type: "arp", hit: "CH",
    cd: [7, 6, 5], bn: [4], ps: [4], st: ["burn", "poison"], text: "Feedback 4, Dissonance 4. +1 Repeat for each other instrument with Feedback, Dissonance, half time or Rest.",
    aura: function (c) { c.item.st.mc += c.count(function (x) { return x !== c.item && (x.card.st || []).length > 0; }); } });
  card({ id: "korxena", bz: "Korxena Crest", name: "Band Crest", size: 1, tags: ["Stagewear", "Heirloom"], start: 1, type: "singer", hit: null,
    cd: null, text: "No loop. Your instruments +15/25/35% Accent chance.",
    aura: function (c) { var n = c.v([15, 25, 35]); c.mine(function () { return true; }).forEach(function (x) { x.st.crit += n; }); } });
  card({ id: "dagger", bz: "Concealed Dagger", name: "Tip Jar Snare", size: 1, tags: ["Strike"], start: 1, type: "drums", hit: "snare",
    cd: [9], dmg: [30, 40, 50], text: "Hit 30/40/50. Gain 1/2/3 gold.",
    use: function (c) { c.gold(c.v([1, 2, 3])); } });
  card({ id: "saltclaw", bz: "Old Saltclaw", name: "Old Salt Drummer", size: 1, tags: ["Tide", "Player", "Strike"], start: 1, type: "drums", hit: "snare",
    cd: [6], dmg: [30], text: "Hit 30. When you cause double time or half time, +5/10/15 Hit this fight.",
    on: { hasteAny: function (c) { c.gainF(c.item, "dmg", c.v([5, 10, 15])); }, slowed: function (c) { c.gainF(c.item, "dmg", c.v([5, 10, 15])); } } });
  card({ id: "squid", bz: "Vampire Squid", name: "Squid Crooner", size: 1, tags: ["Tide", "Strike", "Player"], start: 1, type: "singer", hit: "T0+12",
    cd: [5], dmg: [15, 30, 45], steal: 1, text: "Hit 15/30/45 and Swell what it hits. +Hit equal to its Accent chance." });
  card({ id: "waterwheel", bz: "Water Wheel", name: "Wheel Organ", size: 3, tags: ["Tide", "Fixture"], start: 1, type: "strings", hit: "CH",
    cd: [8, 7, 6], text: "Double time on your other instruments for 2 s. When a neighbour plays, Pickup 2 s on this.",
    use: function (c) { c.haste(c.mine(function (x) { return x !== c.item; }), 2); },
    on: { use: function (c, d) { if (c.isAdj(d.item)) c.charge([c.item], 2); } } });

  // ---------------- Gold starters ----------------
  card({ id: "tortuga", bz: "Tortuga", name: "Turtle Tour Bus", size: 3, tags: ["Tide", "Player", "Tour", "Strike"], start: 2, type: "choir", hit: "CH",
    cd: [12, 10], dmg: [450, 900], text: "Hit 450/900. Double time on your other instruments for 1 s. When another Player plays, Pickup 2 s on this.",
    use: function (c) { c.haste(c.mine(function (x) { return x !== c.item; }), 1); },
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Player") >= 0) c.charge([c.item], 2); } } });
  card({ id: "eels", bz: "Electric Eels", name: "Eel Synth Rig", size: 3, tags: ["Tide", "Strike", "Player"], start: 2, type: "lead", hit: "POW",
    cd: [7, 6], dmg: [100], st: ["slow"], text: "Hit 100. Half time on 1 rival instrument for 1 s. When a rival instrument plays, Pickup 2 s on this.",
    use: function (c) { c.slowFoe(1, 1); }, on: { foeUse: function (c) { c.charge([c.item], 2); } } });
  card({ id: "sniper", bz: "Sniper Rifle", name: "Lone Trumpet", size: 2, tags: ["Strike"], start: 2, type: "singer", hit: "T2+12",
    cd: [9], dmg: [100], text: "Hit 100. Hits 5/10 times harder if it is your only Strike.",
    dmgMul: function (c) { return c.count(function (x) { return x.card.tags.indexOf("Strike") >= 0; }) === 1 ? c.v([5, 10]) : 1; } });
  card({ id: "cannonade", bz: "Cannonade", name: "Timpani Battery", size: 3, tags: ["Strike"], start: 2, type: "taiko", hit: "kick",
    cd: [14], mc: [3], dmg: [150, 200], text: "Hit 150/200, Repeat 3. When another Strike plays, Pickup 2 s on this.",
    on: { use: function (c, d) { if (d.item !== c.item && d.item.card.tags.indexOf("Strike") >= 0) c.charge([c.item], 2); } } });
  card({ id: "iceberg", bz: "Iceberg", name: "Glacier Organ", size: 3, tags: ["Tide", "Fixture"], start: 2, type: "strings", hit: "CH",
    cd: null, st: ["freeze"], text: "No loop. When a rival instrument plays, Rest it for 0.5/1 s.",
    on: { foeUse: function (c, d) { c.freezeItem(d.item, c.v([0.5, 1])); } } });
  card({ id: "lighthouse", bz: "Lighthouse", name: "Lighthouse Horn", size: 3, tags: ["Tide", "Fixture"], start: 2, type: "choir", hit: "R+12",
    cd: [6], st: ["slow", "burn"], text: "Half time on 1/2 rival instruments for 2 s. When you cause half time, Feedback 6/9.",
    use: function (c) { c.slowFoe(c.v([1, 2]), 2); }, on: { slowed: function (c) { c.burn(c.v([6, 9])); } } });
  card({ id: "knives", bz: "Throwing Knives", name: "Throwing Sticks", size: 1, tags: ["Strike"], start: 2, type: "drums", hit: "rim",
    cd: [4], am: [2, 4], dmg: [33], text: "2/4 takes. Hit 33. When another instrument Accents, this plays.",
    on: { crit: function (c, d) { if (d.item !== c.item) c.useNow(); } } });
  card({ id: "holsters", bz: "Holsters", name: "Stick Holsters", size: 1, tags: ["Stagewear"], start: 2, type: "drums", hit: null,
    cd: null, text: "No loop. At the start of each fight, double time on your Small instruments for 1/2 s.",
    on: { fightStart: function (c) { c.haste(c.mine(function (x) { return x.card.size === 1; }), c.v([1, 2])); } } });
  card({ id: "anchor", bz: "Anchor", name: "Anchor Gong", size: 2, tags: ["Tide", "Strike", "Gear"], start: 2, type: "taiko", hit: "crash",
    cd: [12, 10], text: "Hit equal to 20/30% of the rival bandleader's max health. When a neighbour plays, double time on this for 2 s.",
    use: function (c) { c.dmg(Math.floor(c.foe.max * c.v([20, 30]) / 100)); },
    on: { use: function (c, d) { if (c.isAdj(d.item)) c.haste([c.item], 2); } } });

  // ---------------- Diamond starters ----------------
  card({ id: "shipwreck", bz: "Shipwreck", name: "Sunken Bell Tower", size: 3, tags: ["Tide", "Tour", "Fixture", "Heirloom"], start: 3, type: "choir", hit: null,
    cd: null, text: "No loop. Your Tide instruments +1 Repeat.",
    aura: function (c) { c.mine(function (x) { return x.card.tags.indexOf("Tide") >= 0; }).forEach(function (x) { x.st.mc += 1; }); } });
  card({ id: "blunderbuss", bz: "Blunderbuss", name: "Blunder Horn", size: 2, tags: ["Strike"], start: 3, type: "choir", hit: "R",
    cd: [5], am: [5], dmg: [30], text: "5 takes. Hit 30. When you cause Feedback, this plays.",
    on: { burned: function (c) { c.useNow(); } } });

  // per-tier value for an owned item outside a fight
  function val(it, arr) { var i = it.tier - it.card.start; if (arr.length === 1) return arr[0]; return arr[Math.max(0, Math.min(arr.length - 1, i))]; }
  window.CARDS = C;
  window.CARD = {};
  C.forEach(function (k) { window.CARD[k.id] = k; });
  window.cardVal = val;
})();
