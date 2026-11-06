# Far Cry Uncle: adding things without touching code

Everything below is plain data. Run `node tests/run.mjs` after a change; the `static` suite checks references and the font.

- **A weapon.** Add a row in `src/content/weapons.js` (slot, class, mag, rate, damage, wear, price). Add its parts to `GUN_PARTS` in `src/art/viewmodels.js`: `body`, `mag`, `bolt`, `rust`, `tape`, `muzzle`. Rack and hands pick it up by id.
- **A site.** Add an entry in `SITES` (`src/content/sites.js`): `at`, flatten radius `r`, `props` as `[modelId, dx, dz, turnDegrees]`, optional `squad`, `cover`, `npcs`, `safe`. Terrain, map and bubble follow.
- **A checkpoint, stone case, trig point, rail halt.** One row each in `POSTS`, `CASES`, `TRIGS`, `HALTS` in the same file.
- **A road or the railway.** Polylines in `src/content/roads.js`. The ground flattens and paints itself.
- **A mission.** An entry in `src/content/missions.js`: `giver`, `requires`, `pay`, `brief`, `steps`, `ops`. Step types are `goto leave talk report use deliver enter steal escort ride destroy blast kill collect hold timer choice script`. For anything else add a coroutine in `src/missions/scripts.js` and name it with `{ do: 'script', name }`: yield seconds, or a function to wait on.
- **A line of dialogue.** `src/content/dialogue.js`: `[speaker, text]`, under 60 characters a line, two lines at most, the HUD font's characters only. Voices are generated from the text.
- **A margin note or an epigraph.** `src/content/notes.js`.
- **A model.** A `model()` def in `src/art/models.js`, added to `OWN`. Check it with `node check.mjs --sheets src/art/models.js`, then open the PNGs.
- **A clip.** People: `src/art/clips.js`, on the hero rig's joints. Hands: `HANDS_CLIPS` in `src/art/viewmodels.js`.
- **A sound or a song.** `SOUNDS` in `src/audio/sfx.js`, `SONGS` in `src/audio/music.js`. No files.
- **A balance number.** `SLIDERS` in `src/content/tuning-defaults.js`. It appears in dev mode's Balance tab with a reset. Systems must read `TUNING.x` at the moment of use.
- **An attract beat.** A generator in `BEATS`, `src/attract/beats.js`.

Placing things by eye: pause, Dev Mode, Debug tab shows the crosshair's world X and Z.
