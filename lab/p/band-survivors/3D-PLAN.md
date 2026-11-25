# Band Survivors 3D: the plan

Plan only. Nothing is built, no Unity project exists, nothing was bought (Vyas, 2026-11-25: "deeply plan it otu dotn
start yet"). Written 2026-11-25 by the Band Survivors lead from three drafts (engine and feel, band and places and audio,
art), each checked against the files named in its section. Megabonk numbers come from the installed game's data in
`docs/research/megabonk-numbers.md`; the game was not run.

## In short

- The game stays the same game: you are the singer, each band member owns one part of one Suno song, attacks on that
  part's own notes (held lines as one rolling wave), and is heard only while it is in the band; the whole song plays
  only when the band is complete. 3D adds a band you can see marching behind you, places to explore, a stage to climb
  for the finale, and a crowd in the hundreds.
- Engine: Unity 6000.7.0b9, URP, a new project beside the card game (`C:/Dev/music-battler/unity-survivors`), reading
  the web game's level folders and `levels/game.json` directly, so one song pipeline feeds both.
- Feel: Megabonk's run speed (10 m/s), jump and gravity, a chase camera; no slide, wall climb or slope surfing (the band
  has to follow). Combat stays on the ground plane, so the web balance and the bot check carry over.
- Art: 91 of the 96 characters the 9 places need already have a 3D model with a mouth fit; 5 band members are missing
  and every model's back is unpainted. Moves are whole-body squash and stretch in code, as he ruled.
- Audio: every part scheduled on one DSP clock, notes fired against that clock, each part switched on the bar.
- Milestones: M0 graybox, M1 one song (Day Lawn) with the real cast, M2 the full tour, then phone, polish, Steam. Each
  has a measured gate.

## Settled in this plan (where the drafts differed)

| Topic | Draft A said | Draft B or C said | Settled |
|---|---|---|---|
| Scale | 0.08 m per web px (1 unit = 1 m) | 13 px = 1 m | 0.08 m per px (12.5 px = 1 m); B and C's "/13" figures are within 4% and are read as /12.5 |
| Map size | 320 m square for every place | side = 1.1 x run seconds (230 to 420 m) | 1.1 x run seconds, clamped to 230 to 420 m; M0's graybox is 320 m |
| Air jumps | none | one | none at start (band follow, phone parity); a perk may add one |
| Rooftops gaps | phone has no jump | 1-2 m gaps to jump | every gap has a ramp or plank too; gaps are a shortcut on PC, never required |
| Camera | Megabonk's (11 behind, FOV 85) | at FOV 85 the cast is 24-39 px on a phone, under the 40 px floor | phone: 11 behind, FOV 60, fixed pitch; PC: FOV 85 option with free pitch. Checked at the look gate |
| Phone orientation | portrait | sideways or upright | his to rule (portrait recommended: the web game and Survivor.io are portrait) |

## Reading the tags

A, B and C sections keep their own tags. A: [MB] Megabonk data, [web] our web game, [game.json], [arith], [ours].
B and C: (R) a ruling with its file, (D) our data or code, (M) Megabonk numbers, (I) a proposal here, not ruled.


---

## 1. Experience line, and what 3D adds

### 1.1 The line (his to rule)

| | Line | Why |
|---|---|---|
| Proposed 2026-11-25 | "I get to sing lead and build my band one monster at a time until the whole song plays." | Names the role (lead singer), the act (recruit monsters) and the reward (the whole song). |
| Offered alternative | "I get to start a song alone and finish it with a full monster band." | Half the words; the before/after is the hook ("hearing one by one", "the full song is the reward", R Music Battler 2026-11-23). Reads in one picture: one singer at the start, a stage full of monsters at the end. |

Either one goes into Band Survivors DECISIONS.md only when he rules it (R SHARED-RULES "Experience first", 2026-11-20).
Neither mentions 3D: the hook is the song built member by member (S40 market s6: 3D games after Megabonk that worked
had their own hook); 3D is the view.

### 1.2 What 3D adds that the web game cannot

| 3D adds | What the player sees or does | Web game today (D) |
|---|---|---|
| The band as a visible marching group | The singer leads; each member walks behind in its slot, bouncing on its own notes. The band's length is the song's progress. | Members orbit the singer in a small rotating ring (radius 60 + 5n px), read mostly through the slot bar. |
| A member's arrival as an event | The new member runs in from the edge of the crowd, falls into its slot and plays its first note on the next bar (enterU = next bar, D). | A puff and a jump at the singer's feet. |
| Height and line of sight | Low hills and 1-2 m raised stages; standing high lets line attacks (strings, bass, synth beam) clear walls and crates (I, from M 9.1 "height matters for line-of-sight attacks"). Fog in Harbour Fog hides the crowd unless you are high. | Flat plane; everything is in sight. |
| Places to explore | Each song is a bounded place with landmarks, cases hidden in it (a ship's hold, a hedge maze) and shrines you walk to (M: 14 shrines, about 45 chests per Megabonk stage). | An endless ground in one colour. |
| A stage you climb onto | The finale starts when the singer steps onto the place's main stage; the band climbs up into stage positions and the camera pulls back to frame the full band as the drop hits (I, M 9.1 "the main stage is the portal"). | The final boss walks in on the drop wherever you are. |
| The player times the finale | Megabonk's boss portal: you choose when you are ready; the song vamps until then (section 5.3). | Boss arrives on the clock. |
| Crowd scale | 200-400 instanced enemies around a band you can see (M: 400 alive cap; DRG:S about 1,000 by vertex-animation textures). | Same count, flat sprites. |
| Jump | One jump (plus one air jump, M section 1); the band hops after the singer in a cascade (section 4.1). | None. |

What 3D must not change (R): parts heard only while their member is in the band; attacks on each part's own notes;
held lines as waves; nothing heard that no member on the field plays; the full song only once the band is complete.


---

## 2. Engine and project

### 2.1 Engine

Unity **6000.7.0b9**, fixed by the master. Nobody in this game's chats upgrades a project; the move of
`C:/Dev/music-battler/unity` (now 6000.4.3f1, ProjectVersion.txt) is the Game loop chat's (local_74089c54) work on
branch `unity-6.7`.

What 6.7 on each machine can build (Ops, pc-and-tools.md 2026-11-25):

| Machine | 6000.7.0b9 modules | Use |
|---|---|---|
| PC | Windows, Mono only (no IL2CPP, no iOS, no Android) | edit loop, gates, bot check, Windows dev builds |
| Mac (hub) | iOS module present | every Apple build, through `mac.py build <app> [--mode testflight]` (mac-build skill) |

Consequences: phone builds are Mac only from day one; a Steam release build wants IL2CPP, so the Windows IL2CPP module
is an Ops ask before M5 (a Mono Steam build also works; Burst runs under Mono). 6000.7.0b9 is a beta: a store build on
it carries beta risk; Ops tracks the 6.7 final and the project moves to it when it ships.

Render pipeline: **URP** [ours]. `music-battler/unity` is already URP 17.4 (manifest), the cast materials live there,
and URP's SRP Batcher and GPU Resident Drawer are the phone route. Cost: `thumbyard-look/ThumbyardToon.shader` and
animkit's `VatInstanced.shader` are built-in pipeline (CGPROGRAM); both need a URP port, made in Toybox first (their
own README rule) and copied in.

### 2.2 Where the project lives

| Factor | A. New project `C:/Dev/music-battler/unity-survivors` | B. Inside `C:/Dev/music-battler/unity` after the 6.7 merge | C. New repo `C:/Dev/band-survivors-3d` |
|---|---|---|---|
| Shared cast | Cast FBX (163 files, `unity/Assets/Battler/Resources/BattlerModels/cards`; every Day Lawn crew model is there) copied in by an import script that keeps each `.meta` GUID, or both projects read a shared `packages/com.thumbyard.musicbattler.cast` (ask the Music Battler lead; precedent: the shared music package) | direct | copy across repos; no shared package by relative path |
| Phone build size | only what this game uses | **every `Resources` folder ships in every build**: Battler's Resources is 425 MB of the 560 MB of Assets (measured) and would ride in the phone build unless moved | only what this game uses |
| Build and import time | small project; iOS platform switch reimports only this game | a second game in a 560 MB project; every platform switch and domain reload pays for both games | small |
| Ownership | own lead, own project (one owner per thing, SHARED-RULES "Two machines") | two leads in one project; this game waits on the 6.7 merge and then shares a branch with the card game | own repo |
| Level data | import script reads `../docs/ideas/play/band-survivors/levels` in the same repo, no sync | same | needs a copy or submodule of `levels/` |
| Repo dirtiness | same dirty repo: stage exact files only (Working rules) | same | clean |
| Precedent | DECISIONS 2026-11-20 "Two projects (Recommended)": `unity` and `unity-hex` share one music package | - | - |
| Mac and iOS | one more app entry in `mac-build-hub/scripts/apps.py`; same repo the hub may already clone | same | a new clone on the Mac |
| Starts when | now, on 6000.7.0b9, independent of the merge | after local_74089c54 merges `unity-6.7` | now |

**Recommendation: A**, a new 6000.7.0b9 URP project at `C:/Dev/music-battler/unity-survivors`, owned by the Band
Survivors lead. Reasons in order: B ships the card game's 425 MB of Resources in the phone build and puts two leads in
one project; C cuts the game off from `levels/` and the cast it reads. Add `unity-survivors/{Library,Temp,Obj,Build,Builds,Logs,UserSettings}/`
to the repo `.gitignore` at creation. Vyas confirms (decision 1).

### 2.3 Web data to Unity

Rule: the web files stay the source. Unity never edits them; an editor import step (`Tools/BandSurvivors/Import levels`,
also a Unity CLI gate command) copies or bakes them. Times in a run stay VS minutes `m = 15 t / run length` and song
events stay bars [web README "Data a 3D version reads"], so both engines play one schedule.

| Web data | Holds | Unity loads it as | Notes |
|---|---|---|---|
| `levels/game.json` | ramp, ranks, elites, tiers, combos, combo numbers | `StreamingAssets/bs/game.json`, parsed at boot into plain C# records | One rule file for both engines. 3D-only numbers go in a new `"3d"` block the web ignores (section 3.6). Web px/s speeds convert at load with `unit_per_px`. |
| `levels/levels.json` | tour order | `StreamingAssets/bs/levels.json` | |
| `levels/<id>/level.json` | parts, loop_bars, energy per bar, moments, drop, fills, chorus, crew (enemies, elites, boss), ground and accent colours, minutes, diff, hard, set_folder | `StreamingAssets/bs/levels/<id>/level.json` | crew names map to cast prefab keys (`c_bell_bear` -> `bell_bear`); colours tint the ground material and accent lights; `set_folder` is read only by the import step |
| `levels/<id>/notes.json` | bpm, beat and bar length, loop start/end, every note of every part (time, pitch, length) | kept as JSON source; import bakes `notes.bytes` (per part: sorted float time, byte pitch, float length) as a TextAsset | Day Lawn's is 234 KB of JSON (measured); the bytes skip JSON parsing on phone. The sim reads either. |
| Part audio | web: mono mp3, lead 80k, rest 56k [web README]; full quality: `set_folder/<part>.wav` (measured: stereo, 48 kHz, 32-bit, 58 MB per part for Day Lawn) | AudioClips imported from the **wavs** (not the mp3s: no lossy-to-lossy), Force To Mono like the web, per-platform load type (section 8.4); one Addressables group per level | Each part is cut at import into `intro` (0 to loop.start_s) and `loop` (loop.start_s to loop.end_s) at exact samples, so the loop is sample-exact with plain AudioSources |
| Dry lead | `D:/music-battler-work/band-survivors/dry/<id>_voice_lead.wav` (exists for the stops, 48 kHz) | same as the parts, replaces `voice_lead` | DECISIONS 2026-11-24/25: the lead is dry |
| Cast pictures `img/c_*.webp` | 2D crew art | not used in play; UI portraits only | 3D cast comes from the FBX in Battler (above) |
| Audio files in git | web mp3s are in git; the D: wavs are not | the imported wavs stay **out of git** and are rebuilt from D: by the import step (same as Sing Island World, commit 96c2781) | .meta files are committed (LESSONS 2026-11-07) |

### 2.4 Audio clock (how notes drive attacks)

- One clock: `AudioSettings.dspTime`, as `unity/Assets/Battler/Scripts/Audio/BeatClock.cs` already rules ("never"
  game time). All parts are `PlayScheduled` at one dsp time, so they start on the same sample.
- Each part's AudioSource carries a tiny `OnAudioFilterRead` gain stage that ramps 0 -> 1 starting on an exact
  sample: a new member's part comes in on the next bar line, as the web's `setLayer` does at `nextBarCtx` [web
  index.html:309]. Parts not yet owned play at gain 0 and keep their place.
- Attacks: the sim steps at 50 Hz [MB s1 physics step 0.02 s]; each step fires every owned part's notes whose time falls
  in the step window (the web's `fireNotes` range search [web index.html:992]), offset by the output latency
  (`AudioSettings.GetDSPBufferSize`) plus a player calibration slider (Bluetooth). Held notes (>= 0.5 s [web HELD,
  index.html:262]) fire one wave.
- The stem player (scheduled parts, bar-exact gains, note cursor) is written as a small Toybox Unity package from M0
  [ours]: DECISIONS 2026-11-25 makes this game's music build the default for our music games, and Toybox holds
  anything a second project can use. The card game's package `com.thumbyard.musicbattler.music` is not used (card
  engine, synth and mixer this game does not need).

### 2.5 Toybox kit pieces

| Piece | Use | How |
|---|---|---|
| Game kit, as the Thumbyard-renamed copy (`com.thumbyard.gamekit`, as `music-battler/unity` already embeds) | yes | never `com.vyas.gamekit` (his name ships in the DLL names; kit README rename note) |
| - AudioSession | as-is | iPhone silent switch rule |
| - Display, Settings | as-is | PC window modes; settings pages from JSON (audio latency slider, camera sensitivity) |
| - Data (DataStore, DataChecker) | adapted | loader and checker for game.json / level.json; `noEngineReferences` style so the sim assembly reads it headless |
| - HudLayout | adapted | HUD (health, band slots, timer, card picks) as a layout file per platform |
| - SoundProof, Crash (Sentry) | as-is | release gates (M4, M5) |
| - Online / Steam | as-is at M5 | Steam only; no online play planned |
| - Bots (BotSkill), Grid, Lobby, Rooms, Spectate, Targeting, Shell, Hud (top-down) | not used | our bots are the sim's kite and idle; no lobby, grid or cursor |
| animkit | | |
| - AnimSpec builder, LocomotionDriver, SmoothCheck, FrameStrips | as-is | singer, band, elites, bosses (real Animators); `animkit.py check` and strips are gates |
| - SquashStretch, LeanBank, SpringChain | as-is | band bop on its notes, lean on held notes (the web's `bop` and `lean`) |
| - VatBaker, VatCrowd, VatInstanced.shader | adapted | crowd enemies; shader ported to URP; VatCrowd fed from the sim's arrays, not GameObjects |
| replay (`com.thumbyard.replay`) | wired at M0, dev only, off by default | moments as the web: boss or mini-boss kill, combo from a case, singer under 20% for 2 s, swarm ring cleared [web README]. Adapted: run it in the "keeps running" mode, not the offline pause, so the song and the sim never pause (the web rule: the song keeps playing and the replay changes no game time or notes). `ReplayTracked` on singer, band and bosses; the crowd is recorded from the sim arrays inside the 90 m radius [replay SPEC]. Release check: fresh install has it off |
| gates (SceneGate, SceneGateCli) | as-is | copied into `Assets/Editor` at creation |
| unity-cli (`unity_cli.py check`) | as-is, the only route | LESSONS 2026-11-24: one warm headless editor through the PC slot; `com.unity.pipeline` installed after creation (works on 6000.7.0b9 per its README); all checks below are `--gate` or `--test editor/playmode` |
| thumbyard-look (ThumbyardToon) | adapted | URP port; props GLBs (meadow set) usable for graybox and Day Lawn dressing |
| release-kit `unity_telemetry.py` | as-is | before every upload (LESSONS 2026-11-13) |


---

## 3. Feel, from Megabonk

What we change and why, in short: damage comes from the song's notes, not weapons and timers; a run is one song
(3:30 to 6:15 [web README], `minutes = 3.5 + 0.35 x diff`), not a 10-minute stage; the band must follow the singer, so
no wall climb, no slope surfing, no cliffs; gameplay stays on the ground plane so the web's balance (and its bot check)
carries over unchanged.

### 3.1 Movement

| Value | Megabonk | We take | Changed, why |
|---|---|---|---|
| Physics step | 0.02 s, 50 Hz [MB s1 Fixed Timestep] | 50 Hz for the singer and the crowd sim; rendering interpolates | - |
| Gravity | -19.62 (2 g) [MB s1 PhysicsManager] | -19.62 | - |
| Extra gravity | 11 per unit mass, medium confidence [MB s1 GetGravity] | 11 while airborne | applied only in the air [ours], tune at M0 |
| Max run speed | 10 u/s x MoveSpeedMultiplier [MB s1 maxRunSpeed] | 10 u/s; the web perk `feet` adds 8% per level [web index.html:678] | MB's speed stat curve not used; our perks are the web's |
| Acceleration | 2700 per unit mass with counter-movement 0.25 [MB s1] (near-instant) | 0 to 10 u/s in 0.1 s, stop in 0.1 s [ours, read from MB's snap] | stated as times so the phone stick and the sim share one rule |
| Air deceleration | 0.003 [MB s1] | 0.003 | - |
| Jump | 7 u/s impulse, apex about 0.8 to 1.25 u [MB s1, arith] | 7 u/s, PC and pad only | phone has no jump (one stick, section 8.1) |
| Air jumps | 1 [MB s1 aerialJumps] | 0 | band follow and phone parity [ours]; a perk could add one later |
| Jump over the crowd | - | no contact hits while the singer's feet are above 1.5 u [ours] | gives the jump a use without changing the web balance (the kite bot never jumps) |
| Slide | above 8 u/s, force 200, cooldown 0.5 s [MB s1] | not taken | speed tech breaks band follow; runs are timed by the song, not distance |
| Slopes | walkable 45 deg, surf 30 deg [MB s1 maxSlopeAngle, slideAngle] | terrain never steeper than 25 deg; no speed change on slopes | below MB's 30 deg surf angle, so no sliding; the sim stays planar |
| Wall climb, swim, fall damage | yes [MB s1; genre-learnings 9.1] | none | band follow; no water; no cliffs to fall from |
| Contact hit cooldown | 0.3 s [MB s1 enemyAttackCooldown] | keep game.json: 0.3 s invincible after a hit, 0.7 s per enemy between hits [game.json ramp] | same 0.3 s; ours is sim-tested |
| Body | capsule 3.85 x r 0.7 [MB s1] | the singer's size and the world scale | - |
| Base HP | 100 [MB s1] | 100 [web, survivors-difficulty-numbers s3] | same |
| Regen | HealthRegen stat 10 (units unclear) [MB s1] | 0.2/s [game.json regen_per_s] | ours is sim-tested |
| Pickup range | 5 [MB s1 PickupRange] | 10.4 u (web 130 px [web index.html:744] x 0.08) | ours is sim-tested |

Band follow (ours, no Megabonk source): members ride a loose ring around the singer of radius `(60 + 5 n) px x 0.08`
= 4.8 + 0.4 n u (9.6 u at 12 members) [web index.html:687], turning 0.35 rad/s, easing at 3.2/s [web]; in 3D each
member runs at up to 1.3 x the singer's speed when more than 6 u from its slot, and is placed back in its slot when
more than 40 u away or out of view [ours]. Gate at M0.

### 3.2 Camera

| Value | Megabonk | PC (third person) | Phone (fixed high three-quarter) |
|---|---|---|---|
| Distance | 11 behind [MB s2 offset3rdPerson] | 11 + 0.5 per band member (16.5 at 11 members) [ours: the band ring must fit] | about 105 u (arith: ground 36 u wide at the singer in portrait, the web phone view 435 px x 0.08 [web index.html:186 Z]; vertical FOV 40, aspect 0.46) |
| Zoom out | up to +15 with speed [MB s2 maxExtraZoomoutDistance] | up to +15 with band size and crowd density [ours] | none |
| FOV | 85 [MB s2 fov] | 85 | 40 vertical [ours] |
| Pitch | free, clamp 90 [MB s2] | 15 to 70 deg below horizon, never up [ours: the crowd is on the ground] | fixed 55 deg [ours] |
| Yaw | free | free, mouse or right stick | fixed, north up [ours] |
| Sensitivity, smoothing | 1, 0.6 (pad 3.2) [MB s2 CFControlSettings] | same, in Settings | - |
| Collision radius | 1 [MB s2 cameraRadius] | 1 (pushes in over hills and props) | none needed at that height |
| Near / far | 0.3 / 1000 [MB s2] | 0.3 / 450 [ours: map diagonal 453 u] | 1 / 250 [ours] |
| Off-screen threat | edge arrows, attack tickets [genre-learnings 9.1] | arrows for elites and bosses | same |

### 3.3 Map

| Value | Megabonk | We take | Why |
|---|---|---|---|
| Size | 600 to 768 u square (60 to 77 s to cross at 10 u/s) [MB s3] | **320 u square**, 32 s to cross [arith] | runs are 35 to 60% of MB's 600 s stage [web minutes; MB s8]; the crowd is re-placed near the band anyway |
| Shape | tile grid or heightmap, open [MB s3] | one bounded festival ground per song, soft edge (hedges, fences), no hard walls inside | band follow; enemies re-placed (below) |
| Height | Desert heightmap x11, Hell x18 [MB s3] | 0 to 8 u (about 2 singer heights) [ours], 3 to 4 raised stages with ramps, one main stage | no cliffs; height is looks and movement, not combat |
| Instrument cases (chests) | density 0.00012 per u^2, 46 per stage [MB s7] | 8 placed (MB density on 320^2 = 12 [arith]; 6 to 10 [genre-learnings 9.3]) plus the web's elite and mini-boss drops | cases open on a drum fill [genre-learnings fit 7] |
| Tip jars (pots) | 40 small + 15 big per 600^2 [MB s7] | 12 small + 4 big (same density on 320^2 = 15.6 [arith]) | |
| Small stages (shrines) | 0.000042 per u^2, 14 to 15 [MB s7] | 4 (same density on 320^2 = 4.3 [arith]) | charge-shrine idea: stand on it for 2 bars while the band plays a fill [genre-learnings 9.1] |
| Enemy pool / alive | pool 700, alive 400 (300 late, 550 no summoner) [MB s3, s4] | pool 1000 [ours; DRG:S reached about 1000, genre-learnings 9.1], alive cap 270 [game.json cap] | the cap is the sim-tested number |
| Teleport-back | far enemies return near the player, cooldown 10 s [genre-learnings 9.1 from MB tables] | enemies over 100 u away [ours; the web uses 1.1 x the screen's long side, index.html:693-697] go to the spawn ring ahead of the singer, at most once per 10 s each; bosses never | - |
| Spawn ring | around the player [MB s4] | 45 to 55 u from the singer, out of view first, never under 30 u [ours; the web spawns just off screen, index.html:608] | 3D view is not a rectangle |

### 3.4 Spawns, HP, XP, timing: ours stays, Megabonk informs

| Value | Megabonk | We take | Why |
|---|---|---|---|
| Alive target | 5 -> 205 linear over the stage x (1 + 0.7 D + 0.4 stage), cap 400 [MB s4] | floor `15 x 1.15^m`, spawns `0.8 x 1.10^m` per s, horde floor 200 at m11-14, cap 270 [game.json ramp] | game.json is VS data balanced by the bot check; one rule file |
| Spawn tick | every 2 s [MB s4 GetSummonInterval] | on the beat, more where the bar's energy is high [web README; level.json energy] | the song drives it |
| Swarms | 30 s at 40% and 70%, HP x1.3, speed x1.2 [MB s4, s8] | a ring on the downbeat after each drum fill [level.json fills], the m11-14 horde [game.json] | song events |
| Mini-bosses | 30% and 80% of the stage [MB s8] | on the song's big moments [level.json moments], mid boss at m10 [game.json mid_at_m] | |
| Elites | chance-based, HP x10 [MB s4, s5] | on chorus downbeats [level.json chorus], HP 16 and 20 x [game.json elites] | |
| Stage boss and end | boss at 100%, then exponential final swarm `4^(t/60) - 1` HP [MB s5, s8] | final boss on the drop after the full band, 40 s before the end [game.json final_before_end_s]; no exponential swarm, the run ends with the song | runs are one song; the full song is the reward [DECISIONS 2026-11-23] |
| HP growth | +10% of base per minute, steps x28 / x146 between stages [MB s5] | `8 x 1.22^m` (+0.04 per diff step) [game.json ramp] | sim-tested; no stages within a run |
| Damage growth | +0.028 per minute [MB s5] | 5 / 10 / 14 by m 0 / 1.5 / 12, elite 20, boss 30 [game.json] | |
| Tiers | HP 0.80/0.95/1.05, damage 0.75/0.95/1.10, speed 0.85/0.98/1.065 [MB s9] | venue tiers Open Mic to Stadium [game.json tiers] | ours stack one rule each |
| XP | 7, then `5 + 5.325 i^1.065` [MB s6] | `5 + 5 (L - 1)` [game.json xp_base, xp_step] | 10 to 13 members need level-ups (sim-report) |
| Enemy speed | Skeleton 5.5, Goblin 5, Ghoul 9 [MB s5] | ranks 42 to 60 px/s x 0.08 = 3.4 to 4.8 u/s, elites 2.7 to 2.9 u/s, +0.11% per s [game.json ranks, enemy_speed_per_s] | singer/enemy speed ratio is the web's (about 2.1 to 3.0) |
| Run length | 600 / 540 / 480 s per stage [MB s8] | `level.json minutes` (3:30 to 6:15) | one song |

### 3.5 Why the gameplay stays planar

Attacks, contact and the sim run on the XZ plane with the web's rules; terrain height moves the bodies and the camera
only. This keeps the 3D game on the same balance as the web game and lets the web bot check be the target (section
9). Height for line of sight (genre-learnings 9.1 "strings, bass") is left out until the planar game passes M2 [ours].

### 3.6 The `"3d"` block in game.json (one rule file)

    "3d": {"unit_per_px": 0.08, "world_u": 320, "max_slope_deg": 25, "height_max_u": 8,
           "sim_hz": 50, "run_u_s": 10, "accel_s": 0.1, "jump_u_s": 7, "gravity": -19.62, "extra_gravity": 11,
           "jump_safe_u": 1.5, "spawn_ring_u": [45, 55], "spawn_min_u": 30,
           "teleport_back_u": 100, "teleport_cooldown_s": 10, "pool": 1000,
           "band_catchup": 1.3, "band_reset_u": 40,
           "cases": 8, "jars": [12, 4], "stages": 4}

Everything else (ramp, ranks, elites, tiers, combos, XP) is read from the existing keys and never copied into this
block. The web ignores the block. The Band Survivors lead owns the file.


---

## 4. The band in 3D

### 4.1 Formation (shared by every vehicle option)

| Rule | Value (I unless tagged) |
|---|---|
| Who is where | The singer (player) is the head. Members fill slots behind her in join order, which already follows `ORDER` in index.html (lead, drums, bass, keyboard, guitar, brass, woodwinds, strings, synth, percussion, voices) (D). Rhythm section near the singer, voices at the back. |
| Spacing | 1.6 m between members along the path, 1.4 m side to side when the shape is two wide. 13 members (most a level has: Harbour Fog, Marsh, D) = about 20 m single file or 11 m two wide. |
| Following | A breadcrumb trail of the singer's path, sampled every 0.05 s with height. Each member follows the trail at its slot distance, so the band wheels round corners like a parade instead of swinging as a rigid block. |
| Sharp turns | Turn of more than 120 degrees inside 0.5 s: members leave the trail and cut straight to their slot (no long snake behind a U-turn). |
| Stopping | Singer stops: members close up to 1.2 m and keep bouncing on their notes in place. |
| Jumps | The trail stores the jump; each member hops when it reaches that point, using the same 7 m/s impulse (M section 1). A jump reads as a wave of hops down the line. Members take no fall damage. |
| Lost member | More than 12 m from its slot or stuck for 1 s: it does one big arc hop back into its slot. The band never splits. |
| Crowd collision | Members are invulnerable and never targeted (as in the web game: enemies only hurt the singer, D). They push enemies aside softly (separation, no knockback) and are never stopped by them. No collision between singer and members. |
| Terrain | Members walk anything the singer walks; maps keep slopes under 25 degrees and no cliffs so the band can follow (M 9.1: "no wall climbing; gentle hills, no cliffs"). |

### 4.2 Reading who is playing (R song-stems section 8, "i wanna see it visually that sound is coming form a specific guy")

| Cue | On every note of that member's part | While its part rests |
|---|---|---|
| Body | Bounce, bigger on louder notes (note weight w, D) | Still, slightly dim |
| Mouth or instrument | Flash in the family colour (FAM col, D); mouth open on sung notes | Closed |
| Ground ring | A thin family-colour ring under the member pulses | Faint |
| Note puff | A small note leaves the member | None |
| Band bar (HUD) | Its portrait pulses (web pulseSlot, D) | Grey |
| Entrance | Jump plus colour ring on its first bar | |

### 4.3 Attacks from each member's own body, on its own notes

Damage stays the Pull Lanes formula: damage per note = family dps x note weight / the part's weighted notes per second,
so a busy part hits often and small, a sparse part rarely and big (R Pull Lanes row 84; D `fire()`). Notes come from
`notes.json` against the audio clock (section 7). Every attack starts at the member's mouth or instrument bone, so the
band's shape decides where attacks come from (M 9.3 item 6).

| Part (family) | Web attack (D) | 3D version (I) | Range at 13 px/m |
|---|---|---|---|
| voice_lead (singer) | 1-3 aimed bubbles | Bubbles from her mouth, chest height | 18 m/s, aim range 29 m |
| drums | Ring pulse, size by kick/snare/hat | Ground shockwave ring around the drummer, fist slam (R DECISIONS 2026-11-20, "slams the drum with his fists") | radius 5.5-11 m |
| bass | Heavy piercing shot | Low heavy ball, pierces 1 + level | 18 m/s, 34 m |
| brass | Cone blast | Cone from the horn's bell, faces nearest enemy | 9-15 m, half angle 0.4 + 0.06 x level rad |
| strings | Piercing lines at nearest n | Fast bow-streaks; blocked by walls unless shot from higher ground | 60 m/s, 43 m |
| woodwinds | Homing notes launched upward | Notes rise in a real arc, then dive on targets (3D uses the vertical) | 3 s life |
| guitar | Chain zap | Arc from the guitar to a target, chains | 23 m first, 11.5 m per chain |
| keyboard | Chord stars on random near targets | Stars fall from the sky onto targets | 29 m search, 2.6-4.5 m splash |
| percussion (shaker) | Tambourine boomerang | Tambourine thrown out and back | 25 m/s |
| synth | Beam | Beam from the synth; line of sight matters | 17-28 m |
| vocals (Diva) | Siren ring that slows | Ring that slows | 8.5-14 m |
| voice_bom | Big slow push bubble | Big bubble rolling on the ground | 11 m/s |
| voice_doowah_lo | Orbit bubbles round the singer | Bubbles circle the singer at 7-9 m | |
| voice_scat, voice_suno_line | Bubble spray | Spray from the member | 20-28 m/s, short |

### 4.4 Held lines as waves (R Pull Lanes row 91, "if its not discreete it shouldnt b lik machine gunnign it it should be like idk a wave?")

| Rule | Value |
|---|---|
| What counts | A note of 0.5 s or longer (HELD = 0.5, D) on any part except drums and percussion (hit parts keep one hit per note, R row 91). |
| Shape | One arc wall rolling out from the member along the ground, knee to head height, family colour, translucent. Half angle 0.55 + 0.05 x level rad; speed 23 m/s; out to 13 m + 1.4 m x level + up to 7 m for the note's length (web R = 170 + 18 lv + 60 min(1.5, d) px, D). |
| Over the note | The wall keeps rolling for the note's length; a new note in the same phrase makes it swell (R row 91, "swelling on each note"), not a new shot. Each enemy is hit once per wave. |
| Singers | Mouth held open for the note (web leanUntil, D); the singer leans into it. |

### 4.5 Combos (two parts that play together)

| Rule | Value |
|---|---|
| When | A case opens and both members are level 2 or more (combo_min_level 2, D game.json); the six pairs in game.json (Groove, Horn section, Harmony, Power chord, Light show, In the pocket). |
| Notes | Only the notes where both parts sound within 60 ms (combo_window_s 0.06, D). The two stems are already playing, so a combo adds nothing new to the mix (D README; R "nothing may be heard ...", Pull Lanes row 89). |
| 3D look | A colour tether joins the two members while the combo is owned and flashes on each combo note, so the player sees which two make it. The attack starts at the midpoint of the two (web starts at the singer, D). |
| Shapes | Groove: 15 m ground shockwave that pushes; In the pocket: 15 m ring that pulls in; Horn section: 18 m wide sweep; Harmony: three bubbles that split; Power chord: a beam both ways; Light show: stars rain on four targets. |

### 4.6 Vehicle options (his to decide; open in Band Survivors DECISIONS.md)

**(a) Float train that grows car by car and unfolds into a stage on the drop**

| | |
|---|---|
| How it plays | The singer walks free at the head; a small lead float follows her trail and every new member arrives riding a new float car hitched to the end. The train follows the breadcrumb trail (4.1). Cars are solid to enemies: a long train is a moving wall you can curl around the crowd (a Snake move). Cars never hurt the singer. |
| How the song builds | One car per part: count the cars, count the parts. Each car is dressed for its family (drum kit car, horn car, choir pew car) and lights up on its notes. On the drop, the train circles and the cars unfold into one stage, every member in its place, for the finale. |
| Cost | Large: a tractor, one car chassis, 15 family dressings (one per FAM entry, D), an unfold animation per car plus the stage layout it forms, trail follower with car collision, train-over-terrain checks. |
| Risk | 13 cars x about 4 m = 52 m of train, more than a phone camera 11 m behind (M section 2) shows; the singer gets boxed in by her own train; a new movement problem (Snake) that the survivors loop does not have; unfold needs flat room. |
| Mockups | 1. Day Lawn, mid-run: the singer running ahead, five bright floats behind her (drums, bass, keys, guitar, brass), crowd parting around the train. 2. The drop: the train curled in a circle, cars mid-unfold into one round stage, a light pillar on the boss's entrance. 3. Car close-up: the brass car with the horn monster on top, its cone blast leaving the bell. |

**(b) Tour bus with a rooftop stage**

| | |
|---|---|
| How it plays | One bus. Either the player drives it (vehicle controls) or it follows the singer. Members ride on the roof and play from there; the bus rams small enemies. |
| How the song builds | The roof fills slot by slot; the bus gains lights, speakers and banners as members join. At the full band, the roof unfolds into a stage. |
| Cost | Medium: one bus model, roof slots, roof-to-stage unfold, a vehicle controller tuned for phone. |
| Risk | Driving a bus is a different game from dodging on foot (Megabonk's loop is on foot, M section 1); members are small on the roof and hard to tell apart; turning circle through a crowd; every attack starts from one spot, so the band's shape stops mattering (M 9.3 item 6). |
| Mockups | 1. The bus from above, three members on the roof, crowd all round. 2. Full band: roof packed, side panels opened into speakers. 3. Bus parked at the Night Market square, roof raised into a stage for the finale. |

**(c) Conga line on foot**

| | |
|---|---|
| How it plays | Exactly 4.1: members walk behind the singer in single file (or two wide), hop after her jumps, play while they walk. Nothing new to steer. |
| How the song builds | The line gets longer; each new member is a new body with its own colour ring and bounce. On the finale the line climbs the main stage of the place (5.3) into stage positions. |
| Cost | Small: a walk-and-play loop per family on the characters' own bones (`character-motion` skill), trail follower, stage slots per main stage. |
| Risk | Least spectacle of the three; at 13 members the tail (about 20 m) leaves the phone camera on tight turns. Mitigation: two-wide shape after 8 members. |
| Mockups | 1. Rooftops: the singer leaping a gap, the line hopping after her in a cascade. 2. Full conga winding through the Night Market stalls, every member mid-note in its colour. 3. Finale: the line climbing the bandstand steps on Day Lawn as the boss rises. |

| | (a) Float train | (b) Tour bus | (c) Conga on foot |
|---|---|---|---|
| Dodging feel (the core loop) | Kept, plus a wall to manage | Changed to driving | Kept |
| Song building shown | Strongest (a car per part) | Medium (roof fills) | Clear (a body per part) |
| Who is playing, at a glance | Good (cars spaced out) | Weak (crowded roof) | Good |
| Stage on the drop | Built in (unfold) | Built in (roof) | Needs a stage in each place |
| One-picture appeal (store, clips) | Highest | Medium | Lowest |
| Art cost | Large | Medium | Small |
| Code risk | High (train physics, Snake) | Medium (vehicle feel) | Low |

Recommendation (I, his to decide): build **(c)** first, because it keeps the on-foot dodging that the genre and Megabonk
sell on and costs the least, and give every place a main stage the line climbs for the finale (needed by the vamp option
anyway, 5.3). Mock up **(a)** as the one-picture marketing image and decide from the mockups whether it is worth its cost.
(b) is the weakest fit.


---

## 5. Levels as 3D places, one per song

### 5.1 Rules every place follows (I unless tagged)

| Rule | Value |
|---|---|
| Size | Square side = 1.1 x run seconds, in m: Megabonk takes 60-77 s to cross a 600-770 unit map in a 600 s stage at 10 m/s, about 0.11 of the stage (M sections 1, 3). |
| Ground | Bounded (walls, water, fences), gentle hills under 25 degrees, 1-2 m raised stages; far enemies are moved back near the band (M 9.1; web does this, D). |
| Main stage | One per place, the finale's spot; opposite side from the start so you have to cross the place. |
| Instrument cases (chests) | Elites and mini-bosses drop them as now (D README). Placed cases: half of Megabonk's density (0.00012 per m2, M section 7), clamped 6-10 (M 9.3 item 4). Opening reveal on a drum fill and a one-bar solo of the upgraded part (S40 fit 7). Whether placed cases cost tips (Megabonk's rising chest price, M section 7) is open. |
| Shrines | 3-5 per place (M 9.3 item 4; Megabonk 14 on a 600 map). Types below. |
| Tip jars (pots) | Megabonk density 55 pots per 360,000 units2 (M section 7), scaled; break for tips, a snack (heal) or a magnet (S40 fit 7). Themed per place. |
| Bosses | Mini-bosses on the song's big moments, mid boss past VS minute 10, final on the drop after the full band is in (D onBar). |

Shrines in music terms (I; Megabonk equivalents from M section 7 and 9.1):

| Shrine | Megabonk | Ours |
|---|---|---|
| Small stage | Charge shrine (stand in the circle, pick 1 of 3) | Stand on a small raised stage for 2 bars while the band plays; pick 1 of 3 boosts (louder, faster feet, wider pickup ...). Leaving the stage resets the count. |
| Heckler | Greed shrine (+0.1 Difficulty per use for money) | A heckler in the crowd: talk to him and the crowd gets tougher (one ramp step, like +0.1 Difficulty) for more tips for the rest of the run. |
| Request booth | Challenge shrine | Take a request: a ring of marked enemies lands on the next downbeat; clear it in 8 bars for a case. |
| Rival poster | Boss curse shrine | Tear it down: a rival band's mini-boss comes on the next big moment, and it drops a case. |
| Merch stand | Shady Guy | Spend tips on one of three cards at 0.65 price (M section 7). |

### 5.2 The nine places

Numbers from each `levels/<id>/level.json` and `notes.json` (D). Map side and counts from 5.1. "Finale section" is the
bars the song vamps (5.3): the 8 bars before the drop, unless the drop is too early.

| Place (order) | Song | Run | Map side | Cases / shrines / jars | Drop (of loop bars) | Finale section |
|---|---|---|---|---|---|---|
| Sneaky Harbour (1) | 144 BPM, 10 parts | 3:30 | 230 m | 6 / 3 / 9 | bar 32 of 34 | bars 24-31 |
| Day Lawn (2) | 130 BPM, 11 parts | 3:51 | 250 m | 6 / 3 / 11 | bar 60 of 80 | bars 52-59 |
| Canal (3) | 116 BPM, 11 parts | 4:12 | 280 m | 6 / 3 / 13 | bar 40 of 54 | bars 32-39 |
| Night Market (4) | 110 BPM, 12 parts | 4:33 | 300 m | 6 / 4 / 15 | bar 4 of 67 (too early) | cue sheet: moment 40, vamp 32-39 |
| Harbour Fog (5) | 98 BPM, 13 parts | 4:54 | 320 m | 6 / 4 / 17 | bar 40 of 60 | bars 32-39 |
| Rooftops (6) | 116 BPM, 10 parts | 5:15 | 350 m | 7 / 4 / 21 | bar 52 of 75 | bars 44-51 |
| Lantern Night (7) | 116 BPM, 12 parts | 5:36 | 370 m | 8 / 5 / 23 | bar 36 of 65 | bars 28-35 |
| Marsh (8) | 116 BPM, 13 parts | 5:57 | 390 m | 9 / 5 / 26 | bar 4 of 66 (too early) | cue sheet: moment 48, vamp 40-47 |
| Bell Garden (9) | 116 BPM, 11 parts | 6:18 | 420 m | 10 / 5 / 30 | bar 56 of 58 | bars 48-55 |

Night Market and Marsh: the loudness tool put the biggest lift at bar 4, so their finales need the hand-edited cue sheet
per song that S40 fit 1 already asks for (Halls of Torment's Bard used hand-authored cues). This is a data fix in
`level.json` (a `finale` field), not a 3D question.

| Place | Theme and shape | Landmarks | Cases and shrines sit | Tip jars | Boss on the finale | New art |
|---|---|---|---|---|---|---|
| Sneaky Harbour | Pirate harbour at dusk, teal ground, pink accent (#1E524C / #FF5FA2). A crescent quay round a bay; water in the middle is not walkable. | The moored ship (main stage = its deck, up the gangplank); lighthouse on the point; warehouse row with crate stacks. | Cases in rowboats along the quay and on crate tops; small stage = the capstan; heckler = a drunk sailor on a barrel. | Rum barrels, lobster pots | p_chief on bar 32 | Quay kit, ship deck stage, lighthouse; crew p_cabin ... p_cutlass, elites p_brig, p_purser as 3D |
| Day Lawn | Sunny park, green and yellow (#2F6E45 / #FFD84A). Open rolling meadow round a pond. | Bandstand gazebo (main stage); big oak with a swing; hedge maze corner. | Cases inside the hedge maze and under picnic blankets; small stages = tree stumps; heckler = a rooster on a fence. | Picnic baskets | c_gong_golem on bar 60 | Park kit, gazebo, hedge maze; check Sing Island World's Day Lawn (commit 96c2781) for reuse |
| Canal | City canal, deep teal and cyan (#1F5A6E / #7FE3FF). A long strip along two canal arms joined by humped bridges (chokepoints). | Lock gates; humped bridges; a moored barge (main stage on its deck). | Cases on barges; small stages on bridge tops (height to shoot over the water); heckler on a towpath bench. | Flower boxes, crates | c_dread_fundamental on bar 40 | Canal and bridge kit, lock gates, barge |
| Night Market | Night stalls, deep purple and lilac (#2B2350 / #C9A2FF). A grid of stall alleys around a square. | Central square with the market stage (main stage); clock tower; noodle-stall row. | Cases behind stall counters; small stages = stall rooftops; heckler = a fortune-teller booth. | Paper lanterns, fruit crates | c_pit_bellower on the cue-sheet finale | Stall kit, clock tower, square stage |
| Harbour Fog | Foggy docks, slate and pale ice (#36505A / #BFE8F0). Docks round a basin; fog limits sight at ground level. | Foghorn tower (main stage on its platform); container cranes; a wreck. | Cases in the wreck and on crane tops; small stages raised above the fog so you can see out; heckler = a harbour bell-ringer. | Crab pots, buoys | c_tine_toad on bar 40 (a 3D toad route exists in `art-concepts/toad-3d`) | Dock kit, fog volume, foghorn tower, cranes |
| Rooftops | City roofs at dusk, slate and amber (#44506A / #FFB347). Terraced roof levels joined by ramps and plank bridges; 1-2 m gaps to jump (the band's hop cascade). Parapets on every edge: no falling off the map. | Water tower (main stage on a helipad beside it); chimney stacks; a neon sign. | Cases on the highest roofs; small stages = skylights; heckler at a window. | Flower pots, TV aerial boxes | c_thunder_ox on bar 52 | Roof kit with parapets, water tower, neon sign |
| Lantern Night | Lantern festival, plum and orange (#3A2340 / #FF8A3D). A river with floating lanterns, temple steps rising to the north. | Temple stair with the main stage at the top; pagoda lantern tower; arched bridge. | Cases at shrines along the river path; small stages = lantern platforms; heckler = a fireworks seller. | Paper lanterns | c_crimson_knell on bar 36 | Temple steps, pagoda, lantern river |
| Marsh | Bog at night, dark green and cyan (#2E4A3A / #9AF3FF). Boardwalk network over bog; open water and reeds are walls. | Stilt hut (main stage on its deck); a dead giant tree; glowing pools. | Cases on islands reached by boardwalk spurs; small stages = stilt platforms; heckler = a frog on a log. | Jars of fireflies | c_bulwark_keener on the cue-sheet finale | Boardwalk kit, stilt hut, bog water |
| Bell Garden | Walled bell garden, umber and gold (#5A4A2A / #FFE680). The biggest place, garden rooms joined by bell arches. | The great bell tower (main stage under the bell); topiary; bell arches as gates. | Cases in the garden rooms; small stages = bell plinths; heckler = a gardener. | Flower urns, small bells | c_gong_golem again on bar 56 (same boss as Day Lawn: a new boss or a variant is needed) | Walled-garden kit, bell tower, arches |

Every place also needs its crew, two elites and boss as 3D models. Today they are 2D pictures in
`docs/design/cast/img/chars` (D README). About 9-10 per place, about 85 in all, made the `game-character-3d` way. Shared
across places: the instrument case, the shrine kinds (re-dressed per place), the band.

### 5.3 The finale: boss on the drop, or vamp until the singer is ready

| | (A) As the web game (D) | (B) Megabonk-style vamp (his to decide) |
|---|---|---|
| When | At RUN - 40 s, the final boss comes on the drop or the next big moment (D onBar, `final_before_end_s` 40). | Once the band is complete and the clock passes RUN - 40 s, the song keeps looping the finale section (table 5.2) instead of going on. The main stage opens (curtain up, light pillar, edge arrow pointing to it). |
| Start | Automatic | The singer steps onto the main stage; the band climbs up into stage positions; on the next bar line the song goes into the drop and the boss enters on its downbeat. |
| Waiting has a cost | n/a | The crowd keeps thickening while the song vamps, as Megabonk's final swarm does (M section 5: HP term 4^(t/60) - 1; ours softer, set by the bot check). |
| Fits rulings | Yes | Yes: the vamp plays only the parts you own; all parts are owned by then. The full song is heard first in the vamp, then the drop. |
| Open within (B) | | Does the curtain open by itself after N vamp loops? Does the band stay on the stage as a fixed group while the singer fights round it, or step down with her? |


---

## 6. Art

### 6.1 What exists

#### The 3D cast today (D)

| Set | Where | What it is | Rig | Moves | Mouth |
|---|---|---|---|---|---|
| New-look cast, 163 models | `unity/Assets/Battler/Resources/BattlerModels/cards/<id>.fbx` + `.png` + `.face.json` | TRELLIS meshes from the vinyl-toy pictures (`E:/music-battler-work/cards3d`, progress.md "done 164, failed 36"). Measured on 6: 11,276 to 15,198 triangles, 1024 px texture | none (0 LimbNode in every card fbx, grep) | code only: `Scripts/ThreeD/CastMotion.cs` plays idle, entry, hit, cheer (+ 30-degree spin) from `cards/motion.json` (318 cards, 10 styles, a size each) | `face.json` mouth box + `mouth` empty; `Scripts/Bg/BgMouth.cs` draws a 9-cell family atlas (closed, small, ah, oh, ee, smile, frown, cheer, hurt) from `Resources/BattlerMouths/mouths-<family>.png` (13 families, 2304x256) |
| Leaders, 61 models | `.../BattlerModels/leaders/` | same TRELLIS route | none | same CastMotion | face.json |
| Old-look musicians, 24 + 6 | `unity/Assets/Battler/Models/{bellforge,stormsong}/` | Meshy, 3D toon (pre vinyl look) | yes (74 rig records in drums.fbx) | full clip sets in `clips.json`: idle, play_light, play_heavy, solo, block, hit, hit_big, ko, spawn, starup, win, lose | none (sculpted) |

The old-look musicians are superseded: "every visual is redone to the locked look" (R 2026-11-21). Their beat-timed
`clips.json` format (hits in seconds at 100 BPM, speed = BPM/100) is reusable as the move timing format (D).
Known on the TRELLIS cast: "the TRELLIS backs are unpainted" (D, `docs/design/cast-motion.md`, rulings after bg47);
two cards keep `spin: false` because their backs showed white.

#### Per character (D)

How the web game's pictures map to cast ids: the 15 band pictures and the 10 Sneaky crew pictures (`p_*`) were matched
pixel to pixel against the cut figures in `E:/music-battler-work/cards3d/*/cut/` (mean difference 0.001 to 0.011, next
best 0.095 or more); the other 8 places name the cast id in `level.json` (`c_<id>`).
Legend: U = in Unity `cards/`; M4 = idle, entry, hit, cheer from CastMotion (no clips, no rig); mouth fit = `face.json`
written by the cards3d mouth step; size and style = `cards/motion.json`. Rig is "no" for every one.

| Place | Slot | Cast id | 3D model | Rig | Moves | Mouth fit | Size, style |
|---|---|---|---|---|---|---|---|
| band | Lead singer (you) | moss_riffer | yes (U) | no | M4 | yes | 0.94 jelly_wobble |
| band | Drums | bar_rattler | yes (U) | no | M4 | yes | 1.1 fluffy_bob |
| band | Bass | grizzled_bassist | NO (picture cut only: low_end/cut) | no | - | no | 1.16 fluffy_bob |
| band | Guitar | sixstring_courier | NO (TRELLIS glb, no game step: overdrive/models) | no | - | no | 1.1 nervous_jitter |
| band | Strings | crest_violist | NO (picture cut only: strings/cut) | no | - | no | 1.02 noodle_wiggle |
| band | Brass | muster_trombone | NO (TRELLIS failed: "wrote no glb") | no | - | no | 1.06 heavy_stomp |
| band | Woodwinds | bristle_distortion | NO (TRELLIS glb, no game step: overdrive/models) | no | - | no | 1.1 fluffy_bob |
| band | Keys | requiem_organist | yes (U) | no | M4 | yes | 1.1 proud_sway |
| band | Shaker | powder_monkey | yes (U) | no | M4 | yes | 0.98 nervous_jitter |
| band | Synth | mind_hum | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| band | Suno's singer (Diva) | masquerade_mezzo | yes (U) | no | M4 | yes | 1.1 springy_bounce |
| band | Bom | skip_chorister | yes (U) | no | M4 | yes | 0.9 nervous_jitter |
| band | Doo-wah | grand_chorale | yes (U) | no | M4 | yes | 1.16 proud_sway |
| band | Scat | hail_shredder | yes (U) | no | M4 | yes | 0.98 jelly_wobble |
| band | Crooner | kettle_crooner | yes (U) | no | M4 | yes | 1.06 springy_bounce |
| sneaky | enemy1 | pl_cabin_boy | yes (E only: shanty/game) | no | M4 | yes | - |
| sneaky | enemy2 | pl_seal_pup | yes (E only: shanty/game) | no | M4 | yes | - |
| sneaky | enemy3 | pl_peg_leg_pogo | yes (E only: shanty/game) | no | M4 | yes | - |
| sneaky | enemy4 | swaggering_mate | yes (U) | no | M4 | yes | 1.1 proud_sway |
| sneaky | enemy5 | lockpick_hand | yes (U) | no | M4 | yes | 1.1 nervous_jitter |
| sneaky | enemy6 | cloud_commodore | yes (U) | no | M4 | yes | 1.16 proud_sway |
| sneaky | enemy7 | cutlass_baritone | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| sneaky | elite | brig_breaker | yes (U) | no | M4 | yes | 1.04 heavy_stomp |
| sneaky | elite | grasping_purser | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| sneaky | boss | black_flag_chief | yes (U) | no | M4 | yes | 1.16 proud_sway |
| day-lawn | enemy1 | glad_hummer | yes (U) | no | M4 | yes | 0.92 noodle_wiggle |
| day-lawn | enemy2 | tiny_peep | yes (U) | no | M4 | yes | 0.96 fluffy_bob |
| day-lawn | enemy3 | rite_singer | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| day-lawn | enemy4 | tomorrow_soprano | yes (U) | no | M4 | yes | 1.22 jelly_wobble |
| day-lawn | enemy5 | fungal_sage | yes (U) | no | M4 | yes | 1.08 springy_bounce |
| day-lawn | enemy6 | rooster_herald | yes (U) | no | M4 | yes | 0.98 float_drift |
| day-lawn | elite | bell_bear | yes (U) | no | M4 | yes | 1.0 springy_bounce |
| day-lawn | elite | big_hat_brigand | yes (U) | no | M4 | yes | 0.96 springy_bounce |
| day-lawn | boss | gong_golem | yes (U) | no | M4 | yes | 0.94 heavy_stomp |
| canal | enemy1 | seaweed_steward | yes (U) | no | M4 | yes | 1.12 proud_sway |
| canal | enemy2 | reef_augur | yes (U) | no | M4 | yes | 0.94 jelly_wobble |
| canal | enemy3 | silt_hummer | yes (U) | no | M4 | yes | 0.94 springy_bounce |
| canal | enemy4 | island_whistler | yes (U) | no | M4 | yes | 0.98 stack_topple |
| canal | enemy5 | cart_hand | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| canal | enemy6 | drone_scout | yes (U) | no | M4 | yes | 1.06 noodle_wiggle |
| canal | elite | shackled_hand | yes (U) | no | M4 | yes | 1.02 nervous_jitter |
| canal | elite | cutlass_baritone (also sneaky) | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| canal | boss | dread_fundamental | yes (U) | no | M4 | yes | 1.36 heavy_stomp |
| night-market | enemy1 | dusk_stalker_alto | yes (U) | no | M4 | yes | 1.06 springy_bounce |
| night-market | enemy2 | night_murk | yes (U) | no | M4 | yes | 1.06 noodle_wiggle |
| night-market | enemy3 | shadow_cantor | yes (U) | no | M4 | yes | 1.32 heavy_stomp |
| night-market | enemy4 | omen_cantor | yes (U) | no | M4 | yes | 1.1 proud_sway |
| night-market | enemy5 | twin_throat | yes (U) | no | M4 | yes | 1.02 noodle_wiggle |
| night-market | enemy6 | masked_hummer | yes (U) | no | M4 | yes | 1.06 noodle_wiggle |
| night-market | enemy7 | void_courier | yes (U) | no | M4 | yes | 1.02 nervous_jitter |
| night-market | elite | pallbearer_chant | yes (U) | no | M4 | yes | 1.22 float_drift |
| night-market | elite | marrow_psalmist | yes (U) | no | M4 | yes | 1.1 float_drift |
| night-market | boss | pit_bellower | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| harbour-fog | enemy1 | fog_choir | yes (U) | no | M4 | yes | 1.08 float_drift |
| harbour-fog | enemy2 | drifting_throat | yes (U) | no | M4 | yes | 0.98 float_drift |
| harbour-fog | enemy3 | ghost_overtone | yes (U) | no | M4 | yes | 1.02 float_drift |
| harbour-fog | enemy4 | whisper_abyss | yes (U) | no | M4 | yes | 1.16 jelly_wobble |
| harbour-fog | enemy5 | veiled_kargyraa | yes (U) | no | M4 | yes | 1.22 noodle_wiggle |
| harbour-fog | enemy6 | abyss_precentor | yes (U) | no | M4 | yes | 1.06 float_drift |
| harbour-fog | elite | harbor_taxman | yes (U) | no | M4 | yes | 1.06 jelly_wobble |
| harbour-fog | elite | grasping_purser (also sneaky) | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| harbour-fog | boss | tine_toad | yes (U) | no | M4 | yes | 0.94 springy_bounce |
| rooftops | enemy1 | rain_step_singer | yes (U) | no | M4 | yes | 1.02 jelly_wobble |
| rooftops | enemy2 | drainpipe_runaway | yes (U) | no | M4 | yes | 1.1 nervous_jitter |
| rooftops | enemy3 | tok_echo | yes (U) | no | M4 | yes | 0.84 springy_bounce |
| rooftops | enemy4 | sharp_harmonic | yes (U) | no | M4 | yes | 1.02 jelly_wobble |
| rooftops | enemy5 | frost_throat | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| rooftops | enemy6 | overtone_lancer | yes (U) | no | M4 | yes | 1.18 jelly_wobble |
| rooftops | elite | tower_knell | yes (U) | no | M4 | yes | 1.06 float_drift |
| rooftops | elite | watchtower_soprano | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| rooftops | boss | thunder_ox | yes (U) | no | M4 | yes | 1.08 heavy_stomp |
| lantern-night | enemy1 | tok_ember | yes (U) | no | M4 | yes | 0.84 float_drift |
| lantern-night | enemy2 | warm_dirge | yes (U) | no | M4 | yes | 1.06 float_drift |
| lantern-night | enemy3 | forge_riser | yes (U) | no | M4 | yes | 1.16 jelly_wobble |
| lantern-night | enemy4 | elegy_teller | yes (U) | no | M4 | yes | 1.06 proud_sway |
| lantern-night | enemy5 | ever_cantor | yes (U) | no | M4 | yes | 0.98 proud_sway |
| lantern-night | enemy6 | gilded_chanter | yes (U) | no | M4 | yes | 0.86 jelly_wobble |
| lantern-night | elite | reliquary_cantor | yes (U) | no | M4 | yes | 1.1 float_drift |
| lantern-night | elite | requiem_copyist | yes (U) | no | M4 | yes | 1.06 float_drift |
| lantern-night | boss | crimson_knell | yes (U) | no | M4 | yes | 0.98 float_drift |
| marsh | enemy1 | mire_gatherer | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| marsh | enemy2 | murk_singer | yes (U) | no | M4 | yes | 1.02 noodle_wiggle |
| marsh | enemy3 | acid_gargler | yes (U) | no | M4 | yes | 1.1 jelly_wobble |
| marsh | enemy4 | lazy_drone | yes (U) | no | M4 | yes | 1.02 nervous_jitter |
| marsh | enemy5 | drone_feeder | yes (U) | no | M4 | yes | 1.04 noodle_wiggle |
| marsh | enemy6 | clinging_hum | yes (U) | no | M4 | yes | 1.06 jelly_wobble |
| marsh | enemy7 | dirge_spinner | yes (U) | no | M4 | yes | 1.16 float_drift |
| marsh | elite | chamber_droner | yes (U) | no | M4 | yes | 1.1 noodle_wiggle |
| marsh | elite | scythe_hand | yes (U) | no | M4 | yes | 1.18 stack_topple |
| marsh | boss | bulwark_keener | yes (U) | no | M4 | yes | 1.22 heavy_stomp |
| bell-garden | enemy1 | bell_teacher | yes (U) | no | M4 | yes | 0.98 proud_sway |
| bell-garden | enemy2 | bellows_imp | yes (U) | no | M4 | yes | 1.02 float_drift |
| bell-garden | enemy3 | circle_caller | yes (U) | no | M4 | yes | 1.16 proud_sway |
| bell-garden | enemy4 | toll_counter | yes (U) | no | M4 | yes | 0.94 float_drift |
| bell-garden | enemy5 | tally_singer | yes (U) | no | M4 | yes | 1.06 springy_bounce |
| bell-garden | enemy6 | split_takings | yes (U) | no | M4 | yes | 1.02 springy_bounce |
| bell-garden | elite | growl_cantor | yes (U) | no | M4 | yes | 1.06 proud_sway |
| bell-garden | elite | heartsick_crooner | yes (U) | no | M4 | yes | 1.08 jelly_wobble |
| bell-garden | boss | gong_golem (also day-lawn) | yes (U) | no | M4 | yes | 0.94 heavy_stomp |

Count: 96 distinct characters (15 band, 81 crew; three appear twice). 91 have a game-ready model with a mouth fit
(88 in Unity, 3 on E: only). 5 have none: all five are band members. 0 are rigged. 0 have walk, play-on-note,
held-note lean or death moves in 3D.

Mouth fits in 3D are `face.json` + the `mouth` empty; the web game's `MOUTH` table (index.html line 210, `mouths.json`)
holds 2D picture positions and does not carry over (D). The web game already keeps per-member `lean` and `jump`
(index.html lines 332, 393), the 2D form of the held-note lean and the play-on-note hop (D).

Sizes are card sizes, not survivors sizes: Day Lawn's and Bell Garden's boss (gong_golem 0.94) is smaller than its own
elites and four of its crew (D). The 3D game needs a slot scale on top: enemy x1, elite xE, boss xB (I: E 1.3, B 2.0, set
by the look gate, not by taste).

### 6.2 What is missing, grouped and sized

| Group | Count | Moves per character | Route (skill) | Notes |
|---|---|---|---|---|
| A. Sneaky crew into Unity | 3 (pl_cabin_boy, pl_seal_pup, pl_peg_leg_pogo) | 7 (by style) | none: copy E:/.../shanty/game files with `unity/tools/import_cast.py`; add their rows to `work/cast/make_motion.py` OVERRIDES (they have no motion.json row) | free |
| B. Band members with no model | 5: bass (grizzled_bassist), guitar (sixstring_courier), strings (crest_violist), brass (muster_trombone), woodwinds (bristle_distortion) | 7 | 1st: the cast's own route (cards3d, local TRELLIS, free): guitar and woodwinds need only the game/mouth step on the glbs they have; bass and strings need a TRELLIS run from their cuts; brass needs a new seed (`requeue.json id@seed`), then a new picture if it fails again. 2nd, if TRELLIS fails twice: game-character-3d (drawn front/side/back sheet, Meshy multi-image-to-3D, cut keeping Meshy's texture; no Meshy rig, see C) | the band is the product (each member is a part of the song), so all 15 must exist before any run is played in 3D |
| C. Band backs | 15 | - | The camera sits behind the singer (M: 11 units behind), so the band's backs are on screen all run, and TRELLIS backs are unpainted (D, cast-motion.md). 1st: repaint backs from the front texture (free; the models chat's planned repaint for seaweed_steward and pt_rib_whisper). 2nd: game-character-3d sheet with a drawn BACK view + Meshy multi-image for the 15 | crew mostly face the camera as they come at you; their backs matter less (I) |
| D. Moves | 10 styles x 7 moves = 70 move rules, used by all 96 through data | 7: idle, walk/hop, play-on-note, held-note lean, hit, death, cheer | Whole-body squash and stretch in code (CastMotion + the ToyVinyl vertex bend), the form he ruled (R 2026-11-22). Existing: idle, hit, cheer, entry. New: walk/hop (the style's walk line in cast-motion.md: "tick-tick walk", "walk in tall and bow"), play-on-note (a squash pulse on each note of the member's part, from notes.json), held-note lean (lean for the note's length, as web `lean`), death (pop and shrink, as the old `ko` "shrinks to nothing over its last half beat"). character-motion's pack and rule routes do not fit: these bodies are unrigged blobs, and the skill lists "Pack arms on chibi bodies (always failed)" | every move lands on the beat (R feel rules, cast-motion.md). Each style ends in a labelled clip (character-motion "Clip to produce") at the game camera |
| E. Limb moves (only if he asks) | up to 96 | as D, with arms | game-character-3d steps 6-8: Meshy rig 5 credits, rebind, hand-keyed moves; needs a body Meshy can rig, which TRELLIS blobs are not proven to be | not in the plan by default (I) |

Per character, the size is the card's `size` times the slot scale; squash keeps volume (width 1/sqrt(1 - s)), and hop and
sway are shares of body height so a colossus never leaves the screen (D, cast-motion.md "Rules for the build").

### 6.3 Places

Nine places, each with a ground colour and accent in `level.json` (D): Sneaky Harbour #1E524C/#FF5FA2, Day Lawn
#2F6E45/#FFD84A, Canal #1F5A6E/#7FE3FF, Night Market #2B2350/#C9A2FF, Harbour Fog #36505A/#BFE8F0, Rooftops
#44506A/#FFB347, Lantern Night #3A2340/#FF8A3D, Marsh #2E4A3A/#9AF3FF, Bell Garden #5A4A2A/#FFE680.
Megabonk for scale (M, section 3 and the chest table): arenas 600 to 770 units a side, about 46 chests, 14 shrines, 40
small pots per stage. Our arena size comes from part B's gameplay numbers, not from this section.

#### What each place needs (I)

| Piece | Per place | Shared | Notes |
|---|---|---|---|
| Ground set: base texture with tone, 3 to 4 detail decals, an edge/boundary piece | 1 set | - | painted, never one flat colour (the "no flat ground" rule of dota-way-vfx is written for floors; the ground follows the same bar) |
| Landmark (seen from anywhere: ship, bridge, market arch, lighthouse, water tower, lantern tree, reed hut, belfry, bandstand) | 1 | - | 9 total |
| Props (barrels, crates, lamp posts, reeds, chimneys, stalls) | 4 to 6 unique | 10 shared (rocks, fences, bushes, lights) | about 46 unique + 10 shared |
| Instrument case (the chest) | - | 3 looks (plain, elite, boss) | drops from elites and mini-bosses (D, README) |
| Shrine / busker stage | - | 2 | a small stage piece |
| Breakables (Megabonk pots) | - | 2 | music boxes, drums |
| Pickups: note (XP), snack (heal), magnet | - | 3 | |

Total about 75 pieces, of which about 65 are 3D models.

#### Route, Toybox first (D)

| Source | What | Fit |
|---|---|---|
| Music Battler ToyStage (`unity/Assets/Battler/Art/ToyStage`, SOURCES.md) | procedural deck, risers, speakers, poles, string lights, bunting, crowd blobs; ToyVinyl and ToyContact shaders; all ours | already the vinyl look: the busker stage, the shrine and the Day Lawn / Night Market dressing start here |
| Music Battler venue props (`unity/Assets/Battler/VenueModels/props`, 14 Meshy: amp, anvil, bell, bellows, brazier, ferns, horncrate, lantern, menhir, rocks, runelamp, totem, 2 crowds) | 3D-toon look (pre vinyl) | candidates only after a look check under ToyVinyl |
| Toybox packs (`toybox/assets/catalog/packs.json`) | Hivemind Stylized Nature, Environment Mega Bundle Summer Edition (Asset Store EU), Flat Kit toon water | Flat Kit water for Canal, Harbour, Marsh; Hivemind nature for Day Lawn and Marsh plants, re-shaded with ToyVinyl and judged at the game camera |
| Synty packs (same catalog) | low-poly, faceted | no: does not match the soft vinyl look; also ai_restricted (dota-way-vfx) |
| Made | anything else | game-character-3d "Props and plants the same way": sheet (about 0.05 USD) + Meshy multi-image (30 credits), no rig. Its lessons apply: the sheet must show real depth (three copies of one flat drawing make a card), wall tiles are the hardest case, buy ONE prop first and look at it from four cameras. Free alternative: the cast's local TRELLIS route from one picture, with the unpainted-back fault |

Order (I): Day Lawn whole (ground, landmark, props, shared pieces) through the look gate first, then the other eight.

### 6.4 Effects (dota-way-vfx)

Rules carried in (from the skill): painted layers matched to a decoded Dota or Deadlock reference, sized from gameplay
data, proven side by side at the game camera, one effect at a time; every passed effect's parts go to
`C:/Dev/toybox/assets/fx` the same day. Starting stock (D): 70 effect defs in
`unity/Assets/Battler/Fx/Resources/FxDefs` (bg_atk_bass/brass/drums/keys/strings/voice, bg_notes_*, bg_heldnote,
bg_heldnote_break, mb_hit_light/medium/heavy/tick, mb_ko, mb_drop, mb_link, mb_solo, mb_coins, bg_cheer, bg_summon,
bg_tierup ...), proven for the card battler at 390x844 and 1600x900 (side-session notes visual-fx.md). None is proven at a
survivors chase camera; each is re-proven there.

Sizes from the web game (D, index.html lines 478 to 508), web px / 13 = m (part B): level 1 to 5.

| # | Effect | Gameplay size | Start from | Candidate reference (to decode and pick) |
|---|---|---|---|---|
| 1 | Lead: bubbles (1 to 3) | aim range 380 px = 29 m | bg_atk_voice | Puck Illusory Orb |
| 2 | Drums: ring pulse | R (72 + 14 lv) px = 6.6 to 11 m, 0.26 s; x0.55 to 1 by note length | bg_atk_drums | Centaur Hoof Stomp |
| 3 | Bass: heavy shot, pierces 1 + lv | radius (14 + 1.5 lv) px, 235 px/s, 2.4 s | bg_atk_bass | Mirana Sacred Arrow |
| 4 | Brass: cone blast | R (118 + 14 lv) px = 10 to 14 m, half angle 0.4 + 0.06 lv rad | bg_atk_brass | Drow Ranger Gust |
| 5 | Strings: piercing line (1 to 3) | range 560 px = 43 m | bg_atk_strings | Windranger Powershot |
| 6 | Woodwinds: homing notes (1 to 3) | - | bg_notes_* | Tinker Heat-Seeking Missile |
| 7 | Guitar: chain zap | 2 + lv links, 300 px = 23 m | mb_link | Zeus Arc Lightning |
| 8 | Keys: chord stars (up to 6 targets) | 380 px = 29 m | bg_atk_keys | Mirana Starstorm |
| 9 | Shaker: tambourine toss (1 to 2) | 320 px = 25 m | new | Troll Warlord Whirling Axes (ranged) |
| 10 | Synth: beam | L (220 + 30 lv) px = 19 to 28 m | new | Phoenix Sun Ray |
| 11 | Diva: siren ring, slows | R (110 + 16 lv) px = 10 to 15 m, 0.4 s | bg_atk_voice | Crystal Maiden Crystal Nova |
| 12 | Bom: push bubble | radius (22 + 4 lv) px, 140 px/s, 1.6 s | new | Tusk Snowball |
| 13 | Doo-wah: orbit bubbles (1 to 3) | - | new | Death Prophet Exorcism |
| 14 | Scat and Crooner: bubble spray (5 + 2 lv) | 260 to 360 px/s | new, one def, two skins | Venomancer Venomous Gale |
| 15 | Held-note wave (an arc rolling out for the note's length, README) | note length from notes.json | bg_heldnote, bg_heldnote_break | Earthshaker Fissure (rolling front) |
| 16-21 | Combos: Groove, Horn section, Harmony, Power chord, Light show, In the pocket | combo numbers in levels/game.json | new, fired only on shared notes (README) | one per combo, picked at the time |
| 22-25 | Hits: tick, light, medium, heavy | - | mb_hit_* | each family's basic-attack impact |
| 26-28 | Deaths: crew pop, elite, boss | - | mb_ko | Dota creep death, Roshan death |
| 29-33 | Pickups: note (XP), magnet pull, snack heal, instrument case open, case reward beam | - | mb_coins, bg_gold | Bounty rune, Aegis pickup |
| 34-38 | Events: drum-fill ring telegraph, elite entrance (chorus downbeat), mini-boss entrance, the drop / final boss entrance, member joins the band | - | mb_drop, bg_summon | Underlord Dark Rift, Roshan respawn |
| 39-41 | Singer: hit, level up, get back up once | - | bg_hero_hit, bg_tierup | - |

About 41 effects: about 16 start from a def we have, about 25 need new painted layers. Order (I): the drums ring and the
lead's bubbles first (the run starts with the lead alone, then drums is the first perk), each through its side-by-side
before the next.

### 6.5 The look on phone and PC

#### Camera and size on screen (I, from M and D)

A character's height on screen in CSS px = screen height x body height / (2 x distance x tan(vertical FOV / 2)).
Body height = 1.45 world units x card size (D, motion.json "TargetH 1.45"). Phone held sideways at 874x402 CSS (the
game-character-3d look gate size).

| Camera | Size 1.0 on phone | Size 0.84 (smallest) | Size 1.36 (biggest) | PC 1600x900, size 1.0 |
|---|---|---|---|---|
| Megabonk as decoded: 11 behind, FOV 85 (M) | 29 px | 24 px | 39 px | 65 px |
| 11 behind, FOV 60 | 46 px | 39 px | 62 px | 103 px |
| 9 behind, FOV 60 | 56 px | 47 px | 76 px | 125 px |

The cast's floor is 40 px on a phone (D, cast-motion.md: "the game's 40 px floor at 844x390"); Megabonk's own numbers
put our whole cast under it. Whether Megabonk's FOV 85 is vertical was not decoded (M lists it as a setting), and
Megabonk's own character height was not measured: read both with UnityPy before the camera is set (reverse-engineer-
anything). Pitch: a high fixed pitch hides painted mouths (game-character-3d: a brim hides the face at the 58-degree
match camera); a chase camera shows the band's backs (group C).

#### Readability (R 2026-11-20 concerns: size, visibility, distinct)

| Problem | Plan (I) |
|---|---|
| Finding the singer in 270 enemies (levels/game.json cap 270; Megabonk 400, M) | the singer biggest of the band on screen, a ring under its feet in the lead's colour, never covered by own effects (dota-way-vfx readability: at most 10% of pixels above .95 value at peak) |
| Band vs crew | band: contact shadow plus a teal rim (the ToyVinyl `_Edge`, built as Encore's teal glow); crew: no rim. Colour carries team, not the body |
| Distinct members | the web game's family colours (index.html FAM `col`) on each member's ring and shots |
| Outlines | the approved vinyl look has none: ToyVinyl is "No cel steps, no outline" and "the cast has no outline pass" (D, ToyVinyl.shader). BattlerToon's inverted-hull outline (width 0.025) exists if the look gate fails on separation |
| Mouths at phone size | band mouths sing their part's notes (BgMouth, notes.json); crew show smile and hurt only (I, cheaper in a crowd) |
| Contact shadows | required on the whole cast (D, cast-motion.md ruling 4) |

#### The vinyl look in URP (D)

ToyVinyl (soft key light, warm fill, gloss, soft rim, vertex jelly bend from UnitSlot3D) is the cast and stage shader;
it is SRP-Batcher shaped (UnityPerMaterial cbuffer) and has no instancing variant. Phone cost of its gloss, rim and bend
is not measured.

#### Crowd rendering (I)

- All cast moves are whole-body (CastMotion: lift, hover, squash, roll, yaw, plus the shader bend). So a crowd needs no
  skinning and no vertex animation textures: one instanced draw per crew type (6 to 10 types per place), each instance
  carrying its matrix, squash, bend, phase and mouth cell. Add an instanced ToyVinyl variant (or BatchRendererGroup).
  Vertex animation textures come in only if a limb rig is ever added (group E).
- LODs: today 11k to 15k triangles per model; 270 of them is about 3.8 million. game-character-3d measured 6,000 as
  round at phone size and 3,000 as faceted: LOD0 6,000 (band, elites, bosses, the nearest crew), LOD1 about 2,500, LOD2 a
  camera-facing picture (BackPictures.RenderAll already renders model pictures for billboards, art-direction notes
  2026-11-20). Crew textures 512 px (game-character-3d tiers T1 to T3).
- Budget to prove on the phone, not assumed: the minute 11 to 14 horde (200 weak enemies, README) with the full band and
  every effect at 60 fps.

#### The look gate (I, from game-character-3d "The look gate" and dota-way-vfx "The bar")

Passes only when all hold, read at full size by the lead and the Art director, never from thumbnails:
1. Phone 874x402 CSS at DPR 3 (2622x1206) and PC 1600x900, moving clip and stills, at the real game camera.
2. Scene: the full 15-member band in the minute 11 to 14 horde of one place, an elite and a boss on screen.
3. Every character at least 40 CSS px tall on the phone; the singer found in under 1 s on a fresh still.
4. Each band member named correctly from the phone still by someone who knows the cast (distinct, R 2026-11-20).
5. No white back, no T-pose, no character standing in a prop; mouths sit in the face while singing.
6. Each effect beside its decoded reference frame without looking cheaper.
Reports say which pictures were opened and at what scale (game-character-3d).

### 6.6 Cost and time per group (I)

Prices from the skills and the spend log: a picture about 0.05 USD; Meshy 30 credits a body, 5 a rig; about 0.02 USD a
credit (toybox/ai/spend.jsonl). Meshy runs on held credits only, never a top-up (game-character-3d). Last balance on
record: 2,199 on 2026-11-20 (art-direction notes), then 420 approved for venue props on 2026-11-21 (DECISIONS), so about
1,779 if all of that was used; read the live balance before any ask. Work time assumes one chat on it, one effect and
one character right first, then the rest.

| Group | Free route | Paid route (if the free one fails or he picks it) | Time |
|---|---|---|---|
| A. 3 Sneaky crew into Unity | copy + motion rows | - | 1 hour |
| B. 5 band models | TRELLIS (local GPU) + mouth step | 5 sheets 0.25 USD + 150 credits (3 USD) | 1 to 2 days with the look gate |
| C. 15 band backs | back repaint | 15 sheets 0.75 USD + 450 credits (9 USD) | 1 to 2 days free; 2 to 3 days paid |
| D. 70 move rules (10 styles x 7) | code | - | 3 to 4 days with a labelled clip per style |
| E. Limb rigs | - | 5 credits each (480 for 96) plus re-keying | not planned |
| Places, Day Lawn first | ToyStage parts, Toybox nature and water | ground 4 pictures 0.20 USD; landmark + 6 props + 8 shared pieces = 15 x (0.05 USD + 30 credits) = 0.75 USD + 450 credits | 3 to 4 days |
| Places, other 8 | same, TRELLIS props (backs unpainted) | ground 32 pictures 1.60 USD; about 50 pieces = 2.50 USD + 1,500 credits | 2 to 3 days each |
| Effects, about 41 | 16 ports of our defs | about 25 new x 4 painted sheets = about 100 pictures, 5 USD | half a day to a day each: 20 to 30 days in order |
| Look: camera, instanced ToyVinyl, LODs, gate | code | - | 4 to 6 days |

All paid routes together: about 11 USD in pictures and 2,550 credits (about 51 USD), which is more than the credits
on record (about 1,779). Every Meshy body path needs his OK with the count first.


---

## 7. Audio

### 7.1 The default (R LESSONS 2026-11-24 and 2026-11-25; song-stems skill; Band Survivors DECISIONS Music)

| Rule | In the 3D game |
|---|---|
| One Suno song per level, split into its stems | Unity imports the same part set; never parts from separate generations. |
| Each member owns one part | One AudioSource per part. |
| Heard only while owned | Gain 0 until the member joins; up on the next bar line. Nothing unowned is ever audible: no house band, no quiet full-song floor (R Pull Lanes row 89, song-stems 8). |
| Lead singer dry, up front; backing voices keep a little room | Comes from the set (voices_fit.py --dry); Unity adds no reverb to voice_lead. |
| Our voices fitted in; Suno's own singer can be a part (Harbour Fog `vocals`, D) | No change. |
| Attacks on each part's notes, even before its stem is audible | `notes.json` events per member against the audio clock. |
| The full song is the reward | Only when all parts are owned. |
| No sound effects today | The web game has none (D). Any hit or pickup sound is a new decision (list below). |

### 7.2 How it runs in Unity at DSP-clock timing (I, from the web code in `startSong`, `setLayer`, `songRaw`)

| Piece | How |
|---|---|
| Source files | The wavs in each level's `set_folder` (D README), not the web mp3s: mp3 adds encoder delay that shifts parts and breaks loops. All parts the same sample rate and the same length in samples. |
| Clip layout | Each part cut on bar lines into an intro clip (0 to loop start) and section clips (one per finale or loop section), cut at the same sample positions for every part (positions from `first_downbeat_s` + n x `bar_seconds`, rounded once, shared by all parts). A build check asserts equal sample counts per section across parts. |
| Start | One `dspStart = AudioSettings.dspTime + 0.2`. Every part's intro clip: `PlayScheduled(dspStart)`. All parts always play, unowned at gain 0, so they can never drift apart. |
| Looping and the vamp | Two AudioSources per part (A and B, 26 for 13 parts). The next section clip is scheduled on the idle source with `PlayScheduled(end of current)` and the current one with `SetScheduledEndTime`, at least one bar ahead. Looping = schedule the same section again; vamp = keep scheduling the finale section; leaving the vamp = schedule the drop section on the next bar. Same mechanism for all three. |
| Gain on the next bar | Web: `setTargetAtTime(gain, nextBar, 0.02)` (D). Unity's `AudioSource.volume` and mixer `SetFloat` are not schedulable. A small per-part gain filter (`OnAudioFilterRead`) holds a list of (dspTime, target) and ramps over 20 ms starting at the exact sample of the bar line. Fallback if that costs too much on device: set volume from the main thread one buffer before the bar (up to one frame late). |
| Master level | Web keeps loudness steady as parts join: bus = 0.95 / (1 + 0.06 n) into a limiter at -2 dB, ratio 20 (D). Unity: mixer master volume by script, the mixer's Compressor at the same settings. |
| Notes | Song position `pos = smoothDsp - dspStart - latency`, mapped into the loop like web `pos()`. Each frame, fire every note with time in (lastPos, pos], binary search per part as web `eachIn` (D); catch-up capped at 0.25 s as web does. Never Time.time or summed deltaTime. |
| Smoothing the clock | `AudioSettings.dspTime` moves in buffer-sized steps (10-40 ms). Between steps, advance by `Time.unscaledTimeAsDouble`, re-anchor on each step, never move backwards. |
| Latency compensation | Web subtracts `outputLatency` (D `lat()`). Unity: buffer latency from `AudioSettings.GetDSPBufferSize` (length x count / sample rate) plus a per-platform default plus a player offset slider. Attacks land when the note is heard, not when it is mixed. The music itself never shifts; only the visuals and hits do. Re-read on Bluetooth connect (100-300 ms more). |
| Level-up cards | Web keeps the song playing while the card is up and skips the notes it missed (`lastU = songRaw()` on choose, D). Unity: `Time.timeScale = 0` for the card; audio keeps running (timeScale does not touch AudioSources); on choose set lastPos = pos. |
| New member | Joins on the next bar line (web `enterU = nextBarCtx()`, D): its gain ramp and its first attack both start there. |
| Pause | Read the sample position of the song, stop every source. On resume, reschedule every part at `now + 0.2 s` from that position (`timeSamples` set before `PlayScheduled`), recompute dspStart, re-apply owned gains. One path for pause, app to background, phone call, Siri, headphones out. |
| Mobile interruptions | iOS: the web shell uses the playback audio session (commit 92e2a29); Unity's default iOS session follows the silent switch, so a small native plugin sets playback. `OnApplicationPause(true)` saves the position; `AudioSettings.OnAudioConfigurationChanged` (device change, Bluetooth) is treated as an interruption and goes through the resume path. Android: Best latency buffer setting, resume path on focus loss. |
| Memory (13 parts) | Longest part file 157 s (Rooftops), D. 13 parts at 150 s: PCM16 mono about 172 MB (Harbour Fog), ADPCM about 49 MB, Vorbis about 15 MB. Load type Compressed In Memory, not Streaming (13-26 streams and less exact starts). Vorbis for voice_lead and the voices (quality), ADPCM for drums and percussion (cheap decode, fine on hits); measure CPU of 13 Vorbis decoders on the lowest target phone before deciding the rest. Load in background with the level; unload the previous level's clips. |
| Voices | Project Settings > Audio: Max Real Voices at least 48 (26 music sources plus headroom), music sources priority 0 so they are never virtualised. |

### 7.3 Solos and combos add nothing new

| Event | What the mix does |
|---|---|
| Combo | Fires on the notes both stems already play (D); no new sound, no gain change. |
| Case solo (one bar, S40 fit 7) | On the next bar line, the other owned parts dip to about 0.35 for one bar and come back; the upgraded part stays at 1. Same scheduled gain path. |
| Gain rule (assert in code and a QA check) | A part's gain is only ever between 0 and its owned level; an unowned part is 0, always. Checked headless every run. |

### 7.4 Pitfalls

| Pitfall | Guard |
|---|---|
| Parts drifting apart | One dspStart, same sample rate and length, never stop an unowned part, never seek one part alone. |
| Game clock vs audio clock | Notes from the smoothed dspTime only; frame hitches fire the missed notes in one go (capped). |
| `Time.timeScale` | Slow motion and hit-stop never change audio pitch; nothing audio-related uses scaled time or `Invoke`. |
| MP3 padding and loop gaps | Import wavs; cut sections on shared sample positions. |
| Clip sample rate vs device rate (44.1 vs 48 kHz) | Unity resamples every part the same way; compute times in seconds from dspTime, positions from `clip.frequency`. |
| Device change stops audio | `OnAudioConfigurationChanged` goes through the resume path. |
| Vorbis decode cost on low-end Android | Measure; switch heavy parts to ADPCM. |
| Voice limit | Raise Max Real Voices; music priority 0. |
| WebGL, if ever | Unity WebGL has no `OnAudioFilterRead`, limited mixer support and loose scheduled playback. The web version stays the existing HTML game (`index.html`), which already does all of this in Web Audio. |


---

## 8. Platforms, controls and performance budgets

### 8.1 Controls

| Platform | Move | Camera | Jump | Attacks | Cards, menus | Replay (dev only) |
|---|---|---|---|---|---|---|
| PC keyboard and mouse | WASD / arrows | mouse orbit | Space | automatic, on the notes | 1/2/3 or click | ` (backquote) [replay SPEC] |
| PC pad (Xbox, DualSense) | left stick | right stick | A / Cross | automatic | d-pad + A | View / touchpad [replay SPEC] |
| Phone touch | one floating stick, anywhere on the lower two thirds (the web's drag stick) | none | none | automatic, no aim [genre-learnings s7] | tap | five taps on the version text [replay SPEC] |
| Steam Deck (M5) | as the pad | as the pad | as the pad | automatic | as the pad | as the pad |

Keyboard, mouse and pad are all live at once, and a pad plugged in after launch works on its first press (LESSONS
2026-11-16). Input System package (already in `music-battler/unity`, 1.19.0).

### 8.2 Frame and crowd budgets

| Budget | Phone (mid iPhone, A14/A15 class [ours]) | PC | Source |
|---|---|---|---|
| Frame time | 16.7 ms p95 (60 fps); never over 33.3 ms p99 | 16.7 ms p95 on a mid PC and Steam Deck; 8.3 ms p95 on his PC | [ours]; the PC 16.7 ms floor is the Hookwild lead's FPS floor |
| Sim (crowd, attacks, notes) main thread | 3 ms at 270 enemies | 2 ms at 1000 enemies | [ours] |
| Enemies alive | 270 (cap) + bosses; stress test 400 | 270 in play; stress test 1000 | [game.json cap]; [MB s4 max alive 400]; [genre-learnings 9.1 DRG:S about 1000] |
| How the crowd is drawn | VAT + GPU instancing, one draw per enemy type (at most 7 ranks + 2 elites per level), Burst jobs on plain arrays, no GameObject, Rigidbody or Animator per enemy; real Animators only for singer, band (<= 13) and bosses | same | animkit VatCrowd; [genre-learnings 9.1] |
| Draw calls (SRP batches) | <= 120 | <= 400 | [ours] |
| Triangles on screen | <= 350k | <= 2M | [ours] |
| Shadows | singer and band only; crowd gets instanced blob shadows | real-time on all | [ours] |
| Projectiles and effects | pooled, instanced, <= 400 live | <= 1500 live | [ours] |

### 8.3 Memory, build size, load time

| Budget | Phone | PC | Source |
|---|---|---|---|
| Peak memory (resident) | <= 900 MB | <= 2 GB | [ours]; Megabonk's own minimum is 2 GB RAM [genre-learnings 9.2] |
| Audio held for one level | about 16 to 20 MB (compressed in memory) | about 189 MB (decompressed) | section 8.4 |
| Install / download | <= 200 MB with the first 3 stops in the install; stops 4 to 9 download on first play (about 15 to 25 MB each: audio plus new crew) | <= 1 GB (Megabonk 500 MB [genre-learnings 9.2]) | 200 MB is Apple's cellular download prompt line [ours to verify]; estimate: 9 stops x about 16 MB audio = 145 MB, plus about 85 cast models and the engine, puts all 9 in one install at about 230 to 270 MB [arith, rough] |
| Cold start to title | <= 6 s | <= 4 s | [ours] |
| Level load (13 parts ready, crew loaded) | <= 4 s | <= 1.5 s | [ours] |

### 8.4 How Unity holds the parts

Size of one level's audio: a part is about 151 s (Day Lawn mp3 1,059,334 bytes at 56 kbps [arith]); the largest stops
have 13 parts [web README]. The web holds them decoded as 32-bit float, about 300 MB [web README].

| Load type | Memory for 13 parts of 151 s, mono | CPU while playing | Sync | Use |
|---|---|---|---|---|
| Decompress On Load (16-bit PCM in memory) | 151 x 48000 x 2 B = 14.5 MB a part, **189 MB** at 48 kHz (174 MB at 44.1 kHz) [arith] | none | sample-locked with PlayScheduled | **PC** (and the phone fallback at 32 kHz for non-lead parts: about 128 MB [arith]) |
| Compressed In Memory (Vorbis, about 64 kbps mono) | about 1.2 MB a part, **about 16 MB** [arith, rough] | one decoder per playing part: 13 at once, all the time (gain 0 parts still decode) | sample-locked with PlayScheduled | **phone**; decode cost measured at M4 |
| Streaming | a small buffer per clip | decode as above plus 13 file reads at once | start latency and seek risk on 13 streams; not tested | not used |

Load in Background on, Preload Audio Data on for the active level only, unloaded with the level's Addressables group.
Mono like the web (the set wavs are stereo; stereo on PC can be a later setting) [ours].


---

## 9. Milestones

Each milestone is small and playable, and passes its gate through `unity_cli.py check` (gates and tests on the warm
editor) before anyone else sees it; anything sent to Vyas also has its sound checked unmuted (LESSONS 2026-11-19).

**The bot check, carried over.** The sim is a plain C# assembly (no engine references; same idea as the gamekit Data
module) running the web's rules on the XZ plane at 50 Hz, with the web's two bots: kite (looks in 16 directions,
walks the emptiest, fights bosses at mid range, picks up notes when safe, takes new members) and idle (stands still)
[web README "The balance check"]. Runs as EditMode tests (`--test editor`), seeds deterministic, no audio, no drawing
(the web's SIM mode). **Target: the web sim's numbers** (`tools/sim-report.md`, `sim.mjs --json`), per stop at Open Mic
with the tour perks of that point:

| Stop | hard | Kite wins (web) | Median low health (web) | Idle knocked out (web) |
|---|---|---|---|---|
| Sneaky Harbour | 0.85 | 6/10 | 12% | 2:59 |
| Day Lawn | 0.85 | 8/10 | 71% | 3:22 |
| Canal | 1.00 | 9/10 | 64% | 2:40 |
| Night Market | 1.15 | 8/10 | 37% | 2:43 |
| Harbour Fog | 1.12 | 6/10 | 40% | 2:33 (at hard 1.00) |
| Rooftops | 1.15 | 7/10 | 22% | 4:38 |
| Lantern Night | 1.15 | 8/10 | 34% | 1:24 |
| Marsh | 1.15 | 6/10 | 18% | 0:48 |
| Bell Garden | 1.32 | 7/10 | 72% | 0:57 |

Parity rule [ours]: same pass as the web (kite wins at least 6 of 10, median low health under 75%, idle loses), and per
stop the kite win count within 2 of the web's, idle knock-out time within 25% of the web's, kills and level reached
within 15% of the web's `--json` means. If 3D needs a different `hard`, it goes in level.json only after the web sim
is rerun with it (one rule file).

| Milestone | Playable content | Gate: what is measured, pass number |
|---|---|---|
| **M0 Graybox** (PC, editor and Windows Mono build) | capsule singer with the 3.1 movement; 320 u graybox with gentle hills and 4 raised stages (meadow props); cubes as the crowd (Burst sim, instanced draw, teleport-back, spawn ring); Day Lawn's 11 parts on the dsp clock; lead, drums and bass attacking on their notes (held notes as one wave); a member joins on the next bar; game.json ramp; replay wired, off; sim assembly with both bots | (1) parts start on one sample: `timeSamples` equal across all sources at 10 checks; drift between the note clock and the audio playhead after a full 231 s run <= 5 ms. (2) Note to attack: every owned note fires exactly once (attack count = note count, held = 1); fire time <= 20 ms after the note's heard time, p95 (one 50 Hz step). (3) Part entry starts on the bar's sample (+/- 1 ms). (4) Feel: top speed 10.0 +/- 0.2 u/s; 0 to top in <= 0.15 s; jump apex 0.8 to 1.25 u [MB s1 arith]; every band member back in its slot within 2 s after a 5 s straight run. (5) Crowd: 1000 cubes, frame <= 16.7 ms p95 and sim <= 2 ms on his PC. (6) Sim: 10 seeds of a full Day Lawn run headless in <= 60 s total; same seed gives the same trace; idle bot loses. (7) SceneGate passes; 0 errors in the console over a full run; replay off on a fresh install (no recorder allocated) |
| **M1 One song, real cast and band** | Day Lawn complete: all 11 members with their web attacks, the crew (glad_hummer, tiny_peep, rite_singer, tomorrow_soprano, fungal_sage, rooster_herald), elites bell_bear and big_hat_brigand, boss gong_golem (all 9 FBX exist in Battler `cards`) as VAT crowd and animated bosses; cases level members; mini, mid and final boss on the song's moments and drop; the full song at the end; URP toon look; PC camera; HUD | (1) Bot parity on Day Lawn (target 8/10, 71%, 3:22; rule above). (2) Unmuted capture of a full run: only owned parts are heard (an unowned part's level under -60 dBFS), the full song at the end; Vyas hears it. (3) animkit `check` passes for singer, band and bosses; cast passes the game-character-3d look gate at the game camera. (4) 270 enemies + 11 band + effects: frame <= 8.3 ms p95 on his PC. (5) Replay: switch on, a boss kill replays and restores camera, audio and renderers; switch off by default |
| **M2 Full tour** | all 9 stops from `levels.json`, tour map and perks, venue tiers Open Mic to Stadium, the 6 band combos from cases | (1) Bot parity on all 9 stops (table above). (2) Tiers: kite win count never rises from Open Mic to Stadium on any stop. (3) Combos fire only where both parts sound together: combo hits = coinciding notes within 0.06 s [game.json combo_window_s], 0 extra. (4) Each stop loads in <= 1.5 s on his PC |
| **M3 Polish** | feel tuning, hit feel, dota-way effects, beat carrot [genre-learnings fit 10], UI, case reveal on a drum fill | (1) animkit strips and effects side by side at the game camera, per their skills. (2) Unmuted capture: mix at the game-audio skill's targets. (3) Bot parity rerun on all 9 (polish must not move balance). (4) Vyas plays it: his words recorded in DECISIONS |
| **M4 Phone build** (iOS on the Mac hub) | portrait, one stick, fixed camera, Addressables (3 stops in the install), compressed audio, AudioSession | on the mid iPhone: (1) frame <= 16.7 ms p95 and <= 33.3 ms p99 at 270 enemies on Day Lawn; (2) peak memory <= 900 MB; (3) install <= 200 MB; (4) level load <= 4 s; (5) the M0 sync gates rerun on the device (drift <= 5 ms, note to heard attack <= 30 ms with latency offset); (6) three runs back to back without the frame p95 rising over 20% (heat); (7) silent switch on: sound plays (AudioSession); (8) `unity_telemetry.py` passes; (9) TestFlight internal group gets it with no step from Vyas |
| **M5 Steam** | Steamworks through the game kit, pad complete, Deck screen | (1) Steam Deck 1280 x 800: frame <= 16.7 ms p95 at 270 enemies, text readable; (2) pad hot-plug works on its first press; (3) Windows build (IL2CPP once Ops installs the module, else Mono) passes SceneGate and the bot check; (4) release-kit checks clean |


---

## 10. Risks, and what is his to decide

### 10.1 Risks

| Risk | Why it matters | What the plan does about it |
|---|---|---|
| Notes drift from the sound | The whole game is attacks on the song's notes; a 30 ms slip feels wrong | One DSP clock for every part and every note (section 7); M0's gate measures note-to-sound offset |
| The band is hard to read in 3D | His 2026-11-20 concern: size, visibility, distinct characters | Phone camera at FOV 60, a 40 px floor, a look gate at phone size before any place is built (6.5) |
| Unpainted backs | The chase camera shows the band from behind all run | Back repaint first, paid sheets only if it fails (6.2 group C) |
| 5 band members have no model | All 15 must exist before a full run (each is a part of the song) | Free TRELLIS first, Meshy only on his OK with the count (6.2 group B) |
| Crowd cost on phones | Hundreds of enemies at 60 fps | Instancing plus LODs (whole-body squash needs no vertex animation textures); stress test at 1000 on PC (8.2) |
| Audio memory on phones | 13 decoded parts of a 150 s song | Compressed in memory on phone, decompressed on PC; measured per level (8.4, 7.2) |
| Balance moves in 3D | Height, camera and real distances change dodging | Combat stays on the ground plane; the bot check is ported to C# with the web sim-report as the target (9) |
| Two drops in the wrong place | Night Market and Marsh have their drop at bar 4 | A hand-set finale section in their level.json before their 3D level (5.2) |
| Credits | All paid art routes come to about 2,550 Meshy credits, more than the about 1,779 on record | Free routes first; live balance read before any ask (6.6) |
| The Unity upgrade | Every project moves to 6000.7.0b9; the PC editor lacks iOS | New project starts on 6.7; iOS builds through the Mac 6.7 route Ops runs (2) |

### 10.2 What is his to decide

Five decisions block the first 3D build. Each is a card on the Workspace (project music-battler, group "Band Survivors
3D"), with options and a recommendation:

| Card | Options | Recommended |
|---|---|---|
| bs3d-start: start the rough playable box (M0)? | Start / Not yet | Start: about 3 to 5 days, nothing spent |
| bs-experience-line: the line | "I get to sing lead and build my band one monster at a time until the whole song plays." / "I get to start a song alone and finish it with a full monster band." | The second: shorter, and it names the payoff |
| bs3d-band-travel: how the band travels | Conga line on foot (small cost) / Float train (large) / Tour bus (medium) | Conga line |
| bs3d-orientation: how the phone is held | Upright / Sideways | Upright, as the web game |
| bs3d-finale: when the final boss comes | On the drop, as now / The song repeats its last part until the singer steps onto the main stage | The stage |

Already answered, so not asked (source):

| Question | Answer | Source |
|---|---|---|
| Sound effects, given "nothing heard unless a character plays it" | Yes: sound design and announcers on every app | His order 2026-11-25 via the Creative lead: "we need good sound design on all the apps we didnt do and we need announcers". The music rule covers music only |
| World look | The soft vinyl-toy style, each place its own colours | Music Battler DECISIONS 2026-11-21: "sure do what u need with that style now" |
| Moves: squash and stretch or rigged limbs | Squash and stretch, per character size | Music Battler DECISIONS 2026-11-22 |
| Outline | None, the approved vinyl look; revisited only if the look gate fails | Same ruling; look gate 6.5 |
| Camera | Phone 11 behind at FOV 60, fixed pitch; PC adds FOV 85 | Look gate numbers 6.5 (his 2026-11-20 size concern) |
| Where the project lives | New 6000.7.0b9 project at music-battler/unity-survivors | Section 2.2; Unity version rule from the master |
| Phone jump | None on phone; one jump on PC and pad | Section 3.1; one-thumb play |
| Combat on the ground plane | Yes | Keeps the balance check (9) |
| Floor iPhone | A14/A15 class, measured at the phone milestone | Section 8 proposal |
| Elite and boss scale | x1.3 and x2.0, tuned at the look gate | Section 6.5 |
| Bell Garden's boss | A variant of the gong golem until art time | Section 5.2 |
| Run length, singer switching, cases cost | One song per run, no switching, cases free: as the web game he played | The web game; still open in DECISIONS.md and asked when 3D reaches the tour (M2) |

Asked when their step comes (not before):
- Spend: the five missing band models (only if free TRELLIS fails), band backs (only if the free repaint fails), place
  art, effect pictures. Each with the count, when that milestone starts.
- Whether crew sing (M1 look gate), the shrine set and placed cases (M2), phone install size and whether 3D replaces
  the current iPhone app (phone milestone), Steam timing and price (Steam milestone).

Not his (handled by leads): the cast as a shared package (Music Battler lead), the Windows IL2CPP module on the PC's 6.7
(Ops), the stem player as a Toybox package, URP ports of the Toybox toon and instanced shaders.
