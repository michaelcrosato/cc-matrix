# Gauntletdown: building more of it

Content is data in registries; the core never needs editing to add any of these.

- **A floor:** `def('floors', id, { name, realm, no, rank, genRank, par, music, specials, amulets, rows })` in
  `game/src/15-floors.js` (or lay it out with `tools-gd/floors.py`, which writes that file), then add its id to
  `FLOOR_ORDER`. The legend is in `game/src/20-level.js` (`#` wall, `%` low accent wall, `X` cracked, `+` door, `T`/`Y`
  trap walls with `^`/`v` plates, `?` fake wall, `~` lava, `O` transporter pairs in reading order, `!` stun rune,
  `s` spikes, `|`/`-` force fields, `E` stairs, `2`-`9` skip stairs, `@` starts, items `k f b j z m u a $ * h l w B`,
  monsters `g n o i y x t`, generators `G N L I F S`, `K` King, `=` table with `P` platters and `U` tureens).
  `node tests/run.mjs floors` checks it is bordered, in the legend, its counts match and it can be finished.
- **A monster:** `def('monsters', id, { name, hp, speed: [r1, r2, r3], dmg, points, ai, r, ... })` in `10-defs.js`, an
  AI kind in `AI` (`23-monsters.js`) if it needs a new behaviour, and its rig in `monsterRig()` (`13-art.js`). Give it a
  map character in `MON_CHAR` and a generator in `def('gens', ...)` / `GEN_CHAR`.
- **An item:** `def('items', id, { name, pts, heal, food, shoot, treasure })`, its sprite in `buildArt()`, its effect in
  `takeItem()` (`22-heroes.js`). Special potions and amulets are entries in `SPECIALS` and `AMULETS`.
- **A narrator line:** a key in `LINES` (`05-text.js`), then `say(key, hero, priority)` where it happens. Keys starting
  `tip_` play once per game.
- **A song:** an entry in `SONGS` (`53-audio.js`), in the engine's step notation; name a track and set `on: false` to
  make it a layer `layer(name, on)` brings in.
- **Balance:** every number in `TUNE_SPEC` (`01-tune.js`) is a live slider in Dev Tools (pause menu); Reset puts them back.
