# Engine feedback: weetare

What this game needed from the my-3dge engine (at 2dbd829) and did not get. The owner collects this file
from every game to improve the engine, so write each item for an engine agent who has never seen this repository:
what you tried, what happened (the command, the error code), what you expected, and what you did instead.

## Requests

<!-- What the engine should add or fix, most costly first. -->

- **`input.pressed` should hold a press until the frame has seen it.** `onFrame` reads the last sample only. When a frame runs more
  than one sim step (any frame rate under 60) a menu or a pause key read in `onFrame` loses presses. The starter's own pause has
  this bug. I wrote `ui/nav.ts`, reading keys and pads directly. Expected: a per-frame `pressed` for pages.
- **`input.use(id)` should stick, or say it won't.** `createEngine` calls `mapFor()` at every sample and switches back to a string
  `actionMap`. Nothing warns. Play simply stops responding, with all menus still working (they read the system layer). The guide and
  `input.use`'s comment both read as if a page may switch freely. I now pass a function.
- **Boot cost of a look.** On SwiftShader `post.look=look:retreat` took 74 s to first frame, `look:session` (sky only) 34 s, no look 14 s
  (`game:round`, about five bodies and ten props). Could pipelines warm lazily, or the warm-up yield, so a hub deadline can fire?
  `createEngine`'s warm-up holds the main thread, so a `setTimeout` watchdog fires late.
- **A way to swap an actor's body and build** without removing it, for outfits. I respawn it.
- **A bodiless prop is a very good moving prop.** It works today (write `sceneProp.x/y/z/q`) but no document says so; `driveBody` is what
  the docs lead you to, and its velocity shoves whatever is near. Worth a sentence in the guide.

## Friction

<!-- Docs, errors, templates or APIs that slowed you down or misled you, most costly first. -->

- `w.spawn` during a scene's `setup` is deferred: `w.get(id)` returns undefined until the first step. Reasonable, undocumented; I hit
  `Cannot read properties of undefined`, not an engine error.
- Physics raycasts during `setup` see nothing (the query pipeline has not stepped): no error, just `null`. All my props silently stood
  at y = 0 until a screenshot showed it.
- `spawnProp` with no `yaw` makes `q` NaN and throws far away in schema checking. The type says it is required, but scene code cast it.
- `addBox` makes a dynamic prop even if handed `{ type: 'fixed' }` (the error then points at `shape.size`).
- The `outline` filter, or `shells`, with a very large flat prop (a 9 km sea): `characters+objects` draws a dark band above the horizon and
  shells cover most of the picture in their colour, since the hull is pushed from the part's centre. A per-prop opt-out would help. I outline characters only.
- An action's `args` with an `undefined` value throws `CORE_NOT_CANONICAL`, deep in the capture.
- `[SIM_SHARED_DATA]` is excellent: it caught one array shared between `flow.group.seats` and `flow.ev.seats` that would have broken
  a capture. It only runs at a capture, though, so my whole-game test passed without seeing it.
- `placeActor` throws on a ceiling, which kills the frame loop when a diver passes close to a cliff. I wrote my own `hover` for actors held
  in the air (`physics.setBody` plus `vy = 0`). A blessed "pinned actor" would be welcome.
- Static JSON imports fail `tsc -b` with TS6307 on this tsconfig (`labs/game` has no JSON in its includes), though lint and Node take
  them. I wrapped the clip data as a string in a `.ts` file.
- `node x new` wasn't used: writing fifty props as one data table was faster than a file and a test each.
- The plan's engine commit (e7a1243) and client SHA-256 (529eac78…) differ from what I fetched: 2dbd829, and 6ab6be43… with the same
  1.4.0 banner.

## Local engine patches

<!--
`npm run check` accepts an edited engine file only when it is listed here, one line each, its path in backticks:
- `engine/path/to/file.ts`: why no workaround in the game would do, and what the engine should change instead.
-->
