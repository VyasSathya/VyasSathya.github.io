# Band Survivors decisions

Vyas's rulings in his exact words, with date and source. Binding for every chat that changes this game; read before
changing it. New rulings are added the same day. The game also follows Music Battler's DECISIONS.md
(`C:/Dev/music-battler/DECISIONS.md`) for the cast and the music.

## The game
- 2026-11-24, relayed by the Music Battler lead: "we need to be able to make mroe levels and stuff and use all the diff
  songs we have so lets build otu this game al lthe way". Many levels, each on a different song we already have.
- 2026-11-24, relayed by the Music Battler lead: "learn from vamp suurivvors", "it should get eveyrthign we need to kno
  and also the games that folowed to se e wat fits us", "but this basis is pretty ghood", "learn about diff level scalign
  etc wat other char etc". Keep the current basis and build on it from Vampire Survivors and the games that followed
  (`docs/research/survivors-genre-learnings.md`).
- 2026-11-24, relayed by the Music Battler lead: "and then i think we should make a 3d version of this game like
  megabonk", "which i have that on this pc as well", "and we have the 3d assets as well for that as well". A 3D version
  comes after the web levels; it reads the same level data (`levels/`).
- 2026-11-25, relayed by the Music Battler lead: "can u make them their on sectiosn on here and give leads o lead the
  ufll development of he games". Band Survivors has its own lead and sidebar section.

## Difficulty
- 2026-11-24, relayed by the Music Battler lead: the game "is too ez", and "scale up using what they have but balance on
  our own cuz we have our thigns based on the singign the song". The ramp comes from Vampire Survivors' numbers
  (`levels/game.json`); damage comes from the song's notes and is balanced here with the bot check (`tools/sim.mjs`).

## Music
- 2026-11-23, music lead chat (Music Battler DECISIONS): "no no dont play full song u misunderstood", "the whole
  satisfaction is hearing one by one", "in any game". Only the parts the player has play; the full song is the reward.
- 2026-11-24 (LESSONS): the parts of a level come from one Suno song split into its stems, never separate generations.
  Suno writes every song; Claude never composes the music.
- 2026-11-24, relayed by the Music Battler lead, on the old singer: it sounded "like its in a room like at th bak with a
  bak mic like ahome recording". The lead singer is dry (no distance, early reflections or room); backing voices may
  keep a little room.
- 2026-11-25, relayed by the Music Battler lead, playing Band Survivors with the dry singer: "this isssss wayyyy
  better", "thisis wat we need for music games ro the most part", "obviously discrete oens are lil different but this
  ones are our defautl for music games". This game's music build is the default for our music games.

## Open (his to decide)
- The experience line ("I get to ..."), proposed 2026-11-25.
- Run length: one song per run, or a set of songs.
- Whether the singer can change mid-run.
- How the phone version makes money.
- Whether the band rides something: a float train that grows car by car and opens into a stage on the drop, a tour bus,
  or a conga line on foot.
