# Building the rest of the game

Everything a designer touches is plain data in `src/data`, rooms are ASCII, models are `ModelDef`s, songs
are text patterns. Dev mode (pause menu) tests any of it at once. Run `node tools/build.mjs` then open the
HTML, and `node tools/test.mjs --sim` tells you if the data refers to something that does not exist.

## Add a monster
1. Add a row to `MONSTERS` in `src/data/monsters.js`: `hp` and `hit` multiply the level formulas, `ai` names a
   state machine in `src/sim/monsters.js` (`melee lunge leaper ranged slam bomber hook blinker charger swooper necro plate spawner`).
2. Add a body to `src/view/models/monsters.js`. Humanoids use `humanoid({...})` and get all hero clips.
   `node check.mjs --sheets src/view/models/monsters.js` draws it.
3. Add it to a zone's `monsters` table in `src/data/zones.js`, with a weight.
4. Dev mode, SPAWN tab, to meet it. Its Bestiary entry appears by itself.

## Add a skill or a Tone
Add to `SKILLS` in `src/data/skills.js`. `fx` is a list of ops, and the ops are the whole vocabulary:
`arc circle cone ring projectile lob chain dash leap blink zone obstacle summon turret buff debuff pull knock
stun apply_status consume_status consume_graves comet_rain delay repeat spawn_decoy`. A Tone has `patch` (fields
on the skill), `fx` (overrides per op index) and `add` (more ops). Add the id to the class in `src/data/classes.js`.

## Add an item, a legendary, a set, an affix
`src/data/items.js`. A legendary needs a row in `LEGENDARIES` and a hook object of the same id in
`src/sim/powers.js`: `onCast`, `onHit`, `onKill`, `onPickup`, `tick`, `modifySkill`.

## Add a room
Add an ASCII template to `src/data/rooms/`: `#` wall, `.` floor, `~` water or pit, `P` pillar, `D` door socket,
`S` trash spawn, `E` elite spawn, `C` chest, `B` breakable, `T` trap, `L` light, `A` shrine, `X` way in or on,
`N` named prop from the template's `named` list. List it in a zone's `gen.fill`. The tests walk it for 200 seeds.

## Add a zone
Add to `ZONES` and `BIOMES` in `src/data/zones.js`, give it a song in `ZONE_SONGS` (`src/data/songs.js`), and
somewhere to enter from: a named `exit`, or a line in the Map screen's list and `zoneOpen` in `src/sim/commands.js`.

## Add a quest
Steps go in `QUESTS` (`src/data/quests.js`). What ends a step goes in `src/sim/quests.js`: `onTalkDone`,
`onObjectUsed`, `onBossKilled`, `onZoneEntered`, or `stepCheap` for positions. `objectiveOf` tells the map marker
and the bot where to go. Lines for a step go in `TALKS` in `src/data/dialog.js`, keyed `npc:quest.step`.

## Add a song or a sound
Songs are `S('D4:4 r:4 A4:2')` strings in `src/data/songs.js`: note and length in steps, `r` is a rest. Every track of a
pattern must add up to the same length (the tests say which one does not). Sounds are `SoundDef`s in `src/data/sfx.js`.

## Tune it
`src/data/tuning.js` holds the formulas and the sliders. Every row of `TUNING` is a live slider in dev mode.
`node tools/report.mjs 11,12` plays the campaign with the bot and prints minutes, levels, boss times and drops.
