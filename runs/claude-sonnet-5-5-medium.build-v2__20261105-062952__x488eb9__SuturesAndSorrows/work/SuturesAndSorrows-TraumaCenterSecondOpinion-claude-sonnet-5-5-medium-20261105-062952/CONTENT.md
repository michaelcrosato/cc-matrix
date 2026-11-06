# Adding content (designer notes)

Content is data. Nothing below needs edits to the sim.

**A case.** `src/data/cases.js`: `G.defCase('c12', { n, name, patient, site, clock, vitals, drain, par, chapter, phases: [ { obj: 'Verb the thing', spawn: [{ t: 'shard', n: 4 }], bark: 'line', learn: 'forceps', until: S => ..., init(S, Op) {} } ] })`. `spawn` entries are object types with options; `n` copies are scattered in the cavity unless `x`/`y` are given (then `n` is the object's own count, e.g. stitches). Add the id to `G.CASE_STORY` and `G.CHART`.

**An object.** `src/core/objects.js` or `strains.js`: `G.defObject('type', { drain, init(S, o, spec), tick(S, o, dt), grip, burn, sed, slash, tools, pt })`. Draw it in `src/art/draw.js` (`Dr.stamp` for tissue, `Dr.over` for markers). Give the bot a plan in `src/bot/autosurgeon.js` (`PLANS.type = function* (B, o) {...}`).

**A strain.** An object with `strain: true`; the choir figure is a row in `A.choirUpdate` (`src/audio/audio.js`).

**A site.** `src/art/sites.js`: add a recipe to `R`, reference it by name in a case's `site`.

**A character.** `src/art/bust.js`: add an entry to `CAST` (see Appendix C's keys), a voice row in `src/audio/audio.js` (`VOICES`), a name in `G.WHO` (`src/data/story.js`).

**A story node.** `src/data/story.js`: `sc('id', 'stage', [['who', 'expression', 'line'], ...], { card, cine })`. Stages are in `src/art/stages.js`.

**Tuning.** `G.DEFAULTS` / `G.TUNING_INFO` in `src/config.js` become dev-mode sliders automatically.

Dev mode (pause menu, Dev Mode) has Jump (any case and phase), spawn at cursor, story jump, cheats and "Copy tuning". Skills Lab (Case Files) is a sandbox with no clock.
