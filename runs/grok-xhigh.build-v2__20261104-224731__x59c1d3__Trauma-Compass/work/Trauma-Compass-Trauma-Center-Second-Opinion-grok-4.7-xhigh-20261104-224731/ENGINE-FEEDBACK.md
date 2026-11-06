# Engine feedback: trauma-compass

What this game needed from the my-3dge engine (at 2dbd829) and did not get. The owner collects this file
from every game to improve the engine, so write each item for an engine agent who has never seen this repository:
what you tried, what happened (the command, the error code), what you expected, and what you did instead.

## Requests

- After `capture` and `restore`, call the scene again once the world is back. What I tried: keep the operation in a module, snapshot it on a chart component, and step. What happened: restore replaced the world and the next step still read the module from before the rewind, so the hash diverged until the page called `followChart` on the restored blob. What I expected: a scene hook that runs after restore, with the restored world already in place. What I did instead: the page reads `chart.blob` every frame and copies it back into the module before the next hands are packed.
- A public way to rewrite a geometry the page kept. What I tried: build the operating sheet once with `defineGeometry` / a kit box and write new positions into the same buffers every frame (breath, heartbeat, incision). What happened: there is no public call to replace the vertex data of a geometry the page is already holding, so a kept `BufferGeometry` cannot be repainted through the API. What I expected: something like `writeGeometry(id, positions, colors)` that is safe across a scene restart. What I did instead: the page holds the buffers from the geometry the kit box created and writes them directly. That is the gap PLAN.md §17.3 names.
- A view setting the sim is allowed to read. What I tried: `game.radialSlow` as a live slider that scales field time while the radial is open, and include that scale in the operation. What happened: view settings are not visible to sim-side code, so two peers would not share a slider that never enters the hash. What I expected: a `when: 'now'` number the scene can read and put into the hands or the world. What I did instead: the radial holds field time at a fixed 60 ticks per step (0.6 of a normal step). The slider still draws and resets. It does not change the clock.

## Friction

- `outline.width` must be a whole number. `1.5` fails at import with `CORE_BAD_SPEC`. The message is clear once you see it. A note beside the field in the look docs would have saved the guess.
- Preset ids are global. `defineSfx('sfx:laser')` and `defineEmitter` of `emitter:rain` fail with `CORE_DUPLICATE_ID` because the engine already registered those. `song:title` is taken the same way. The game prefixes its own ids.
- `SongSpec` has no `description`. Passing one throws when the song is defined. `speedlines` takes `density`, not `strength`.
- Boolean settings accept `1` and `0` as well as `true` and `false`. `?game.autoplay=1` is a real setting. Stripping unknown keys is still required; `aihub*` keys are not engine settings.
- `createEngine` steps during warmup before the page can pause. A hub round has to `pause`, `seed`, `pause`, then `ready`, or the two copies do not both start at tick 0.
- Giving `createEngine` the page store makes the quality governor write `gfx.governor` when a heavier scene starts. A hands-off demo then changes `localStorage`. The page keeps progress in its own store and does not pass that store in.

## Local engine patches

<!--
`npm run check` accepts an edited engine file only when it is listed here, one line each, its path in backticks:
- `engine/path/to/file.ts`: why no workaround in the game would do, and what the engine should change instead.
-->
