# Adding content: no engine or sim edits, a data file and a recipe

Everything below is loaded in the order of `src/manifest.json`; add your file there. `node tests/run.mjs --fast --only=content` validates every reference. Dev mode's Jump tab and the Skills Lab are the workshop.

## A case
`src/data/cases/*.js`: `G.defCase({ id, n, chapter, title, doctor, site, clock, vitals, drain, patient: { name, age, face, where, complaint, human }, lightbox?, teaches?, duo?, look?, boss?, music?, closeAt, phases: [...], barks })`.
- A phase: `{ id, obj (at most 26 characters, a verb first), spawn: [objects], tut?: { tool, text }, clear?: { t, vitals, flag, found, only }, enter?: [actions], script?: [{ t, do: [actions] }], music?, title? }`.
- An object: `{ type, x, y, ...its fields, then?: [actions], leaves?: [objects] }`. Field units: the cavity is the ellipse at (213, 116), radii (171, 91).
- Barks: `{ enter: [per phase], done: [per phase], hint: [per phase], extra: { name: [[who, line]] } }`, each line at most 40 characters.
- Add the case to `G.CAMPAIGN` (`src/data/story/campaign.js`), then run `node tools/balance.mjs yourcase` and `node tools/balance.mjs --par`.

## A thing on the table, or a strain
`G.defObject(type, { hazard, accept(o, tool, S) -> verb, burnNeed, burned, dose, slashed, coat, grip, hold, release, step(o, S, wdt, dt), init(o, S), job, bot, ghost, strain: true })` in `src/core/` (no draw, audio or DOM there). Its look: `G.defArt(type, { stamp(F, o, S, x, y, C), over(g, o, S, x, y, C) })` in `src/art/`. Its sound and picture: emit `S.ev.push(['name', ...])` from the sim and add `G.FeelExtra.name` in `src/art/strains.js`. A strain's figure lives in `src/audio/choir.js`. A bot plan is a generator: `bot: function* (o, S, B) { yield* B.tool('forceps'); yield* B.moveTo(o.x, o.y); B.press(); ... }`.

## A site
`G.defSite(id, { label, bake(W, H, seed) -> TissueField })` in `src/art/sites.js`: use `shell`, `blob`, `tube`, `veins`, `coil`, then `F.finish()`.

## A character
`G.defCast(id, { name, skin, hair, iris, cloth, frontHair, backHair, glasses, voice: { base, syl, wave } ... })` in `src/data/cast.js` (the parts kit is at its top). A body for the ward and cinematics: add a look to `LOOK` in `src/art/props.js`.

## A story node
`G.defStory(id, [steps])` in `src/data/story/*.js`. A step is `[who, line, expr?]`, or `{ stage, music, enter: [[id, side, expr, masked]], leave, choose: [a, b], replies: [[who, line], ...], card: [big, small], cine, narr, sfx, shake, flash, wait, set }`. Add it to `G.CAMPAIGN`. Ward talk: `G.WARD_TALK[person][chapter]`.

## A stage, a song, a cinematic
`G.defStage(id, { bake(g, W, H), anim(g, W, H, t) })` in `src/art/stages.js`. `G.SONGS[id]` in `src/data/songs.js` (the engine's notation). A cinematic is a generator in `DEFS` in `src/scenes/cine.js`.

## Tuning
Every number that matters is in `G.TUNING_DEFAULTS` in `src/config.js`. Tune live in dev mode, then Info, Copy tuning, and paste the values back.
