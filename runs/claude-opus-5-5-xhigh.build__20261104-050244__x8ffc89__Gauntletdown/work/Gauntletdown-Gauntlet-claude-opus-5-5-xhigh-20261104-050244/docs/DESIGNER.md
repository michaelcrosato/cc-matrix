# Building out Gauntletdown: the designer's notes

Content is data in registries; the core never changes to add a floor, a monster, an item or a line.
Edit a file in `game/src/`, then `node build.mjs` (the dev page `game/index.html` and the tests load `game/game.js`),
`node tests/run.mjs floors sim` to check, and `node build.mjs --bundle` for the single file.

## A floor

A floor is `def('floors', id, { name, realm, no, music, par, rank, genRank, intro, specials, amulets, rows })`
(`game/src/15-floors.js` and `16-floors.js`). Add its id to `FLOOR_ORDER` where it belongs.

- `rows`: ASCII strings, all the same width (24-72), 16-48 rows, walls all round. The legend is in `20-level.js`
  (`WALL_CH`, `FLOOR_CH`): `#` wall, `%` accent wall, `X` cracked wall, `+` door (4-connected runs open together),
  `T`/`Y` trap walls dropped by `^`/`v` plates, `?` fake wall, `=` low table, `~` lava, `@` starts, `E` stairs, `2`-`9`
  skip stairs, `O` transporter pads (paired in reading order), `!` stun rune, `s` spikes, `|` `-` force fields (wall to
  wall), `B` the Dinner Bell, `K` the King; items `k f b j z m u a $ * h l w P`; monsters `g n o i y x t`; generators
  `G N L I F S U`.
- `rank` / `genRank`: the strength of placed monsters and generators (1-3); `ranks: { 'x,y': 3 }` overrides one cell.
- `specials` / `amulets`: what each `u` and `a` is, in reading order (ids in `10-defs.js`).
- Optional: `treasure: true` (a hoard clock room), `boss: true`, `chest: { 'x,y': 'special:deeppockets' }` (a set prize),
  `points: { escape: [[x, y]], wave: [[x, y]] }` (snatchers' exits, the King's gnasher doors), `demo: { at: [x, y] }`
  (where the attract mode's bots start), `sealedOk: true` (allow content behind permanent walls).
- `node tools-dev/floorcheck.mjs <id>` validates it (shape, legend, solvable with its own keys, no dead content) and
  prints its counts. `tools-dev/floors.py` is how floors 2-9 were drawn (rooms, corridors, placed characters); editing
  the rows by hand is just as good. Decoration (torches, corner props) is automatic and deterministic.

## A monster

`def('monsters', id, { name, ch, gen, hp, speed: [r1, r2, r3], dmg: [...], points, r, ai, wind, reach, every, tip })`
in `10-defs.js`; its look in `MON_RIGS` (`11-art.js`: a Humanoid, a Blob or a class of its own like the Shade); its
behaviour is an `AI[ai]` function in `23-sim-monsters.js` (or reuse `melee`, `ghost`, `lobber`, `imp`, `fryar`,
`snatcher`, `tithe`). Give its attack a visible wind-up of at least 0.3 s (`state: 'wind'`).
A generator is `def('gens', id, { name, ch, spawns, shape })` with an `E.SHAPES` entry taking `{ dmg: 0 | 1 | 2 }`.

## An item, a potion, an amulet

`def('items', ...)` with a `kind` the pickup code knows (`food`, `stew`, `key`, `flask`, `treasure`, `chest`,
`special`, `amulet`) and `shoot: 'destroy' | 'blast'` when a shot changes it. Specials and amulets are
`def('specials' | 'amulets', id, { name, color, what })`; their effects are read where they apply (search for
`specials.` and `amulet.type`).

## A line

Every word is in `05-text.js`: the Gaunt's lines (`LINES`, `{CLASS}` and `{THING}` are filled in), the story, the
How to Play pages (`{fire}`, `{move}` ... become the player's own keys), the class quips and the About pages.
`say(key, hero, prio)` queues a line (3 critical, 2 event, 1 a tip heard once).

## Balance

Every number marked in `01-tune.js` is a Dev Tools slider (pause menu, Dev Tools, Tuning), applied at once, with Reset
to defaults. `node tests/run.mjs play` writes `tests/out/balance.json` (the bots' times, health, kills, food).
