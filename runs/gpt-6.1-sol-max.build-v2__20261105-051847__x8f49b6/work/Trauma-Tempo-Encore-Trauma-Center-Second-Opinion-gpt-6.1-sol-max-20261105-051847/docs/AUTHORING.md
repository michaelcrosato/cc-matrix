# Authoring the night shift

Run `npm install`, then `npm run build`. The build embeds JavaScript, the Rapier WASM, both graphics backends, the pristine Hub client, fonts and About data in `dist/game.html`, and copies the final HTML to the workspace root. Open that HTML directly, or run `npm run serve` for an automatically assigned loopback port. No CDN or network connection is needed to play the standalone build.

## Operations

`src/data/ops/index.js` is the procedure catalogue. Each operation names a patient, a doctor, sites, timer, base tempo, par score and a list of phases. Helpers create gel zones, guide polylines, suture gates and extractable shards. Add an operation to the exported array; the chart board and dev selector use that array.

Every phase has an id, an objective, a list of instruments and a complete spawn list. A phase checkpoint discards the preceding field, so it must be independently playable. `site` selects a starting organ; a spawn may override its own `site`. Coordinates are logical field units: x −1.35 to 1.35 and y −0.85 to 0.85. Put all touch targets inside `(x / 1.4)² + (y / 0.85)² <= 1`. The specimen tray is centered at (1.62, 0.2).

Completion normally requires every `required` entity to be done. Optional hazards can remain unless the objective specifically requests cleanup. `done.vitalsAbove`, `done.arrestsSurvived`, and `done.allClampsOff` add interlocks. `ordered` gates task types to the spawn order; emergency bleeders, pools and spills are always accessible. `clampsOn` supplies existing clamps for a closing phase. `begin` can set vitals, apply an immediate dip, set composure, choose a doctor, start a world-time drain, lock failure for a tutorial, or trigger an arrest with a specified deadline. `minDuration` is reserved for atmospheric, unfailing scenes. `strain` displays a first-encounter card. `extraWave` starts a second wave after the initial targets are cleared.

Any spawn defaults to required. Secondary attacks call `sim.spawn(data, false)`. Supported kinds are exported as `kinds`. Prefer actual interactions over timed objectives. The observable entity progress drives tool guides, labels, animation, paint and scoring.

## Tools and parasites

`src/sim/sim.js` contains authoritative tool rules and attacks. It imports no graphics, browser or audio APIs. A fixed 1/60 step takes one input frame per seat. Add new kinds to data lint, their simulation behavior, the bot's decisions and `src/view/entities.js` or `strains.js`. Keep event payloads plain JSON so the Hub can forward them. New randomness comes from the Sim's seeded generator, never a global random source.

`src/sim/physics.js` owns each operation's Rapier world, rigid bodies and grip springs. View-only particles use a separate Rapier world. Release held items and free worlds when leaving an operation. Incomplete pulls return to their anchor; an eight-beat Legato reattachment releases the corresponding grip.

A bot action is a normal InputFrame. `src/sim/bot.js` can inspect state but does not complete objectives directly. It stabilizes, shocks, uses a gift, clamps, removes the source of recurring attacks and then handles the current objective. Noise and reaction delay test the same actions with imperfect hands. Its per-operation pace models a cautious surgeon. The same bot powers attract mode and the dev panel.

## Story

Add a scene in `src/data/story/index.js`. Each scene has a set (`or`, `corridor`, `office`, `ward`, `lab`, `roof`), a music mood and up to 30 short dialogue lines. A line names an existing cast id, text and an expression. Keep a line short enough to read on a TV. Uppercase shouts trigger a camera accent. Story can be advanced, held to fast-forward or skipped.

Patient follow-ups belong to operation data. Bea does not say “good” before S16; data lint enforces it. During Operation 7 the voice becomes Pip reading the notebook. Add barks to the keyed arrays, rather than hard-coding UI text in the simulation.

## Tuning and presentation

`src/config/tuning.js` is the only source of gameplay defaults and slider bounds. Its grouped entries generate live dev pages and default ticks. The running simulation reads the current tuning every step. Add a value there, use it in the simulation, and verify it with a behavioral test. Page and global reset restore those exact defaults.

The title and tagline exist only in `src/config/identity.js`. All title screens, metadata and the catalogue derive from it. Logo sizing wraps for longer names.

The view reconciles entities by id. `field.js` supplies painted, displaced surfaces; `bust.js` supplies original parametric faces and clothing; `strains.js` uses native skinning; instrument and prop motion uses native AnimationMixer clips. `ink.js` is one TSL post graph shared by WebGPU and WebGL2. Uniforms control outlines, halftone, the Hush, danger, speed lines and flashes. Keep render target portraits' UVs vertically flipped.

All sound is written in `src/audio/engine.js`. Synth functions accept an AudioContext or OfflineAudioContext and a destination. Music, effects and voices have independent buses. Music starts at exactly 0.10. Do not add recorded sound files. `src/input/glyphs.js` expands action tokens for keyboard/mouse, PlayStation or Xbox prompts.

## Co-op and Hub

Grand Rounds is operation index 8. Couch seats map distinct standard gamepads or keyboard/mouse to the same Sim. One shared camera changes site; each seat retains its own tip, pressure, tool and contribution.

Hub sessions use `src/app/session.js`. The host runs the authoritative fixed-step simulation from a timer. A server host has no renderer, audio or local seat. Other copies render full keyframes and compact deltas, with immediate local tip prediction. The token bucket caps outgoing traffic at 16 messages/s. Unreliable snapshots stay under 1,100 bytes; full keyframes stay under 16 KB. Names are assigned with textContent. Only the host finishes, and every present player receives statistics. End stops all input, sends and audio. The unmodified released client is in `tools/vendor/session.js`.

## Checks and hand-in

`node tests/run-all.mjs` runs every suite. Add `sim`, `browser` or `hub` to run one suite after changing the code it covers. Output consists of failures and one total. Detailed JSON goes to `artifacts/`. Use a single browser at a time and only stop processes you started.

`?test=1` exposes synchronous steps, warp, input override, bot, operation/phase jump and hashes through `window.__game.test`. `?norender=1` disables drawing for fast UI tests. `?webgl=1` forces the compatibility backend. `window.__game.state()` always provides compact observable state.

The raw importable About content is `src/data/about.json` and becomes the `about-data` script element. Usage stays “added on import”. Feedback and test counts must reflect actual runs. Update the root `exit-interview.json` in the exact TASK.md schema and rebuild after changing About data. Commit no generated viewport pictures into source.
