# Authoring Second Stitch

Everything below is plain data. No engine knowledge needed for the first three.

## Add an operation
1. Add an `op({...})` block in `src/content/ops/index.js`: `id`, `n`, `title`, `arena`, `surgeon`, `gifts`, `tools`, `patient` (name, age, job, hook, objective, `followUp` for S A B C), `time`, `vitals`, `doses`, `music`, `stages`.
2. A stage is `{ id, say, spawn, begin, timed, on, until, then, hint, music, skipIf, jump }`.
   - `spawn` entries: `{ k, id, at, ... }`. Kinds are in `src/sim/entities.js` (`pool, bleeder, nick, laceration, incision, hook, prop, magnet, tumor, core, stalk, plate, organ, fragment, clamp, graft, polyp, egg, eye, cyst, clot, mask, dressing, marker, strain`). `hiddenBy: 'p1'` hides under another; `scan: true` needs the Scanner.
   - `until`: `{ clear:[kinds] }`, `{ flag }`, `{ meta }`, `{ time }`, `{ sids:[ids] }`, `{ all:[...] }`, `{ any:[...] }`.
   - Commands (in `begin`, `then`, `timed`, entity `then`): `say, spawn, remove, removeKinds, unlock, setDrain, music, camera, flag, codeBlue, massage, vitals, setVitals, fake, composure, hurt, pain, cold, pinkUp, sfx, voice, fx, prompt, mimic, heart, noHeart, addTime, tag, win`.
3. Add it to `CAMPAIGN` in `src/sim/campaign.js` (and `CAMPAIGN_OPS`, `CONSULT_OPS` if wanted).
4. `node tests/balance.mjs --write` sets its `par` from the full-skill bot. `node tests/run.mjs sim` checks idle fails, the bot clears, determinism and network sizes.

Dev Mode: Pause, Dev Mode, JUMP goes to any stage; ACTIONS has Copy Op JSON to Console. URL flags: `?op=op5&stage=1&diff=attending&seed=3&god=1`, `?scene=ep4`, `?attract=1`, `?menu=1`.

## Add a scene
Add to `src/content/scenes/index.js`: `{ id, title, set, music, cast:[left,right], figures:[[who,[x,z],clip]], beats:[{ who, emo, say, cam:'wide', cue, swap, other }] }`. Emotions: neutral stern shock sad smile angry panic. Two wrapped lines at most; `*word*` highlights; the font has no em dash or ellipsis characters, so type `-` and `...`. `node tests/run.mjs content` lints all of this.

## Add a character
Add to `src/content/cast.js`: display name, `skinHex`, gibberish `voice` (`timbre`, `base`, `speed`, `range`) and `look` (hair style, cap, scrubs, extras). Bust and figure are built from it in `src/content/models/index.js`. `node check.mjs --sheets src/content/models/index.js` draws every def.

## Add a strain
1. A state machine in `src/sim/strains/index.js`: `{ step(sim, e, dt), on(sim, e, signal, entity, seat) }`, registered in `STRAINS`. Keep state plain data on `e`; randomness comes from `rangeOf(sim, ...)`. Spawn working parts as entities with `owner: e.id` and `sig: 'name'`; they signal `on` when finished.
2. A creature in `src/view/strains.js` (`make` and `update`).
3. A theme in `src/content/songs.js`, signature sounds in `src/content/sfx.js`.

## The one rule
`src/sim` and non-model content import nothing from the engine, the DOM or the clock. Sim state must survive `structuredClone`. That is what makes The Second Look, determinism, the bot, Node tests, the hub's server copy and network snapshots possible.

## Tests and build
`node tests/run.mjs [sim|content|headless|browser|hub]` prints only failures and a count (needs `npm install playwright@1.63.0`). `node tools/build.mjs` writes `dist/game.html` and the deliverable in the parent folder.
