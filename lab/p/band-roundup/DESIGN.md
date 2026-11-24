# Band Roundup: Round Em Up 3D turned into a band game

Written 2026-11-23. A design proposal, nothing built. Mock: `index.html` in this folder (Web Lab id `band-roundup`).

The ask (2026-11-23): "check out the 3d version of round em up i think we could repurpose it to being a band and u get
members and ur trying to gather them up into ur concert stage we can map the speed of wat ur driivng hire change what are
the mehcnisims of bring them in and make the middle section the concert stage".

Round Em Up belongs to another lead; it was only read for this (`C:/Dev/round-em-up`, nothing changed there).

---

## 1. How Round Em Up 3D plays (as built and planned)

Sources: `C:/Dev/round-em-up/AGENTS.md`, `DECISIONS.md`, `pc3d/README.md`, `pc3d/unity/README.md`,
`pc3d/unity/PROGRESS.md`, `docs/research/09-PLAN-megabonk-to-herding.md` (the plan), `game/core.js` (every rule and
number), `pc3d/RoundEmUp.Core/` (core.js ported to C#, tick-for-tick identical), `pc3d/unity/Assets/Game/Scripts/`
(Herd/, Mounts/MountDefs.cs, UI/).

**What it is.** A redirect game ("in fact thats the game its a redirect game", DECISIONS.md). Animals break out of
burrows and drift toward a fence; your tools fire by themselves and turn them toward the pen in the middle. Megabonk's
movement, camera, terrain and run structure, with Vampire Survivors / Survivor.io upgrades.

**What you control.** Movement only ("It's cool if you don't need extra control other than just moving"). In 3D: run,
jump, one air jump, slide, bunny hop, all with Megabonk's numbers (`pc3d/unity/README.md`, `MoveTuning.asset`): run cap
10.4 m/s, 60 kg body, jump peak 4.18 m, slide above 8 m/s, gravity 30.62 m/s2. The 3.85 m wrangler. Your body never
touches animals ("pushign infront of me and bakwards makes no sense"): animal boxes have no colliders.

**Driving / mounts.** Mounts replace the speed power-up `boots` ("well the mount can replace the old speed ones"):
+12% run speed per level, max 5 (x1.6, about 16.6 m/s), any hero any mount, 8 built in
`pc3d/unity/Assets/Game/Scripts/Mounts/MountDefs.cs`: Big Emu (steers in the air), Big Roo (jumps higher), Tank Wombat
(no slowdown uphill), Servo Trolley (slides further), Tumbleweed (builds speed +20% over 3 s of moving), Ride-on Mower
(wider pickup while fast), Bull Frog (longer ledge grace), Block Quad (drifts). Slides and hops reach 20 to 24 m/s peaks
(PROGRESS.md speed check).

**What speed actually does.** Only gets you to the next stray sooner. Tools work on timers and reach, never on your
speed (plan 3h), so a fast hopper does not turn more animals. Outrunning your own rope loses it: a lasso slips past 1.9 x
reach (73 m). Speed matters a lot when nothing blocks (median survival 126 s at 10.4 m/s, 808 s at 20 m/s for a
kinematic mover, PROGRESS.md), so moving well is the skill.

**How animals are gathered.** Nothing carries them in ("it changes momentum not send directly in"). Each tool hit adds
pull that turns the animal's heading toward the pen by `pull x might x turnK / (weight x speed)` radians (turnK 0.5,
weight = (hp/10)^0.4, swing at up to 5 rad/s). After a turn it is calm for 20 s (no outward pull) and walks in on its
own, roaming a bit (`wanderTurned` 1.3). Targeting: most urgent first (shortest time to the fence). Nine tools
(core.js tables, plan section 4): lasso (signature: ropes the nearest stray, swings it round to face the pen, lets go
with a kick at x1.4 speed), whip (cracks a bunch round), net (bundles a bunch, hauls toward the pen, lets go turned),
hounds (run alongside and push it round), posts (hammered ahead, they bounce off), whistle (everything within 102 m turns
a little), cracker (thrown far, bang turns a bunch), scarecrow (placed, turns what comes near), bola (trips it, it gets
up turned).

**The pen.** Centre of the yard, radius 0.14 R (16.8 m) on a flat pad, post-and-rail with gate gaps facing each burrow.
An animal that walks inside is home, stays there and hops about. The only range ever shown ("the only rangeu need ot kn
is the center pen thing").

**The yard.** Fence ring at R = 120 m (1 rules unit = 0.12 m), voxel outback terrain (dunes, mesas with ramps, cliffs),
5 burrows in the band 0.42 to 0.6 R, at least 0.5 R apart: one open at the start, one more every 100 s, one switches
every 14 s. Animals spawn mixed from the first second, 2 m/s at 0:00 rising to 6 m/s by the end.

**Scoring.** Each pen: `10 x (1 + hp/10)^0.5 x (1 + 0.5 x farthest/R) x combo x event multiplier`. Combo: pens within
2.5 s chain (tiers x1.5 at 5, x2 at 15, x3 at 30, x4 at 60, x5 at 100); any loss breaks it. XP gems and gold drop where
the animal was turned (out in the yard, so camping earns nothing) and fly to you inside 8.4 m.

**Upgrades.** Level-ups give 3 offers with rarity (Megabonk), 6 tool slots and 6 power-up slots, tools to level 8, a
super at tool level 5 plus its paired power-up (lasso + amount = chain rope up to 5 hops). 13 power-ups (might, cool,
area, amount, boots/mount, growth, magnet, mender, tall, thick, calm, reach, second wind). Gold buys chests (one item,
rising price), windmills give a stat boost for a 5 s stand, barrels hold hay (heal), horseshoe (magnet), sundown (freeze
8 s), cow bell (everything near turns home).

**Fail states.** One health bar and it is the fence ("heatkh bar shoudl be green to redl"): budget 120, each animal that
crosses costs its power (5 to 20; minibosses 30 to 35, boss 40). Fence at 0 with no Second wind left = run lost.
Standing still must lose to going out (checked with the scripted `standoff`, `hole` and `camp` players every change).

**Camera.** Megabonk third person, 12 m behind at the start to 18.8 m at 10:00, FOV 85, auto-follow swings behind your
movement after 0.5 s with no mouse, so moving alone plays the game. Only animals within 4 s of the fence get an edge
marker. Round minimap top right, centred on the pen, is the map.

**Run structure.** Plan: stages of 600 / 540 / 480 s (Megabonk tiers), R growing 120 / 132 / 144 m. Clock of set
pieces: stampede 1:00, ring 2:00, miniboss 3:00, swarm 4:00, stampede 5:00, ring 6:00, swarm 7:00, miniboss 8:00, final
minute 9:00, then the stage boss (elephant) from the boss den; pen it and the gate opens to the next stage; overtime
Final Swarm until it is penned. As built today the stage clock is still core.js's runLen 900 (`HerdBridge.runLen`).

**State of the 3D build.** M1 movement, M3 herding on voxel ground, mounts, level-up, tool meshes, money and chests,
menus, minimap and HUD (fence bar of 16 panels) are in; feel not yet judged, balance options measured but not chosen.

---

## 2. Band Roundup

**Experience line (proposed):** "I get to round up a runaway monster band, and the song gets bigger with every one I
bring onto the stage."

The game in one paragraph: you drive the band's tour van round a festival field. Band members (our cast) have wandered
off from the green-room tents and are drifting toward the festival gates. Your van's calls fire by themselves and turn
them toward the concert stage in the middle; they walk up onto it on their own. Each member that reaches the stage turns
its family's part of the song on, so the concert fills up as you gather. How fast you drive sets how busy the drums are.
Lose too many members out the gates and the crowd walks out.

### 2.1 What stays exactly as Round Em Up

The rules engine (`core.js` / `RoundEmUp.Core`) is kept as it is: redirect, never carry; move only, tools fire
themselves; most-urgent targeting; weights, turn rate, calm time; burrow spawning and switching; the timeline and set
pieces; level-up offers, slots and supers; the fence budget as the one health bar; edge markers only for those about to
cross; the minimap; Megabonk movement and camera. The three scripted players stay the balance judge (camp must lose).
Everything below is a reskin plus three small additions (stems, speed feel, featured section).

### 2.2 Renames

| Round Em Up | Band Roundup |
|---|---|
| Wrangler on foot, mount as an upgrade | A bandleader driving a ride from the first second (tour van by default) |
| Animals | Loose band members (cute monster musicians, 13 families) |
| Burrows (5) | Green-room tents; an open one has its door lit |
| Fence at R | Festival fence; the gates lead to a rival band's stage |
| Pen | Concert stage, round, gate steps facing each tent |
| Fence budget 120 | Crowd: the audience in front of your stage, green to red |
| Penned count | The band on stage (shown as the members themselves, never a number) |
| XP gems, gold | Fans and merch money, dropped where a member was turned |
| Barrels | Flight cases (water bottle = heal, roadie whistle = magnet, power cut = freeze, cowbell = everything near turns) |
| Windmills | Sound check booths (stand 5 s, pick 1 of 3 boosts) |
| Boss den, stage boss | Headliner's trailer, the Headliner |

### 2.3 Families as member types

Each family takes the Round Em Up type whose movement fits how it plays, so weights, speeds and roles stay tuned.

| Family | Part it owns | Round Em Up type (hp, speed, wander) | Why |
|---|---|---|---|
| Drumline | drums | horse (180, 130, 0.7) | heavy and fast, a marching beat |
| Low End | bass | steer (270, 140, 0.5) | heavy, steady |
| Brass | brass | pig (70, 100, 0.8) | medium |
| Strings | strings | cow (150, 100, 0.5) | heavy, slow to turn |
| Weather | woodwinds | bird (5, 130, 1.8), flyer | the flyers: float over terrain and ledges |
| Overdrive | guitar | hare (10, 150, 1.8) | fast and twitchy |
| Clockwork | bells and keys | chick (1, 140, 1.5) | tiny, quick, come in packs |
| Chorus | lead voice | golden runner (goat x3, runs from you) | the lead singer is the diva: rare, runs from the van, pays 10x |
| Shanty Crew | gang chant | sheep (10, 100, 1), packs of 10 | a crowd that moves together |
| Requiem | low choir | cow (150, 100, 0.5) | heavy, slow |
| Undertone | drone | bull (500, 80, 0.4) | giant and slow, worth a lot |
| Session Players | scat | goat (15, 100, 1.6) | erratic wander |
| Multi-instrumentalist | fills a missing part | elite (any type, hp x3, crowned) | rare; on stage it plays whichever part is still missing |

New families arrive on the clock (Round Em Up adds a type every 60 s) in the order the song builds: 0:00 Drumline, Low
End, Shanty Crew, Clockwork (mixed from the first second, as ruled for Round Em Up); 1:00 Overdrive; 2:00 Weather; 4:00
Brass; 5:00 Strings; 6:00 Session Players; 7:00 Requiem; 8:00 Undertone. Chorus divas appear one at a time from 1:30;
a Multi-instrumentalist is the 1% elite roll.

### 2.4 The stage and the song

One song per gig, split into stems, one stem per family (`song-stems` skill, section 8). All stems run on one clock and
bar grid from the start of the gig; the stage only lifts or drops their volume, so nothing drifts.

- A quiet floor of the whole song always plays, plus the van's own drum machine (kick and hat), so a gig is never
  silent (skill: "A quiet floor of the song always plays", "a small house band ... from the start").
- The 1st member of a family on stage brings its part in at full (fade in to the next bar line). The 2nd makes it louder,
  the 3rd adds a doubled copy, the 4th an octave layer. After that the part is full; more members of that family pile
  onto the stage as backup and pay points.
- Drumline + Low End on stage = "Rhythm section" lights up; all 13 = "Full band". Both pay a small bonus only (skill:
  music bonuses stay small).
- Members stand on their family's spot on the stage (drums at the back on a riser, bass and keys either side, singers
  front), and play on their part's notes (mouth open on sung notes, from `notes.json`).
- Loose members hum their part quietly where they stand (3D sound), so you can hear a Brass player off screen.
- A member lost through the gate does not go silent: its part plays from the rival stage beyond the fence, thin and out
  of tune, from that direction, for the rest of the gig. The more you lose, the more the rival band bleeds in. It is the
  loss sound, not a new rule.

### 2.5 Driving speed and the music

What Round Em Up's speed does: it is travel only. Tools run on timers and reach, never on hero speed (plan 3h), and the
fast-hopper check exists to keep it that way. So speed must not change how hard or how often members are turned. What
keeps a song musical: a tempo change is a whole-band move, and drums can get busier at the same tempo (half, normal,
double time, fill) without breaking anything (skill section 8).

So driving speed sets the **drum feel**, not the tempo:

| Your speed (Round Em Up 3D numbers) | Drum feel | Heard as |
|---|---|---|
| Under 1 m/s for a full bar (parked) | Half time | kick on 1, snare on 3, hats only; the band waits for you |
| 1 to 10.4 m/s (driving up to the run cap) | Normal | the song's own drum part |
| Above 10.4 m/s (mount levels, slopes, slides, hops) | Double time | 16th hats, busier snare, same tempo |
| Airborne off a ramp or jump (Megabonk air 1 s) | Fill | a fill on the last beat of the bar, crash on the next downbeat when you land |

Rules that keep it musical:
- A feel change is decided at the bar line, from your average speed over the last beat, with 1 m/s of hysteresis so it
  does not flicker. A fill takes the last beat of the bar.
- Before any Drumline member is on stage, the van's drum machine plays the feel; after, the stage drummers do. The feels
  are played live from the drum part's notes (half time drops notes, double time adds hat 16ths), as the skill says for
  touches that change notes.
- Tempo never follows speed. It is the band's: it steps up once, at an 8-bar boundary, when the final minute starts
  (Round Em Up's climax speeds animals x1.15; the song goes up about 6%).
- Tools keep their cooldowns in seconds and are only nudged to the nearest 8th note (never more than half an 8th late),
  so neither speed nor tempo changes how many members you turn. The fast-hopper check still holds.
- Landing a jump within one beat of the downbeat gives a small "on the one" cheer and a little crowd back. Small on
  purpose.

### 2.6 How members are brought in: options and the pick

| Option | How it plays | Against Round Em Up |
|---|---|---|
| A. Calls (herding) | The van's calls fire themselves and turn members toward the stage; they walk up on their own | Is Round Em Up's mechanic as it stands; the simulator, balance and "camp must lose" carry over untouched |
| B. Lure with a beat | Members in earshot of the van steer toward the van | Pulls them to you, not the stage, so the best play is to park on the stage (the camp player wins); breaks "it changes momentum not send directly in" |
| C. Conga line | Touching a member makes it fall in behind the van; drive onto the stage to drop the line | Carrying; turns it into a snake game, and the van's speed becomes the turning power (the fast-hopper problem Round Em Up designed out) |
| D. Only when their section plays | A family answers calls only during its 8-bar section | Gating makes waiting the best move (standing still wins); too much music knowledge needed |
| E. Run from the wrong music | Members flee from the van's sound when it clashes | A push mechanic; the body/van pushing animals was rejected in Round Em Up ("pushign infront of me and bakwards makes no sense") |

**Pick: A, with C and D folded in where they fit Round Em Up's own pieces.**
- A is the core because it is the gathering mechanic that is already tuned and measured (core.js, 137 parity runs),
  keeps "move only", keeps the stage as the one place that matters, and keeps standing still losing.
- C lives on as the lasso's super, which already is a conga: the Mic Cable (lasso) ropes a member, swings it round to
  face the stage and lets it go; with the Harmony power-up (amount) it becomes the Conga Line, chaining up to 5 members
  (Round Em Up's chain rope, 5 hops within 30 m). Same numbers, so it is a reward, not the whole game.
- D lives on as a bonus, never a gate: every 8 bars one family's section is up (the song takes turns by section). That
  family's loose members glow, turn as if 30% lighter, and pay x2 (Round Em Up's set-piece multiplier) while it lasts.
- B and E stay out of the player's hands. E survives only as the Chorus divas running from the van (Round Em Up's
  golden runner), which is a chase, not a push.

### 2.7 Calls (the nine tools) and power-ups

| Round Em Up tool | Call | What it does (same rule and numbers) | Super with |
|---|---|---|---|
| Lasso (signature) | Mic Cable | ropes the most urgent member, swings it to face the stage, lets go with a kick | Harmony (amount): Conga Line |
| Whip | Snare Crack | a rimshot ring turns a bunch round | Reverb (area): Drum Roll |
| Net | Spotlight | holds a bunch in light, hauls it toward the stage, lets go turned | Long Cable (reach) |
| Hounds | Roadies | run alongside and nudge it round | the ride (mount) |
| Posts | Speaker Stacks | dropped ahead; members bounce off them | Good Vibes (calm) |
| Whistle | Count-In | "one, two, three, four": everything within earshot turns a little | Merch Table (magnet) |
| Cracker | Pyro | flash pot thrown far, the bang turns a bunch | Volume (might) |
| Scarecrow | Amp | set down, keeps turning what comes near | Quick Hands (cool) |
| Bola | Tambourine | thrown, trips it, it gets up turned | Fans (growth) |

Power-ups, one for one: Volume (might, pull), Quick Hands (cool), Reverb (area), Harmony (amount), the ride's level
(boots), Fans (growth, XP), Merch Table (magnet), Sound Guy (mender, crowd back over time), Bigger Venue (tall, +20%
crowd), Security (thick, each loss -1), Good Vibes (calm, longer calm), Long Cable (reach), Encore (second wind).

Each bandleader gets a signature call themed to them (Round Em Up's "each character need its own weapon"); the van
driver is the first bandleader. Rides: the 8 mounts with their twists, reskinned (tour van = Block Quad drift, piano on
castors = Servo Trolley slide, tuba scooter = Tumbleweed build-up, and so on).

### 2.8 Goals, scoring and fail states

- Goal of a gig: last the clock with the crowd above zero, then bring the Headliner onto the stage. Score is Round Em
  Up's points formula; the combo chain is the "encore chain" (members arriving within 2.5 s of each other).
- Fail: the crowd at zero (members out the gates, each costing its power, Undertone and the Headliner the most) with no
  Encore left. The rival band getting louder is the warning you hear.
- Pressure that is not a stat: the stage sounds thin until you go out and gather; a missing family is a hole in the song
  you can hear.
- Standing still loses, as in Round Em Up: tents far apart and switching, members drifting outward, money dropping where
  they are turned. Parked = half-time drums, so it also sounds like waiting.

### 2.9 Run structure and growth

- A gig is a Round Em Up stage: 600 / 540 / 480 s, three gigs a tour (Megabonk tiers), the field growing 120 / 132 /
  144 m. Set pieces keep their minutes: a stampede of one family, a ring of Shanty Crew round the stage all heading out,
  minibosses at 3:00 and 8:00 (a big session legend at scale 2, stubborn), swarms from every tent, the final minute.
- The Headliner (stubborn 8, turned again and again) leaves the trailer at the end or when you drive into it. On stage
  it sings the top line over the whole band: the encore, and the gate to the next gig opens.
- Final boss after gig 3: the rival bandleader, whose feedback squeal mutes one of your calls every 3 s up to 3; each
  time you turn them fully home one call comes back (Round Em Up's final boss rule).
- Each gig has its own song in its own vibe (song-stems method), offering the families that song has. New bandleaders,
  rides and venues unlock between runs (Round Em Up's shop and quests, silver as tour money).

### 2.10 Checks before building

- Run core.js unchanged with the family table above (types already exist); the three scripted players must give the
  same results, since only names change.
- Measure the featured-section bonus (30% lighter, x2 pay): standoff must still beat camp by Round Em Up's margin.
- Speed feel and tool quantising: run the hop20 / hop40 check with tools snapped to 8th notes; turns per minute must
  match the unsnapped run within noise.
- Hear one gig with the stems filling in, next to a My Singing Monsters island song, before calling the sound good.

### 2.11 Open, for the owner

- Tour van first, or each bandleader with their own silly ride from the start?
- Should the crowd bar be the audience you see in front of the stage (it thins out as you lose), or only a bar?
- One song per gig, or one song per family set (gig picks from what you have unlocked)?

---

## 3. The mock

`index.html`: one page, no libraries except the Inter font. A 3/4 top-down field with the fence, five green-room tents
(one open), the round concert stage with its truss, lights and speaker stacks, five members on it (Drumline, Low End,
Clockwork, Chorus, Overdrive), nine loose members around (Strings on the van's mic cable, Brass glowing as the featured
section, Weather floating, one near the fence with the crossing point marked), the van with its bandleader driver, and
the HUD: crowd bar, clock with beat dots, minimap, drum feel (Double), and the band lineup with the five on stage lit.
Light and dark (night gig) follow the device; `?theme=light|dark` forces one.

Pictures: cut pngs from `E:/music-battler-work/cards3d/<family>/cut/` (Drumline 02 and 05, Low End 02, Brass 04, Strings
03, Weather 01, Overdrive 04, Clockwork 03, Chorus 01, Shanty 01, Requiem 01, Undertone 03, Session 02, All-rounder 04)
and the bandleader `leaders/cut/brass_stag.png` as the driver, trimmed and saved as webp in `img/`. The pictures in
`docs/design/cast/img/openai/chars/` are five-to-a-sheet line-ups on grey, not cut, so they were not used.
