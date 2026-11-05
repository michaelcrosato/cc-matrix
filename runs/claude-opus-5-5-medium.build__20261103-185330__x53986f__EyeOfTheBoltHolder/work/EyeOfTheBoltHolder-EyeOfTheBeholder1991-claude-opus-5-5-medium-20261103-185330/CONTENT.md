# Content formats (for designers)

All content is data in `src/1x-data-*.js`. The lint suite checks every id and coordinate.

## Floors (`15-data-floors.js`)
- `map`: one character a cell. `#` wall, `.` floor, `@` start, `<` `>` stairs, `+` door, `=` gate, `L` `K` locked door,
  `M` magic seal, `H` secret wall, `I` illusory wall, `P` plate, `T` dart trap, `O` pit, `o` trapdoor, `^` teleporter,
  `S` spinner, `U` the Undergate, `*` pit landing, `B` the boss.
- `doors: { id: { at: [x, y], key, kind: 'simple' | 'warded', seal, undergate } }`, `plates: { id: { at, mode: 'hold' |
  'latch' } }`, `pits`, `teleports: { id: { at, to: [x, y, dir], silent } }`, `secrets`, `illusions`, `traps`,
  `stairs: { 'x,y': { to, at: [x, y, dir] } | { sealed } | { exit } }`, `fall: { to, at }`, `safe: [[x, y]]`.
- `features: [[id, kind, x, y, face, options]]`: the feature on the wall `face` (N E S W) of the open cell (x, y).
  Kinds: lever, button, catch, alcove (`holds`, `accepts`, `shrine`, `riddle`), inscription (`text`), torch, candle,
  greatLock, gearNiche, clockFace, shrine, undergate, altarSlab, and decor (pipe, grate, chain, cage, gearWall, eyeRelief).
- `items: [[x, y, itemId, count]]`, `mons: [[type, x, y, count, { id, asleep, patrol, drop }]]`,
  `wanderers: { budget, types: [[type, n]], at: [[x, y]] }`.
- `wires: [{ when, mode, once, do, fail, undo }]`. Triggers: `lever`, `levers` + `is`, `catch`, `buttons` + `within`,
  `plate`, `plates`, `alcove` + `accepts` | `kind`, `killed`, `hurt` + `below`, `flag`, `opened`, `gears`, `wards`,
  `sequence`. Actions: `open` `close` `toggle` (door), `story`, `take`, `special`, `give`, `place`, `msg`, `secret`,
  `reveal`, `hint`, `hintAfter`, `spawn`, `teleporter`, `xpSecret`, `sfx`, `bridge`, `return`, `clock`, `candlesOut`,
  `music`, `race`, `bossWake`, `flag`, `join`, `quest`, `veilHelp`.
- `events: [{ at: [x, y] | area: [x0, y0, x1, y1], once, do }]`, `hints`, `waypoints` (Dev Mode's warps).
- `look`: ground and wall colours, side style, fog, ambient light.

## Items, monsters, spells (`10-data-items.js`, `11-data-rules.js`)
An item is `IT(id, name, kind, { dmg, speed, hit, cls, two, reach, throw, blunt, ammo, stack, def, icon, color, desc })`;
icons are 12x12 strings in `61-ui-kit.js` (`B.ICON_ART`). Monsters list size, HP, Defense, attack, damage, interval,
move time, sight, XP, specials and drops. Spells give level, target and description; their effects are in 27-sim-magic.js.

## Text and stories (`14-data-text.js`)
Stories are `{ lines: [[speaker, text]], choices: [{ label, reply, do }], do, bark }`. Speakers carry a rig for the
portrait and a voice profile (`B.VOICES` in 50-audio.js). Hints may name actions in braces, `{strike}`, which show as the
player's own buttons.

## The walkthrough (`69-bot.js`)
`B.WALK[floor]` is the bot's plan: `go`, `use`, `openDoor`, `grabAt`, `loot`, `hold`, `stow`, `put`, `throw`, `zap`,
`wait`, `clear`, `rest`, `rest4`, `retry`, `branch`, `boss`. The playthrough test and the attract mode use it.
