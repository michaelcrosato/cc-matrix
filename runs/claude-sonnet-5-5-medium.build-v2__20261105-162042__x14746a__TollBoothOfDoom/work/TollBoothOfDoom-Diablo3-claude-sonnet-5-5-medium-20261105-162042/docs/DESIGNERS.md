# Designer recipes

Everything is a plain table in `src/data`. Add content, run `node tools/build.mjs`, open the page, and use Dev Mode (pause menu)
to jump to it. `node tools/test.mjs` checks fonts, references, models, sounds and songs.

- **A monster:** add an entry to `MONSTERS` in `src/data/monsters.js` (`hp`/`hit` multipliers, `speed`, `kind` one of melee, lunger, slammer, caster, bloat,
  hooker, blinker, charger, swooper, raiser, plate, nest), a body in `src/view/models/bodies.js` and its name in `makeMonster` (`src/view/actors.js`). List it in a zone's `mon`.
- **A skill:** add to `SKILLS` in `src/data/classes.js`: cost/cooldown, a clip name, and `fx` ops from `src/sim/effects.js`
  (arc, circle, cone, ring, projectile, lob, chain, dash, leap, blink, zone, obstacle, summon, turret, buff, consume_status, consume_graves, comet_rain, delay, repeat).
  Each of its three Tones is `mod` (merged into the first op), `add` (extra ops), `set` (skill fields) or `flags`. Put its id in the class's `skills` list.
- **An item or legendary:** affixes live in `src/data/items.js` (`AFFIXES`), legendary powers in `LEGENDARIES`, set bonuses in `SETS`. A power's behaviour
  is a hook in `src/sim/powers.js` (`modifySkill`, `onCast`, `onKillPower`, `onPickupGold`, `modifyIncomingFatal`) or a stat read in `deriveStats`.
- **A room:** an ASCII template in `src/data/rooms/templates.js`, 15 wide by 13 tall, with door sockets `D` at the midpoint of each edge.
  Legend: `#` wall, `.` floor, `~` pit, `P` pillar, `S` trash, `E` elite, `C` chest, `B` breakable, `T` trap, `L` light, `A` shrine, `K` coffin, `N` nest, `H` lever, `X` entrance or exit.
- **A zone:** an entry in `src/data/zones.js` (rooms, monsters, textures, music, `next`). Authored maps go in `src/data/rooms/arenas.js`.
- **A quest:** steps in `src/data/quests.js` (`kill`, `use`, `defend`, `boss`, `reach`, `equip`, `coffin`, `rope`); scripted beats live in `src/sim/campaign.js`.
- **A song:** `src/data/songs.js`, text patterns of 16 steps per track; **a sound:** `src/data/sfx.js` (`SoundDef` data, layers for weight).
- **Balance:** every number a designer tunes live is in `src/data/tuning.js`; Dev Mode shows each as a slider with its default and a Reset button.
