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
- **The song drives it**: spawns land on the beat, in bigger groups where the song is louder; swarm rings come at
  section starts with high energy; mini-bosses enter on the song's big moments; the final boss enters on the drop (or
  the next big moment) after the full band is in. While the final boss is up the crowd thins, as in Survivor.io.
- **Held notes attack as one wave** (an arc rolling out for the note's length), never as a stream of shots.
- **Difficulty**: the Vampire Survivors ramp (`docs/research/survivors-difficulty-numbers.md`) on our own base numbers,
  with our run taken as VS minutes 0 to 15: enemy health `x hpG^m`, spawns `0.8 * min(10, 1 + 0.8m)`, an on-screen floor
  `15 * 1.3^m`, enemy damage 5 to 14, regen 0.2/s, enemy ranks joining at m 1.5 / 3 / 5 / 7. Damage comes from the notes
  and is balanced here: `hpG` is 1.17 (VS 1.27 is too steep for a band whose damage is set by the song), the on-screen
  cap is 200 (a phone screen), boss health follows the band you built (VS scales boss health by player level), and each
  song has its own `hard` from the balance check.

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
