# Balance check, 2026-11-24

`node tools/sim.mjs --calibrate --seeds 6 --bots kite,idle`, then Bell Garden's `hard` raised from 1.00 to 1.10 and
checked again. Pass = the kite bot wins at least 4 of 6, its median lowest health is under 75%, the idle bot loses.
Each stop played with the tour perks a player has by then.

| Stop | hard | Kite wins | Median low health | Idle bot |
|---|---|---|---|---|
| Sneaky Harbour | 1.00 | 5/6 | 67% | knocked out at 0:43 |
| Day Lawn | 1.12 | 5/6 | 69% | 2:23 |
| Canal | 1.97 | 4/6 | 45% | 1:29 |
| Night Market | 1.12 | 5/6 | 67% | 2:40 |
| Harbour Fog | 1.00 | 4/6 | 49% | 1:40 |
| Rooftops | 1.13 | 5/6 | 64% | 2:23 |
| Lantern Night | 1.00 | 4/6 | 70% | 2:42 |
| Marsh | 1.13 | 4/6 | 69% | 2:23 |
| Bell Garden | 1.10 | 5/6 | 73% | 3:25 |

Base numbers (index.html `TUNE`): hpG 1.17 per VS minute (report: 1.27), on-screen cap 200 (report: 300), XP step 3 per
level (VS: 10), final boss health 8 s and mini-boss 4 s of the band's raw damage per second (the report's
`350*hpScale` came to about 35,000), +4% health, +3% spawns and +4% damage per tour step. With the report's own curves
the kite bot lost every stop.
