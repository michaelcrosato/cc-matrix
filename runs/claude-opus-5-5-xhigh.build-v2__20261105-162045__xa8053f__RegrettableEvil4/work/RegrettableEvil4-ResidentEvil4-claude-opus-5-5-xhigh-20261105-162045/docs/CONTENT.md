# Adding content without touching systems

Everything a designer changes lives in `src/data/`, `src/models/` and `src/audio/`. Systems read data; data never reaches back.

## An area
1. Paint its map in `src/data/levels/maps.js`: `map name W H fill`, then `R`, `B`, `P` commands. One cell is one metre. See the character table in `src/game/mapPaint.js` (`BLOCKED`, `FLOOR_CHARS`, `MARKERS`).
2. Make `src/data/levels/<name>.js` and export a level:
   - `id`, `title`, `chapter`, `map`, `mood` (see `MOODS` in `src/game/world.js`), `music` (a key of `SONGS`), `start` (cell), `startYaw` (degrees).
   - `theme`: `floors` (char to texture id), `walls`, `cover`. Cold variants of library textures live in `TEX_VARIANTS` (`src/game/levelBuild.js`).
   - `build`: `brine` cells, `coverProps`, `roofs`, `belts`.
   - `chests` `[c, r, treasureOrDoubloons]`, `items` `[c, r, id, qty]`, `notes` `[c, r, noteId]`, `backdrop`, `safeZones`.
   - `setup(area, ctx)` places dressing: `area.level.place(id, x, z, options)`. Solid props close the nav cells under them.
   - `beats`: below. `cuts`: named cutscene scripts (`[{ cam }, { say }, { wait }, { cue }]`).
3. Add it to `src/data/levels/index.js`, and to `src/data/levels/teleports.js` so dev mode can reach it.
4. Add a bot plan in `src/data/botPlans.js`, so the playthrough test covers it. `node tools/test.mjs --fast --only levels` checks that props never block a route.

## Beats
A beat runs once per claim. `{ id, trigger, steps }`.
Triggers: `{ on: 'start' }` (default), `{ on: 'enter', zone: [c0, r0, c1, r1], floor }`, `{ on: 'flag', flag }`, `{ on: 'when', fn }`.
Steps, in order: `{ objective }`, `{ hint, action, time }`, `{ say: [who, text] }`, `{ lines: [[who, text], ...], block }`, `{ radio: [[who, text]] }`, `{ cut: id }`, `{ spawn: { type, n, door, at, state, every } }`, `{ music }`, `{ flag }`, `{ wait: seconds }`, `{ until: (area) => bool }`, `{ openGate: [c, r] }`, `{ checkpoint: true }`, `{ mood }`, `{ run: (area) => ... }`.
A `checkpoint` step also records where the beat is: after a death it carries on from just after that step, so put any state the rest of the beat needs behind flags.

## An enemy
Add a row to `ENEMIES` in `src/data/enemies.js` (hp, speed, damage, reach, windup, clips, models, props). Add a model in `src/models/humans.js` with `puppet({...})`: it plays every clip in the game because it shares the hero rig. Special behaviour goes in `src/game/enemy.js` as a state, or a subclass (`src/game/bosses/`). It appears in dev mode's SPAWN tab by itself.

## A weapon
Add it to `WEAPONS` and `WEAPON_ORDER` in `src/data/weapons.js`, its Case entry in `ITEMS` (`src/data/items.js`), an icon in `src/models/icons.js`, a model in `src/models/weapons.js`. Tuning prices and stats are shared (`TUNE_STATS`).

## An item
Add it to `ITEMS`, `TREASURE` or `KEY_ITEMS` in `src/data/items.js`, and to `STOCK` and `PRICES` in `src/data/shop.js` if Mr. Fathom sells it.

## A line
Script lines are in `src/data/dialogue.js`, Claim Notes in `src/data/notes.js`. Text must fit the HUD font: no em dashes, no straight double quotes, no accents. A test scans every string.

## A song or a sound
Songs are `Song` data in `src/audio/songs.js`; `parseSong` validates them in tests. Sounds are `SoundDef` data in `src/audio/sfx.js`. Author track volumes loud: music plays at 10% by default.
Voices are recipes per speaker in `src/audio/voice.js`.

## Balance
All first values are in `src/data/tuning.js` and the data files. Dev mode's BALANCE tab edits them live. `node tools/test.mjs --only playthrough --verbose` prints per-chapter ammo, money and deaths for the bot.
