# Authoring: how to add an op, a scene, a strain or a character

Content is data, so the rest of the game can be built with ordinary tools. Everything under `src/content`
except `models/` imports nothing from the engine. Run `node tests/run.mjs content` after any change: it
checks speakers, sets, fonts, line lengths, tokens, songs and placeholders.

## An operation

Copy a file in `src/content/ops/`, add it to `ops/index.js`, and give it a line in `pars.js`
(`node tests/balance.mjs --pars` calibrates that from the bot). A stage:

```js
{ id: 'pools', objective: 'DRAIN THE BLOOD: HOLD {use} ON A POOL', say: 'reyes|Drain first.', hint: 'drain',
  spawn: [{ k: 'pool', id: 'p1', at: [-3, 0.6], r: 1.6 }, { k: 'hook', id: 'h1', at: [-3, 0.9], hiddenBy: 'p1', arc: 0.8, pull: 1.2 }],
  until: { clear: ['pool'] },
  timed: [{ at: 10, say: 'pem|Anytime, Doctor.' }],
  on: { vitalsBelow: { 50: { say: 'reyes|Syringe.', unlock: 'syringe' } } } }
```

- **Positions:** the playable safe zone is `|x| <= 6`, `z` from -3.6 to 3, and keep out of the bottom-right
  corner (`x > 5`, `z > 2.4`) where the wheel sits.
- **Entity kinds:** `pool bleeder nick marker hook prop magnet debris tumor organ unclamp core stalk plate
  clamp fragment donor incision dressing laceration polyp egg cyst clot eye halo mask`, and `strain:*`.
  `src/sim/entities.js` says what each one wants and `src/sim/tools.js` what each tool does to it.
- **`until`:** `clear` (true or a list of kinds), `flag`, `time`, or `all` / `any` of those.
- **Commands** (in `do`, `after`, `timed`, `on`, `onDone`, `onReveal`): `say spawn remove unlock unlockEnt lock
  setDrain setVitals vitals composure music flag clearFlag persist ifPersist codeBlue massage prompt fake fx
  perfuse rand cold doses pain painUp count cue camera finish`.
- **Lines:** `'who|Text with *highlight* and {use} tokens'`. At most two lines of sixty characters. Only the
  characters the font has: type `-` and `...`. Tokens are in `src/ui/prompts.js`.
- Test it at once: `?op=<id>&stage=<n>&bot=0.7` plays it with the bot; Dev Mode's JUMP and Copy Op JSON help too.

## A story scene

Add it to `src/content/scenes/index.js`:

```js
ep11: { id: 'ep11', title: 'NEW DAY', set: 'ward', music: 'ward', beats: [
  { cam: 'wide', narr: 'THE WARD, AT DAWN.' },
  { who: 'reyes', emo: 'stern', say: 'You are late, Doctor.', mark: '!', cue: 'door' },
] }
```

Emotions: `neutral stern shock sad smile angry panic blush`. Cues are in `StoryStage.cue`. A beat's `set` changes
the room. To place it in the shift, add `{ scene, op }` to `EPISODES` in `src/sim/campaign.js`.

## A strain

Write `src/sim/strains/<name>.js` with `init(sim, e, api)`, `update(sim, e, dt, api)` and
`on(sim, e, what, ent, seat, api)`, and register it in `strains/index.js`. Rules: plain data only, randomness
only from `api.range` and `api.random`, and spawn your pieces as ordinary entities with `owner: e.id`, because
then the tools, the hint marker, aim assist, the bot and the network all understand them. A view for anything
that needs one goes in `src/view/entviews.js`. Spawn it from a stage with `{ k: 'strain:<name>', deadFlag: 'x' }`.

## A character

1. A bust in `src/content/models/cast.js` (`bust({...})`, and a skin colour in `src/view/bust.js`), and a figure
   if they appear in wide shots.
2. A voice in `VOICES` in `src/audio/voice.js` (`timbre`, `basePitch`, `speed`, `range`).
3. A name in `SPEAKER_NAMES` in `src/content/lines.js`, and pools there if they bark in surgery.
4. `node check.mjs --sheets src/content/models/index.js` draws them. Look at the sheets.

## An arena or a set

Arenas are in `src/content/arenas.js`: a `height` and a `mask` (pure functions), a five-step `ramp`, and painter
flags; `src/view/field.js` paints them. Sets are functions in `SETS` in `src/view/sets.js`: geometry plus a lighting
recipe (`env`, `light`), generic props through `kenney(...)`, and `wide`, `close` and `spots` for the story stage.

## Numbers

Every balance number is in `src/core/config.js`. `SLIDERS` puts one in Dev Mode's BALANCE tab, live, with Reset to
Defaults. `node tests/balance.mjs` prints every op at bot skills 0, 0.4, 0.7 and 1.0.

## Building and testing

- `node tools/build.mjs` writes `dist/game.html` (for the tests) and the deliverable one folder up. It needs `esbuild`.
- `npm install playwright@1.63.0` once, for the browser tests and the kit's `check.mjs`.
- `node tests/run.mjs [sim|content|browser|smoke|hub]` prints only failures and one count line.
- URL flags outside a session: `?op= &stage= &diff= &seed= &bot= &god= &attract= &dev= &scene=`.
