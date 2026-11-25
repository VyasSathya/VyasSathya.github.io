# Balance check, 2026-11-25 (ramp from Vampire Survivors game data)

`node tools/sim.mjs --calibrate --seeds 10 --sweep 0.85,1,1.15 --bots kite,idle`, then finer sweeps for Harbour Fog
(1.05 to 1.13) and Bell Garden (1.3 to 1.6). Pass = the kite bot wins at least 6 of 10, its median lowest health is
under 75%, and the idle bot loses. Each stop is played at Open Mic with the tour perks a player has by then. Runs are
deterministic per seed. Win rate moves in steps with `hard` (Harbour Fog: 1.12 wins 6/10, 1.13 wins 4/10), so these
are the edges of the range, not smooth values.

| Stop | hard | Kite wins | Median low health | Idle bot knocked out at |
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

The ramp is `levels/game.json`. Taken from the VS data as given: spawns `0.8 x 1.10^m`, floor `15 x 1.15^m`, the
minute 11-14 horde (weak enemies), damage 5 / 10 / 14, elites 20, bosses 30, boss health 200 / 150 / 50 x player level,
regen 0.2/s. Changed by this check: health growth 1.22 per VS minute (data 1.24), XP step 5 (data 10: a 10 to 13
member band was starved of upgrades), hit invincibility kept at 0.3 s (the data's 0.12 s lost almost every run, since
our enemies also wait 0.7 s between hits), horde enemies at 0.15 health (VS's minute-11 skeletons are 15 HP against a
97 HP average).
