# Authoring guide: how to add an op, a scene, a strain or a character

Everything below is **data** (JSON-safe) except strains, which are small state machines. Run `node tests/run.mjs content` after every change; it lints text, positions, tokens and content references.

## Add an operation
1. Create an object in `src/content/ops/ops1.js` or `ops2.js` (see `op1`), and add it to `OPS` in `src/content/ops/index.js`.
2. Fields: `id, title, arena (src/content/arenas.js), surgeon ('ilya'|'sabine'), gifts, tools, patient {name, age, job, hook, followUp{S,A,B,C}}, scene, time, vitals{start,drain} (or tables[]), doses, music (a key of src/content/songs.js), par, stages[]`.
3. A stage: `{ id, say (key in src/content/lines.js), hint (a tool, 'dress', 'move', 'tables', 'paddles'), cmds[], spawn[], until, on{vitalsBelow, time, flag}, after[] }`.
   - `spawn` entries use the helpers in `ops/helpers.js`: `P` pool, `H` hook, `LAC` laceration, `CUT` scalpel path, `MASK` gel region, `DRESS`, `POLYP`, `MARK`, `STRAIN`, `DRAG`, `PROP`.
   - `until`: `{clear:[kinds]}`, `{flag}`, `{done:id}`, `{time}`, `{all:[...]}`, `{any:[...]}`.
   - Commands: `say, spawn, remove, unlock, setDrain, music, flag, codeBlue, vitals, setVitals, composure, awaken, cold, tagOK`.
   - Positions are field coordinates: playable area `|x| <= 6`, `z` in `[-3.6, 3.0]`; the content lint checks it.
4. Add the story scene (`src/content/scenes.js`) and a `CAMPAIGN` step (`src/sim/campaign.js`).
5. Calibrate `par` with `node tests/balance.mjs calibrate`. The bot at skill 1 is the baseline.

## Add a scene
`{ id, title, set ('or7'|'ward'|'corridor'|'office'|'scrub'|'atrium'|'roof'), music, beats:[{ who, emo, say, cue }] }`. Beats are at most 2 lines of 60 characters (the lint allows 3 wrapped lines on the story screen). `emo`: neutral, stern, shock, sad, smile, angry, panic. Highlight with `*word*`. Glyph tokens: `{use} {tool} {gift} {steady} {confirm} {back} {table} {extra} {paddles} {rotate}`.

## Add a character
Add an entry to `src/content/cast.js` (skin, hair, hairStyle, cap, scrub, glasses, moustache...) and a voice in `CAST_VOICES` (`src/audio/voice.js`). The 3D bust, the full-body figure and the HUD face are all built from that entry.

## Add a strain (boss)
1. `src/sim/strains.js`: add `STRAINS.<name> = { init(sim, e), step(sim, e, dt), onCut, onPop, onSnap, laser, onMask }`. Sub-entities carry `sk` and `par`. Keep state plain data.
2. Spawn it from a stage with `STRAIN('<name>', 'id', { ...params })`.
3. Draw it: entities of kind `eyeT`, `plate`, `hook` (tether) are drawn by `src/view/field.js`; add a mesh in `FieldView.make` for new kinds.
4. Teach the bot (`src/sim/bot.js`) the new entity kinds and run `node tests/run.mjs sim`.

## Tools, sounds, songs
- Tool rules: `src/sim/tools.js`. Tool models: `src/view/hands.js`.
- Sound effects are `SoundDef` data in `src/content/sfx.js`; songs are generated from chord tables in `src/content/songs.js`.
- Balance sliders live in `src/core/config.js` (`SLIDERS`), shown in Pause > Dev Mode > Balance.

## Dev Mode
Pause (Esc / Options) > Dev Mode: Balance sliders with Reset, Cheats, Jump (any op and stage, any scene), Actions (complete stage, win, fail, Code Blue, spawn, **Copy Op JSON to console**), View (hitboxes, Bot Plays, sim speed, frame step, stats).

## Testing
`node tests/run.mjs [sim|content|browser|hub]` prints only failures and one count line. `node tests/balance.mjs` prints the bot's results per op and skill. URL flags for review: `?op= &stage= &diff= &seed= &bot=1 &god=1 &scene= &attract=1`.
