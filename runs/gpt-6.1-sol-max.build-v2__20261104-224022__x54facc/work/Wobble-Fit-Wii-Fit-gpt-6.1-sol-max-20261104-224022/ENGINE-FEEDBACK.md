# Engine feedback — Wobble Fit

Engine: my-3dge e7a124394afe087a40c36e2662a5c4ca2b39a663. The game uses the full generated workspace.

## What worked

The deterministic world, recorded scene actions, headless inspector, capture/restore and procedural puppet/prop APIs fit this game well. Original pose strips and additive lean layers can be scrubbed directly from hashed sim data. A separate small round scene allows the same mechanics to work in a Hub session without building the island there.

## Integration findings

- `getTerrain` explicitly returns a fresh grid. Initially the game's height helper called it for every query, making setup needlessly slow. The game now caches one immutable terrain and calls `terrainHeight` on it. A cached-terrain example would make this easier to discover.
- A custom action map inherits movement names, so a menu map with `actions:{}` is rejected by CORE_BAD_SPEC. The game supplies the standard walk actions and keeps `lock:false`; modal still prevents gameplay input.
- The native texture library has no sand entry. A guessed texture:sand caused a fail-fast CORE_BAD_SPEC. The game uses an original plain sand material. The public registry's error listed all valid choices and made the fix immediate.
- Props use `{at,yaw}`, not `{position}`. `addBox` creates a dynamic prop and takes size separately; the small session floor instead uses the public physics `addBody` with a fixed collider. Type checking caught both wrong assumptions.
- The default automatic resolution is 330 lines when a custom look omits resolution. It made a clean retreat look pixelated. The page explicitly requests `gfx.resolution=full`, `quality=high`, and disables the automatic governor.
- HTML appended below engine.ui.root inherits the native overlay's 600-weight text and cream colour. The game resets these on its own shell and HUD.
- Source-side JSON rest imports trigger TS6307 in this generated composite project unless listed explicitly. Without changing the engine-owned tsconfig, the game keeps the reference rest as a readable TypeScript export; the original JSON remains beside it.
- Scrubbed clips are played at spawn or during the first step, never in setup. Multiple additive slots are scrubbed directly. Full body changes replace older layers through the native clip stack.
- A browser's initial `__engine.ready` can precede the game's own attachment by a frame. Startup input is queued and the attract timer is reset on attachment, so it cannot begin before the title has had its full idle interval.
- Hub query parameters are stripped before createEngine. Harness checks additionally verify actual engine readiness and a ghost entity; protocol success alone would conceal a dead game.

## Most valuable improvement

A documented small example combining recorded scene actions, a custom camera, a menu action map and a single-file build would remove several interface guesses. A public setting getter on the inspector would also simplify live tuning UIs; the game uses the frame's setting reader.

## Local engine patches

None. All 2,135 engine-owned files remain byte-identical, verified by `node x engine`.

## Findings from the complete browser and Hub checks

- A fixed EngineOptions.actionMap is reapplied on every sample. Calling input.use alone therefore does not persist. The game passes a reactive function, shared by its shell and play modes.
- The default warm-up builds unused styles and cameras. `gfx.warmUp=asked`, a low-shadow session look, and progressively preparing the neighbours after the first real player frame made the four-copy deadline achievable. Every harness frame is also checked for actual readiness and ghost entities.
- Scene actions require an object argument, including when a game's payload is conceptually a list. Ghost lists use an `{items}` envelope.
- Entities spawned in an action join at its end. Their extra ghost component must be passed to spawnActor, rather than attached with w.add before the entity lives.
- Three.js reads GPUShaderStage when imported, even in Firefox without WebGPU. The page supplies the standard three enum constants so it can render its honest unsupported-browser screen; it still requests a real adapter and never enables WebGL.
- The native touch layer is created even with touch=off. The game removes that hidden layer after attachment to meet the touch-only no-controls requirement.
- Optional undefined fields must not be copied into actor.intents. Exploration now supplies only plain values, and the pilot clears previous wishes in stationary modes. A regression hashes and captures idle exploration.
- A binding's `{replace}` option is valuable: it changes a keyboard foot key while retaining mouse buttons, Space and the pad. Prompts and local seats read those same bindings.

No local engine patch was needed.

The most important late finding was prop warm-up scope. `createPropMeshes` prepares every registered prop, including unplaced ones. Importing the complete retreat library therefore made the small session scene warm the entire island's geometry. The game now registers prop factories at scene setup: only mats, pavilion and guide in a session, the complete library on the island. The engine is unchanged. A public scene-scoped prop list would remove this workaround and make the small-scene deadline reliable.

Terrain flats are heights above the terrain origin, not absolute elevations. The origin was -1 m, leaving the characters one metre below the decorative terraces. The game offsets its flat specs and supplies physical mat, platform and jetty supports. A regression checks the actual supported feet height.
