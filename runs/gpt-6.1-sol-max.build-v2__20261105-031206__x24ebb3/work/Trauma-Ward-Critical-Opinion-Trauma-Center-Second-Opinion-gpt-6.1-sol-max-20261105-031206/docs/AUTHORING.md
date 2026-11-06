# Authoring Critical Opinion

The deliverable is a single HTML. Source modules remain here so new cases, scenes, characters and balance changes can be authored without changing the engine. `pixel-engine.js` is the unmodified 0.46.0 kit file; `tools/build.mjs` compares it with the downloaded archive before bundling.

## Run, build, check

- Open `dist/game.html` or the root deliverable in a WebGPU browser. No server or CDN is required.
- `npm run build` writes `index.html`, `dist/game.html`, and the named root deliverable.
- `npm test` runs simulation, content/audio, native engine, browser, and official Hub checks. It prints failures and one count line. Filter with `node tests/run.mjs sim`, `content`, `engine`, `browser`, `hub`, or `visual`.
- `npm run balance` prints each case at three bot skill levels.
- Browser screenshots and test reports live under `tests/results` and `check`. Tests use file URLs except the official Hub harness. The harness server binds to an OS-picked loopback port and is stopped by its own process handle.

## Cases

`src/content/ops.js` exports `OPS`, `CONSULT`, and `ALL_OPS`. Each case is JSON-safe data:

```js
{
  id: 'op12', n: 12, title: 'A NEW MORNING', arena: 'forearm',
  surgeon: 'ilya', gifts: ['quiet'], tools: ['drain', 'forceps'],
  time: 240, vitals: 85, drain: .10, doses: 3, par: 4000,
  patient: {name: 'A PATIENT', age: 42, job: 'HARBOUR WORKER',
    hook: 'SOMEONE IS WAITING AT HOME.',
    followUp: {S: 'THEY WENT HOME.', A: 'THEY WENT HOME.',
      B: 'THEY WENT HOME.', C: 'THEY WENT HOME.'}},
  stages: [{id: 'clear', title: 'CLEAR THE FIELD',
    say: 'DRAIN FIRST, DOCTOR.', hint: 'drain',
    spawn: [{k: 'pool', x: -2, z: 0, r: 1.2}]}]
}
```

`op()` and the helpers at the top of that file reduce repetition. Add a new case to `ALL_OPS` and give it a par based on the expert bot. Campaign indexing is deliberately ten authored episodes; extend `SCENES`, campaign save bounds, the jump range and shift report when adding an episode.

A stage completes when every required entity is finished. `required:false` entities bleed or attack but do not block progression. `special` supports `inject`, `quiet`, `rewind`, `blue`, and `massage`. `scripted:true` marks a teaching resuscitation. `boss` selects rhythm/echo/eye phase behavior. `deadline` causes one pressure wave. `cold` starts donor cold time; `pink` enables perfusion. Every stage automatically records a retry checkpoint.

The safe operating region is x −6 to 6, z −3.5 to 3. Keep tasks away from the lower right tool wheel. `table` assigns an entity to a triage table; `tableCount` creates separate vitals pools.

## Entity and tool rules

- `pool`: Drain. Optional `r`.
- `hook`, `prop`, `magnet`, `tumor`, `nerve`, `organ`, `clamp`: Forceps. The generated path is a curved extraction guide. Magnets resist fast pulls. Nerves restore vitals.
- `fragment`: Forceps drag plus rotation. `tx`, `tz`, `angle`, and `targetAngle` define the silhouette and alignment. A donor organ uses `place:true` and `tx/tz`.
- `incision`: Scalpel. `length` makes a line; `closed:true` and `r` make a closed tumour cut.
- `laceration`, `nick`: Suture through the zigzag path. Gel can also heal small nicks.
- `mask`: Gel coverage. `w` and `h` define a coarse paint mask. Gel on other tissue leaves a ten-second barrier that blocks tears.
- `scan`: Scanner discovery. `cyst` adds `real` and `hidden`; revealing a false cyst makes its danger readable.
- `polyp`: Laser. `eye` adds HP, open/closed phases, crawling and droplets.
- `plate`: The heart's cut/lift/laser sequence; only diastole is safe.
- `strain`: `strain:'introit'` is a buried/knock/exposed/tether state machine. `stalk` is an exposed pull. `miserere` requires two hands when two seats exist, and echoes the player's old motion.
- `dressing`: A Forceps-dragged final dressing.

All simulation code is in `src/sim`. It imports no DOM, engine or wall clock. `createOp(def, options)` returns plain data. Call `step(sim, inputs)` at 60 Hz and `drainEvents(sim)` for presentation. A seat input contains world `x/z`, `tool`, `use`, `gift`, `steady`, `rotate`, `table`, `tag`, `left/right`, and `drop`. The bot produces those same inputs. Gameplay random state is seeded and serializable.

When adding an entity kind, extend spawn initialization, tool selection and handling, `entityStep`, the view, bot strategy, and the codec kind list. Add a rule test and a complete bot stage. Do not add engine imports to the simulation.

## Story and characters

`src/content/story.js` holds `CAST`, `SCENES`, and reaction pools. Each scene has a set id and 8–16 beats `{who, say, emo}`. Supported expressions are neutral, stern, shock, sad, smile, angry and panic. Keep each line under about 60 characters and use only the engine font's ASCII punctuation. Dialogue is uppercase and wraps on the HUD.

Add character palette/voice data to `CAST`; `bustDef` and `figureDef` generate their custom portrait and masked rig. Named `head`, `mouth`, eye and brow pivots drive facial acting. Full figures carry the native hero rig joints and play compiled native clips. The bundled plumber model is never shown.

`HospitalView` constructs seven hospital environments. `FieldView` generates tissue ramps, vessels, wet sheen, skin, bone, spine, beating heart and breathing lungs. Place objects using `heightAt`, including particles. Mouse aim solves the actual curved surface by bisection. All material/mesh classes come from the shipped engine's `THREE`; point lights come from `ctx.lights`.

Run `node check.mjs --sheets src/content/models.js` after editing model data, then inspect the sheets. `node tests/run.mjs visual` captures the actual game at TV size and across the viewport matrix.

## Sound

`src/content/audio.js` contains original `SoundDef` effects and sequencer songs. `src/audio/voice.js` synthesizes 45 formant syllables into PCM and WAV data URLs at boot. There are no recorded audio assets. `AudioDirector` schedules cast-specific gibberish through the engine's sound bus, changes music at bar boundaries, and manages tool loops. Default music is 0.1. The Voices setting scales syllable playback independently.

## Menus, developers and saves

`game.js` owns application flow; `src/ui/screens.js` draws the anchored pixel HUD. The same rows accept controller, keyboard and mouse input. Touch-only devices show a controller/keyboard gate and the engine settings gear, while attract mode runs. Browsers without WebGPU show a readable renderer notice and a simulation-driven 2D demonstration.

Pause with Esc/Options, then choose Dev Mode. Its Balance tab changes the shared `config` object live; Cheats, Jump, Actions and View provide stage/scene jumping, spawns, outcomes, resuscitation, JSON export, hitboxes, bot play, speed and frame stepping. Reset restores defaults. Each new operation resets transient scene state. Saves and settings are versioned guarded localStorage records; attract and Hub sessions never write campaign progress.

## Multiplayer

Consult uses one shared `createOp` with 1–4 seats. Couch source identifiers are `keyboard` or actual pad indices, including index zero. Each seat has its own instrument and score; vitals and Composure are shared. Odd/even seats alternate gifts.

`src/net/session.js` implements the official AI Hub v1 shared-world contract. The unmodified client is the first HTML script. The host advances the simulation from a timer against `AIHub.time()`, independently of rendering; the server copy starts no engine. Inputs send at 15 Hz; snapshots at 12 Hz, keyframes at 1 Hz and event batches at up to 4 Hz, guarded by a token bucket. The compact positional codec stays below 1,100 unreliable bytes; reliable packets stay below 16 KB. All names and colors come from the Hub. The card accepts Ready and More Time. End stops traffic and sound. Session play uses Pile-Up; couch Consult also permits cleared campaign cases outside triage and the two-doctor finale.
