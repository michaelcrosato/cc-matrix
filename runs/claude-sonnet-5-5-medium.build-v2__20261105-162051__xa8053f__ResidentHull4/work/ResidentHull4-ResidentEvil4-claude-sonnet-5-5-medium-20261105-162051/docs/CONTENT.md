# Adding content without touching the systems

Everything a designer needs is data. Run `node tools/test.mjs` after any change: it checks strings, songs, sounds, models, clips and maps.

## A new area (a chapter, a room, a boss arena)
1. **Map.** Add painter commands to `src/data/levels/maps.js` (`map name W H fill`, then `R x0 y0 x1 y1 c`, `B x0 y0 x1 y1 wall floor`, `P x y c`, commands separated by ` | `). Markers: `a` start, `1-5` spawn doors, `m` Mr. Fathom, `t` telegraph, `y` Tannoy, `$` chest, `d` the Dame, `h` hiding niche, and so on (see the table in PLAN.md). `tests/node/01_data.mjs` checks every cell is reachable from `a`.
2. **Level file.** Copy `src/data/levels/road.js`. A level is a plain object: `id`, `name`, `mapId`, `mood` (`dusk rain abbey moon dawn`), `music` (a key of `src/audio/songs.js`), `theme` (char to texture), `tannoyLines`, `dress` (props to scatter), `props`, `lamps`, `scripts`, `setup(a)`, `fixed(a, dt)`, `contexts(a)`, `dameCommand(a)`.
3. **Register it** in `src/data/levels/index.js` (`LEVELS`, and `BEATS` for dev-mode teleports).

## Scripts
A script is a generator that takes the area: `yield 2` waits two seconds, `yield () => cond` waits for a condition, `yield* a.say('MAX', 'LINE.')` shows a dialogue box, `yield* a.cutscene({ shots, lines, cues })` plays a letterboxed scene, `yield* a.qte({ type: 'press', verb: 'dodge', window: 0.9 })` runs a quick-time event, `a.spawnAtDoor('gaffer', '2')` spawns at a door, `a.setObjective(...)`, `a.setFlag(...)`, `yield* a.finishArea({ next: 'road' })` shows the Claim Form and loads the next area. Helpers live in `src/game/kit.js`.

## An enemy
Add a row to `src/data/enemies.js` (hp, speed range, damage, wind-up, range, model id). Add the model in `src/models/humans.js` with the `human({...})` helper (a puppet on the hero rig; palette slots and accessory parts). Special behaviour goes in `src/game/enemy.js` (`meleeHit`, `fireRanged`).

## A weapon
Add a row to `src/data/weapons.js` (footprint in Case cells, price, damage, interval, mag, reload, sway, cone, pellets) and a gun model in `src/models/props.js`. Add its ammo item in `src/data/items.js` and a case in `Player.equip`.

## An item or treasure
`src/data/items.js`: `ITEMS` (Case items with a footprint), `VALUABLES` (treasure, sold at Mr. Fathom), `KEY_ITEMS`. Herb mixes are the `combineHerbs` table.

## A line, a song, a sound
Lines: `src/data/dialogue.js` (uppercase, no em dashes, no double quotes, no accents: the test enforces the font). Songs: `src/audio/songs.js` (`Song` data; every pattern track must have the same number of steps). Sounds: `src/audio/sfx.js` (`SoundDef` layers). Voices: `src/audio/voice.js` (`SPEAKERS`).

## Balance
Every number a designer will reach for is in `src/data/tuning.js`, live-editable from Pause > Dev Mode > Balance, with per-slider reset (Triangle / R) and Reset All.

## Tests
`node tools/test.mjs` runs Node suites in `tests/node/`. `--only <name>` runs one, `--fast` skips the slow ones. Browser checks are in `tests/browser/` (Python, Playwright).
