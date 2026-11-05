# Content formats (for designers)

Each floor is an entry in `B.FLOORS` (src/15-floors.js):

- `rows`: the map. `#` wall, `.` floor, `@` start, `<` `>` stairs, `+` wooden door, `=` gate, `L` `K` locked doors,
  `M` magic seal, `H` secret wall, `I` illusory wall, `P` plate, `T` dart trap, `O` pit, `o` trapdoor, `^` teleporter,
  `S` spinner, `U` the Undergate, `B` the boss.
- `ids`: every id that names a cell (`'G1': [x, y]`). The map character must agree with the id's cell.
- `walls`: wall features on a cell's face: `{ id, k, at: [x, y], dir }` with `dir` 0 N, 1 E, 2 S, 3 W. Kinds: `lever`,
  `button`, `catch`, `plaque` (with `text`), `alcove` (with `accepts`: `key`, `gear` or an item id), `clock`, `candle`
  (with `seq`), `shrine`, `greatLock`, `torch`.
- `doors`: locks by id: `{ lock: keyId, kind: 'simple' | 'warded' }`.
- `items` (`'x,y': [itemIds]`), `alcoves` (`id: [itemIds]`), `monsters` (`{ type, at, n, asleep, patrol, id }`).
- `stairs` (`'x,y': { to, at: [x, y, dir] }`), `teleporters`, `pitTo`, `areas`, `safe`, `wanderers`.
- `wires`: `{ on, mode, once, do, fail }`. Triggers in `on`: `lever`, `catch`, `plate`, `plates` + `all`, `buttons` + `within`,
  `enter`, `enterArea`, `alcove` + `accepts`, `killed`, `seen`, `hp` + `below`, `flag`, `levers`, `full`, `loops` + `at`,
  `fall`, `sequence`, `undergate`. Actions in `do`: `open`, `close`, `toggle`, `bridge`, `teleporter`, `msg`, `hint`,
  `story`, `bark`, `give`, `spawn`, `xp`, `special`, `flag`, `sfx`, `shake`, `return`, `gutter`, `bossIntro`, `checkpoint`.
- `walk`: the walkthrough goals the bot follows (`take`, `takeAll`, `feature`, `door`, `insert`, `put`, `zap`, `throwAt`,
  `goto`, `clear`, `join`).

Monsters are in `B.MONS`, items in `B.ITEMS`, spells in `B.SPELLS`. Stories are in `STORY` (src/43-story.js).
Balance is in `B.TUNING` (the Dev Mode sliders).
