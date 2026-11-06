# Tolled You So: recipes for designers

All content is plain tables in `src/data`. Build with `node tools/build.mjs`, test with `node tools/test.mjs`. Dev Mode (pause menu) tests any of it at once.

- **A monster:** add a row to `MONSTERS` in `src/data/monsters.js` (life and hit multiples, speed, `brain`, `body`). A humanoid body is a `ModelDef` in `src/view/models/monsters.js`, built with `humanoid()`. Add its id to `HUMANOID` in `src/view/actors.js`. List it in a zone's `monsters`. It appears in Dev Mode's Spawn tab by itself.
- **A brain:** add a function to `BRAINS` in `src/sim/monsters.js`. Anything worth over a quarter of a life bar goes through `telegraph()`.
- **A skill or Tone:** add to the class in `src/data/classes.js`. `fx` lists effect ops from `src/sim/effects.js`; a Tone uses `set`, `patch`, `add`, `addThen`, `fxAll`, `cd`, `wind` or `charges`. `tests/sim/skills.test.mjs` casts every one.
- **An item power:** add to `LEGENDARIES` in `src/data/items.js`, then apply it in `effectiveSkill` (skills) or `recalc` (numbers).
- **A room:** add ASCII to a biome in `src/data/rooms.js`. Legend at the top. `tests/sim/zones.test.mjs` proves entrance to exit for 200 seeds.
- **A zone:** add a row to `ZONES` in `src/data/zones.js`; furniture and scripts go in `buildZoneProps` and `zoneTick` in `src/sim/quests.js`.
- **A quest:** add steps to `QUESTS` in `src/sim/quests.js`. Each has `text`, `zone`, `done(w)` and `obj(w)`; the HUD, the map and the bot all read `obj`.
- **A line of dialogue:** `DIALOG` in `src/data/dialog.js`. Keep to the HUD font; the lint test checks it. Voices follow `SPEAKERS`.
- **A song or sound:** `src/audio/songs.js` (text patterns), `src/audio/sfxdata.js` (`SoundDef`s). Lint renders every one.
- **A model:** `node check.mjs --sheets src/view/models/props.js`, then open the PNGs.
- **Balance:** `src/data/tuning.js` holds every number; each row is a Dev Mode slider. `node tools/report.mjs` prints minutes per zone, deaths, levels, boss durations and drops.
- **New clips:** `src/view/clips.js`. Keep keys linear and give every joint in every key; `tests/sim/lint.test.mjs` scans compiled tracks for NaN.
