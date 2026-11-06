# Adding content without touching systems

An area is a data module. Everything below lives in `src/data/`.

## An area
Add painter commands to `levels/maps.js`: `map name W H fill`, then `R x0 y0 x1 y1 c`, `B x0 y0 x1 y1 wall floor`, `P x y c`. One set of rows gives geometry, colliders, nav and the Map tab. Characters and markers are the plan's table: `#` stone, `T` timber, `~` deep water, `H` low cover, `D` door, `W` window, `G` gate, `S` shutter, `B` crate, `c` belt, `%` shallows; `a` start, `1-5` spawn doors, `m` Mr. Fathom, `t` telegraph, `y` Tannoy, `$` chest.

Then add an entry to `levels/areas.js`:
```js
myarea: { map: 'myarea', title: 'THE PLACE', mood: 'rain', music: 'explore', chapter: 3, first: 'main',
  treasure: ['pearl'], barrels: [[4, 5]], groundItems: [['samphire', 6, 7, 1]], notes: [{ id: 'hymn', col: 2, row: 3 }],
  decor: [['crate', 3, 4]], props: [['barrel', 5, 5]], lamps: [['lamp-post', 8, 8]], hideSpots: [[9, 9, 'barrel']],
  dress: { wall: ['barrel'], open: ['puddle'] }, backdrops: [['backdrop-cliff', 40, -3, 0]],
  stages: { main: [ /* steps */ ], next: [ /* steps */ ] } }
```
Add it to `TELEPORTS` for dev mode and to `CHAPTER_OF`. Bot goals for the whole-game test go in `BOT_GOALS` in `game/bot.js`.

## Steps (the beat language: `game/director.js`)
`{ wait: 2 }` · `{ until: (a) => cond }` · `{ zone: [col0, row0, col1, row1] }` · `{ run: (a) => {} }` · `{ scene: 'name', shots: [...], duration }` a cutscene with the lines of `SCENES.name` · `{ lines: 'name' }` radio subtitles · `{ say: ['MAX', 'Noted.'] }` · `{ objective: 'TEXT' }` · `{ hint: 'aim' }` · `{ radio: 'tide' }` · `{ music: 'siege' }` (`null` is silence) · `{ flag: 'x' }` · `{ spawn: [['gaffer', col, row, opts]] }` · `{ wave: { groups: [['gaffer', 10]], doors: '123', every: 2, maxActive: 8 } }` then `{ waitWave: true }` · `{ openGate: 'G' }` · `{ checkpoint: true }` · `{ stage: 'next' }`.

A stage is a stretch of story. Entering one saves a checkpoint, and reloading restarts that stage: restore anything it needs in its first step.

## An enemy
Add to `enemies.js`: hp, speed, dmg, windup, reach, gait, model, and flags (`grab`, `throws`, `shield`, `armoured`, `heavy`, `crawler`, `saw`, `targetDame`). Add a puppet with `puppet(id, about, palette, extras)` in `models/humans.js`. Add it to `SPAWNABLE` for dev mode. New behaviour: an `s_STATE(dt)` method on the Enemy (or on one instance).

## A weapon
Add to `weapons.js` and `WEAPON_ORDER`, an item in `items.js`, a model in `models/weapons.js` with its barrel along +Z (map it in `MODEL_OF`, `player.js`), and a shop entry in `shop.js`. `pellets`, `cone`, `falloff`, `pierce`, `pin`, `scope`, `popChance` are data.

## An item
Add to `items.js` (`kind`: herb, ammo, grenade, treasure, key; `w`, `h`, `price`, `about`) and an icon in `models/icons.js`, sized 14 art pixels a cell. Recipes are `combineRecipes`.

## A line
All writing is `dialogue.js`. HUD font only: uppercase letters, digits, common punctuation. `tests/node/units.mjs` scans every string. Add a speaker's colour to `COLORS` and a voice recipe in `audio/voice.js`.

## A song or a sound
Song data in `audio/songs.js` (validated by `parseSong`), sound data in `audio/sfx.js` (rendered and checked for silence and clipping).

## Balance
`tuning.js` is what the dev sliders change. Weapons, enemies and prices are data. Run `node tests/node/playthrough.mjs --v` for the balance report.
