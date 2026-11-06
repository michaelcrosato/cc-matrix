# Engine feedback: thumb-yoga

What this game needed from the my-3dge engine (at e7a1243) and did not get. The owner collects this file
from every game to improve the engine, so write each item for an engine agent who has never seen this repository:
what you tried, what happened (the command, the error code), what you expected, and what you did instead.

## Requests

- Let a page add a mesh. The retreat needed a readable guest and a few simple solids. There is no public way to register a generated mesh, so the body stays on the engine humanoid and the props stay on the built-in parts. A `geometry:cylinder` is also missing. A frustum stood in for a post.
- Start the music bus at 0.1, or let `createAudio` take a default. The bus comes up at 0.5. This game has to call `audio.volume('music', 0.1)` before a save can raise it, because a fresh stay must be a tenth.
- `playClip` during `setup` throws. A rest pose queued from setup never starts. Clips are played at spawn instead. Setup should accept the same call, or the error should say to wait for spawn.
- `spawnProp` with no yaw builds a NaN quaternion and the sim blows up. Yaw should default to 0. Every prop in this game passes one.
- A prop part's offset field is `position`. Code that says `at`, which the rest of the engine uses, is ignored and the part sits on the origin. One name would do.
- `headlessHost(engine).session.world` is a frozen recording. The live world is `createAppHost(...).session.world`, and `inspector.seed()` replaces that session, so a cached world goes stale. The frozen view should be named as a recording, and `seed` should say that old handles die.
- Query keys the engine does not know fail the boot. An AI Hub page arrives with `?aihub=1` and friends. Those keys have to be stripped from the string passed to `createEngine` or the page never starts. Unknown keys could be ignored.
- `input.prompt` is Xbox. A game whose default glyphs are PlayStation cannot use it. The prompt should follow the pad the browser reported, or the page should be able to set the family.
- `touch=off` hides the touch layer but `createTouchLayer` still appends `.touch-stick`. A count of that class is 1 on a page that never draws a stick. The page removes `.touch-layer` after `createEngine`. A flag on `createEngine`, or skipping the node when touch is off, would match the setting.
- `gfx.resolution=auto`, when the look names no resolution, becomes `pixels` and caps the buffer around 330 lines. A check that the drawing buffer matches the view then fails on a correct page. `full` has to be set by hand.
- There is no `inspector.reset`. Live sliders put the defaults back by reading `describe('setting', path)` and calling `set`. A reset that restores every `game.*` default would match the dev-mode job.
- `node x new` prints `NEW_DOCS` lines about `labs/playground/…` even when the entry is written and its test passes. The docs check is tripping over its own guide. Those lines should not look like a failed command.

## Friction

- `input.pressed` is one sample for the whole drawn frame, and a catch-up step can take that sample before `onFrame` reads it. `uiAccept` does not repeat, so holding Cross never confirms if the edge was already consumed. A short Enter tap then leaves the title on Begin with an empty `__engine.errors`. The page treats a new hold of `uiAccept`, `uiCancel`, or `pause`, when `pressed` is false, as that edge. Up and Down already repeat after 0.35 s.
- From `labs/game/scenes/*.ts` the sim API is `../../../engine/sim-api`. From `labs/game/scenes/events/*.ts` it is `../../../../engine/sim-api`. There is no alias. The first import, one folder short, typechecks as a missing module and the event never loads.
- `createMenu` will show more than six rows. A 10-foot page has to slice the list itself.
- The hard line cap is 600. The fetched hub round, plus the `@file` comment this repo requires, was 603 lines and `eslint` failed `hard-cap/max-lines`. The protocol file should be allowed to stay the file the hub shipped. The comment was shortened so the cap would pass. Behaviour was not changed.
- The plan pinned session-client SHA-256 `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`. The file fetched from the raw URL banners 1.4.0 and hashes to `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a`. The banner did not move when the bytes did.

## Local engine patches

None. No file under `engine/` was edited. `npm run check` should still match `engine-lock.json`.
