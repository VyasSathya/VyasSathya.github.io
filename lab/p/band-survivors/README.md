# Band Survivors

A survivors game where your band of monster musicians fights around the singer (you) to the beat of a Suno song.
Each band member is one part of that song: it attacks on its own part's notes, and its part is heard only while it is
in your band. You start with the lead singer alone and the song builds one part at a time; the whole song plays once
the band is complete, before the final boss.

Play: https://vyasapps.dev/lab/p/band-survivors/ (Web Lab id `band-survivors`). Add `?all=1` to open every stop.

## The game

- **The tour**: a map of stops, one per song. Clearing a stop opens the next one and gives one tour perk (more health,
  speed, pickup range, damage, armour, regen, start with the drummer, get back up once), kept for the rest of the tour.
- **A stop**: its own place (ground colour, accent), its own crew of enemies weakest first, two elites and a boss, all
  from the cast pictures. Run length grows along the tour (3:30 to 6:15).
- **Venue tiers per song** (Brotato Danger, 20MTD Darkness): Open Mic, Club, Hall, Arena, Stadium. Each adds one
  rule on top of the ones before (bigger crowd; tougher elites twice as often; bosses hit twice as hard; faster crowd and
  two cards per level up). Clearing a tier opens the next; the map shows the best tier cleared.
- **The song drives it**: spawns land on the beat, more where the song is louder; a ring of enemies lands on the
  downbeat after each drum fill; elites enter on chorus downbeats; mini-bosses on the song's big moments (one of them,
  past VS minute 10, is the bigger mid boss); the final boss on the drop (or the next big moment) after the full band is
  in. While the final boss is up the crowd thins, as in Survivor.io.
- **Instrument cases** (the genre's chests) drop from elites and mini-bosses. A case gives a **band combo** when two
  members that play together are both level 2 or more: Groove (drums and bass), Horn section (brass and woodwinds),
  Harmony (lead and doo-wah), Power chord (guitar and strings), Light show (keys and synth), In the pocket (drums and
  shaker). A combo fires only on the notes where both parts sound together, so it adds nothing new to the mix. With no
  combo ready, a case levels up a member.
- **Held notes attack as one wave** (an arc rolling out for the note's length), never as a stream of shots.
- **Difficulty**: `levels/game.json`, from Vampire Survivors' own game data (`docs/research/survivors-difficulty-numbers.md`
  3.3-3.4), with our run taken as VS minutes 0 to 15: enemy health `8 x 1.22^m` (VS 1.24), spawns `0.8 x 1.10^m`, an
  on-screen floor `15 x 1.15^m` with the minute 11-14 horde (200 weak enemies), enemy damage 5 / 10 / 14, elites 20,
  bosses 30, boss health 200 x player level (mini 50, mid 150), regen 0.2/s, XP need `5 + 5 x (level - 1)` (VS 10: we
  have 10 to 13 members to level), hit invincibility 0.3 s (VS 0.12 s made it much harder, since our enemies also wait
  0.7 s between hits). Each song has its own `hard` from the balance check.

## Data a 3D version reads

Everything a level needs is plain data, with nothing tied to the web page:
- `levels/game.json`: the ramp, enemy ranks, elites, tiers, combos and their numbers.
- `levels/<id>/level.json`: the song's parts, loop length in bars, energy per bar, big moments, drop, drum fills,
  chorus downbeats, crew, elites, boss, colours, run length, difficulty, `hard`, and `set_folder` (the full-quality
  wav set on D:).
- `levels/<id>/notes.json`: tempo, bar and beat length, the loop, and every note of every part (time, pitch, length).
- `levels/<id>/<part>.mp3`: one per part, mono. The wavs are in `set_folder`.
Times inside a run are VS minutes (`m = 15 x t / run length`), and song events are bars, so a Unity version with its own
run length and clock plays the same schedule.

## Add a level from a new song

One command per song. From this folder:

    python tools/make_level.py --set <recipe set folder> --id <id> --title "<Place>" --order <n> --diff <n> \
        --enemies a,b,c,d,e,f --elites x,y --boss z --ground "#2F6E45" --accent "#FFD84A" --source "<where the song is from>"

- `--set` is a set made by the song-stems recipe (`C:/Dev/toybox/music-kit/stems/recipe.py`; skill `song-stems`):
  one wav per part, `full.wav`, `stems.json`, `notes.json`, and the `raw` folder beside it.
  For a split Suno take that has not been through the recipe yet, pass `--take <fetch.py folder> --recipe-args "--melody woodwinds --fill brass --chords keyboard,guitar"` instead.
- The lead singer is sung dry: the tool runs `voices_fit.py` again on the set's `raw` folder with distance, early
  reflections and room left out, matched to the old lead's loudness. Backing voices keep their room. `--lead-pair`
  names the part the lead rides (default woodwinds, then brass, then bass), `--lead-wav` uses a lead that is already dry.
- Every part becomes a mono mp3 (lead 80k, the rest 56k), so a level is about 10 to 14 MB to download and about
  300 MB decoded, which a phone holds.
- The song's big moments come from the full mix's loudness per bar: the section starts with the biggest lift (bosses),
  and an energy value per bar (spawns).
- `--enemies` (weakest first, up to 7), `--elites` (2) and `--boss` are names from `docs/design/cast/img/chars`; the
  pictures are copied into `img/` as `c_<name>.webp`. Do not use a picture the band already uses (see `FAM` in index.html).
- `--diff` is the stop's place on the tour: run length is 3.5 min plus 0.35 per step, and each step adds a little
  enemy health, spawns and damage.
- It writes `levels/<id>/` (part mp3s, `notes.json`, `level.json`) and adds the stop to `levels/levels.json`.

`--out <folder>` writes the part set somewhere else (another game, e.g. Sing Island World) without adding a tour stop or copying pictures.
`--meta-only` redoes only `notes.json` and `level.json` (big moments, fills, chorus bars) and keeps the mp3s.

Then balance it and publish:

    node tools/sim.mjs <id> --calibrate --seeds 6     # sets the stop's "hard" so it is beatable but not trivial
    node tools/sim.mjs <id> --seeds 6                 # check: kite bot wins 4 of 6 or more, median low health under 75%, idle bot loses
    python C:/Dev/vyas-lab/tools/publish.py add band-survivors . --title "Band Survivors"

`tools/build_all.sh` rebuilds every stop from its song. A new part name (one the game has no character for) needs an
entry in `FAM`, `ORDER` and `MOUTH` in index.html and a picture in `img/`.

## The balance check

`tools/sim.mjs` runs the game's own code with no sound and no drawing, at 30 steps a second, with two bots. "kite"
looks in 16 directions and walks the emptiest, fights bosses at mid range, picks up notes when safe and takes new
members; "idle" stands still. Each stop gets the tour perks a player would have by then. `--trace` prints the run every
10 s; `--json` saves every run.

## Songs

| Stop | Song | Parts |
|---|---|---|
| Sneaky Harbour | Suno bd151f71, Sneaky, 144 BPM | 10 |
| Day Lawn | Suno 18b55201, Day lawn A take 1, 130 BPM | 11 |
| Canal | Pull Lanes canal idea 1, warped to 116 | 11 |
| Night Market | Suno 5b50ffee, Night B take 1, 110 BPM | 12 |
| Harbour Fog | Suno 008465a1, Harbour fog B take 1, 98 BPM (Suno's own singer is a part) | 13 |
| Rooftops | Pull Lanes rooftop idea 4, at 116 | 10 |
| Lantern Night | Pull Lanes night idea 2, at 116 | 12 |
| Marsh | Pull Lanes harbour fog idea 1, at 116 | 13 |
| Bell Garden | Pull Lanes day lawn idea 2, at 116 | 11 |

Also split and ready for the same command: Day lawn A take 2 (`picks/a2_out`), Night B take 2 (`picks/b2_out`),
Harbour fog B take 2 (`picks/f2_out`), Pull Lanes night idea 4, rooftop B 1:53 and rooftop B extended
(`D:/music-battler-work/songs/pl116/*_out/set`). They are second takes or other ideas of the same places.

## Instant replay (dev only)

The Toybox replay kit (`vendor/replay.js`, copied from `C:/Dev/toybox/web-kit/replay`) is wired in and off by default: a fresh
load has `ThumbyardReplay.isDev() === false`, nothing records, nothing shows. Turn it on from the title screen: five taps on the
title, or hold backquote for 3 s. Then play; the last moment replays with backquote (or the Replay button on a phone) and
Enter or a tap ends it. Moments: a boss or mini-boss kill, a combo from an instrument case, the singer under 20% health for
2 s, a swarm ring cleared. The song keeps playing and the replay changes no game time or notes. The headless check skips all of
it (`window.__BS_SIM`). Test helpers on `__bs`: `replay()`, `testBoss()`, `hit(e, d)`.
