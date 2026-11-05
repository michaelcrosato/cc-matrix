# Engine changes (my-3D2dge v0.85.2, handoff copy)

Applied by `python3 tools-gd/patch-engine.py my-3d2dge.js` (idempotent; the untouched copy is `.my-3d2dge.orig.js`).

## E2: Humanoid gear (the only engine change)

- **What:** new hand-held weapons `axe`, `bow`, `club`, `pan`, `scythe`, `fork` (with `tip()` lengths), an off-hand
  `shield` (`offhand: 'shield'`, coloured by `colors.shield`), and two hats, `horned` (a helmet with curling horns,
  `hat: { style: 'horned', horn }`) and `toque` (a cook's hat). Drawn in the HD path's depth-sorted list next to the
  sword, so they sort with the arms in every view. Long hafts (scythe, fork) rest upright like the staff; the bow rests
  forward and its string runs to the right hand while it is drawn.
- **Why:** the heroes' and monsters' identities (the Berserker's axe and horns, the Shieldmaiden's shield, the Ranger's
  bow, the Gnasher's club, the Fryar's pan, the Tithe's scythe, King Famish's carving fork, the Pot-Lobber's toque).
- **Test:** `tests/sim.mjs`, "the new gear is built in (no warnings)": every weapon with a shield and the horned hat
  updates and gives a tip with no "not built in" warning; screenshots of the class select and every floor.

## Done in game code instead of the engine (planned as engine changes, not needed)

- Multi-source flow field toward the nearest hero: `buildField()` in `game/src/21-world.js` (and `linkedField()` for
  the bot, which also walks through transporter pairs).
- Bouncing shots and shots that crack walls: the game's own projectiles (`stepShots()` in `23-monsters.js`).
- A Create + Options guard: the session code ignores Options while `Pad8` is held; nothing binds Create.
- PlayStation symbols by default with an Xbox option: the game's own `Button symbols` setting sets every player's
  `input.glyphs`.
- 10-foot HTML menus: a CSS `zoom` on the engine's `.esh` layer, sized from the window (`00-core.js`).
- Per-player initials: the game's own letter wheel reads each qualifying player's input (`62-over.js`).
- A voice bus: Babble's own gain node under the engine's master gain, with a `Voices` volume setting (`53-audio.js`).
