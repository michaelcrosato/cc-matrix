# Gauntletdown: designer notes

Everything is data first. Add content by editing one table; the sim, the Dev Tools, the bot and the tests pick it up.

- **A floor.** `PLAN` in `game/src/00-core.js` lists the descent: `{ kind: 'floor' | 'treasure' | 'boss', no, realm, name, size, rooms, gens, mons, doors, food, traps, force, runes, lava, spikes, bell, tithe, skip }`.
  `genFloor(step, seed)` in `10-floors.js` turns an entry into ASCII rows (legend in `docs/LEGEND.md` form below) and `solvable(rows)` proves a hero with keys can reach the stairs.
  A hand-drawn floor is just a `{ rows, meta }` object: pass it to `buildWorld(step, { rows, meta })`.
- **A monster.** Add its glyph to `MON` (`00-core.js`), a rig to `monRig` (`20-world.js`), a behaviour `case` in `monStep` (`22-monsters.js`) and a generator to `GEN` / `GENDEF` + `drawGen` (`30-art.js`) if it breeds.
- **An item.** `pickup()` in `21-sim.js` (the effect), a sprite in `30-art.js`, a legend char in `buildWorld`.
- **A line for the Gaunt.** `LINES` in `00-core.js`; call `say('key', { hero })`. Priorities and cooldowns are in `say()`.
- **A tuning value.** One row in `TUNE_DEF` (default, min, max, step, label) gives it a Dev slider, a save and a reset.
- **A hero.** One entry in `CLASSES`.

Legend: `#` wall, `X` cracked wall, `+` door, `T`/`Y` trap walls (opened by `^`/`v` plates), `?` fake wall, `~` lava, `=` table, `.` floor, `@` start, `E` stairs, `2`-`9` skip stairs, `O` transporter, `!` stun rune, `s` spikes, `|` `-` force field, `k` key, `f` roast, `b` loaf, `j` cider, `z` stew, `m` flask, `u` potion, `a` amulet, `$` gold, `*` gem, `h` chest, `l` locked chest, `w` crown, `P` platter, `B` bell, `g n o i y x t` monsters, `G N L I F S U` generators, `K` the king.

Run `node build.mjs`, then `node tests/run.mjs` (prints only failures and a count).
