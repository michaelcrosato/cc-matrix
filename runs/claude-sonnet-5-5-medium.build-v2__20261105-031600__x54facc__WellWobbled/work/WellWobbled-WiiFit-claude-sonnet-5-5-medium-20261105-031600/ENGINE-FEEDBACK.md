# Engine feedback: Well Wobbled

What this game needed from the my-3dge engine (at 6a1501f) and did not get. Written for an engine agent who has never seen
this repository.

## Requests

1. **A page that can change scene.** A running page cannot switch scenes, so the hub's session scene (`game:round`) had to be a second,
   separate scene picked at load by `?scene=`, with its own setup that repeats the pavilion. A `engine.setScene(id)` would let one
   scene library serve the title, the island and a session.
2. **`getTerrain` should cache.** Calling `getTerrain('terrain:x')` builds a new 240 × 240 heightfield each time. My first draft called it from
   `groundAt(x, z)` inside systems and a step cost 650 ms, and island setup took 106 s, until I cached the result in the game. Either cache
   inside `getTerrain` by id, or say in its comment that it is a builder, not a lookup.
3. **A way to read a custom, edge-triggered button.** `input.pressed(action)` is "pressed at the last sample", and a frame that runs several steps
   misses presses. In the page, `onFrame` can only see the last sample. I latched presses in the sim instead (a counter on a component, from a
   `values` custom intent). A `input.pressedSince(frame)` or an event queue would be simpler.
4. **Tinting an actor.** There is no per-actor colour, so every seat colour (the hub's four) and every tracksuit colour is a separate `defineBody`.
   A `tint` on `spawnActor`/`crowdBody` would remove a dozen near-copies.
5. **Playing a pose clip at a time without a one-shot slot.** Scrubbing slot `t` by hand works (and is data), but `playClip` with `speed: 0` plus
   `seekClip` only reaches the top clip. A `scrubClip(w, id, clip, t)` would make "the thumb is the exercise" a one-line idea.

## Friction

- `createEngine` calls `input.use(mapFor())` on every sample, with `mapFor()` from the `actionMap` option (default `actionMap:thirdPerson`). My calls to
  `engine.input.use('actionMap:roam')` were silently overridden each frame, so no custom action worked until I passed `actionMap: () => myMap`.
  The `input.use` comment does not say so; the `actionMap` option should be the only documented way, or `use` should stick.
- JSON imports: the plan and the guide say a static `import rest from './rest.json' with { type: 'json' }` passes lint and Node, but `tsc -b`
  (TS6307) says the file is not in the project, because the labs include globs are `.ts` only. I converted the JSON to a `.ts` module.
- Entities spawned in `setup` (or in a step) join at the end of the step, so `w.add(id, 'seat', …)` right after `spawnActor` throws
  `SIM_NO_ENTITY`. `spawnActor`'s `components` option is the fix, but nothing points to it from the error.
- A component array that grows past its declared length leaves holes (`undefined`), which is `SIM_NOT_DATA` at the next capture, far from the write. The
  message names no component or index.
- `ScenePropComponents` / `query('sceneProp')` is not a key of the game's own component type, so reading props sim-side needs a cast.
- `npm run check` fails a game on an 400+ line file as a warning and 600 as an error, which is fine, but prettier then expands dense lines and can
  triple a file's length. Splitting after formatting is more work than splitting before; say so in AGENTS.md.
- `node x new <kind>` prints `NEW_DOCS` lines about `labs/playground/…` for a game (as the plan warned); I wrote the entries by hand instead.
- Software-rendered WebGPU in Chromium takes 3 s a frame around the pavilion (754 draw calls, 835k triangles), and a screenshot taken before the first
  frame of a new area is solid black. That is not an engine fault, but a `__engine.whenFrame()` to await would save guessing waits.

## Local engine patches

None. `npm run check` reports the engine as pinned.
