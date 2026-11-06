# Fare Cry — designer field guide

The shipped HTML opens directly from disk. It contains the complete engine, physics WASM, fonts, session client and application. No server or asset downloads are needed for campaign play. AI Hub sessions and same-computer co-op use the same world and gameplay code.

## Rebuild and verify

Run `npm ci`, `npm run build`, then `npm test` in this directory. The build writes the HTML and `exit-interview.json` to the workspace root. The interview and in-game About pages come from `src/data/about.json`.

The single test entry point is `node tools/test.mjs`. `--sim`, `--ui`, `--hub` and `--viewports` select one tier. `--smoke` selects short boot checks within a tier. Reports and screenshots are written inside `test-output/`. The test runner prints failures and one count. Full runs isolate each tier in its own process to release the simulation heap before browser tests; viewport captures use one engine and page at a time. Its HTTP servers bind OS-selected ports on 127.0.0.1 and close automatically.

`node tools/shots.mjs` writes art-review screenshots. `node tools/balance.mjs` prints the economy and combat measurements. `node tools/validate-data.mjs` validates the design references.

## World and placement

`src/data/world.js` is the source of truth for the 2048 × 2048 metre Concession: place coordinates, roads, the river, railway, cast, mercenaries, diamonds and prefab names. X is east; Z is south. `src/sim/terrain.js` provides the pure terrain and road-deck surface functions. `src/data/scatter.js` shares deterministic vegetation placement between rendering and physics.

Procedural models live in `src/view/models.js`. The primitive kit builds painted shacks, tanks, tents, containers, sandbags, weapon variants and vehicles. Static world meshes are batched by material after construction; the bridge, vehicles, actors, vegetation and effects remain live. Add a prefab in the kit and add its name to `PREFABS` to use it in the placement tools.

Pause → Dev mode reaches cheats, world controls, rare triggers, teleports, contract jumps, live balance groups, diagnostics and placement. L1/R1 or left/right turn pages. Every page has at most seven focus targets. Placement selects a prefab and rotation, places at the crosshair and copies JSON for world data. The fallback copy retains the JSON in `__game.state().lastDump` if clipboard access is unavailable.

## Contracts

`src/data/contracts.js` is declarative. A contract contains `id`, `title`, `giver`, `requires`, `pay`, `offer`, `steps`, optional `side` and `twist`, and `effects`. Prerequisites are completed contract ids. Each step has `do`, `poi`, and the player-facing `note`.

The runner accepts these step kinds:

| Kind | Completion |
|---|---|
| `goto`, `deliver` | Player enters the place radius |
| `escort` | Arrival at the destination |
| `drive_cargo` | Player arrives in the assigned cargo truck |
| `talk`, `return` | Use near the destination; optional `npc` selects the speaker |
| `collect` | Use the named `tag` item; optional `tape` plays its dictation |
| `kill` | Destination garrison is cleared |
| `destroy` | Every entity in `tags` is destroyed or disabled |
| `plant`, `interact` | Hold Use for `hold` seconds; `count` repeats the work |
| `sleep_until` | Sleep at a safehouse, optionally at a required `hour` |
| `wait_event` | Train/event interval expires |
| `survive`, `hold_zone` | Stay within the place for `duration`; optional mercy beat |
| `choice` | Select an entry in `choices` |
| `ending` | Read, sell or burn handler reaches its final condition |

Effects change safehouses, faction papers, standings, post ownership, fuel/rail supply, camp population, doses, trust, flags and the ledger. The three endings read the accumulated world state. Failed cargo jobs reissue after sleep with a restored truck. State-dependent target handling keeps earlier destruction from trapping the campaign.

NPC offers come from the cast positions. Buddy contracts can also be called from Notebook → Next Shift. A contract twist is offered after acceptance; a living buddy is required. The full campaign bot accepts work and completes its steps through input frames, walking, driving, firing, reloading, holding Use and making choices.

## Simulation, fire and physics

`src/sim/index.js` has no DOM or renderer dependency. It steps at 60 Hz with separate seeded gameplay and AI RNG streams. Live tunables come from `src/data/tunables.js`; every entry specifies range, step, default and an explanatory note. Reset restores all defaults.

The fire model uses a 512² grid, 4 m cells, typed arrays and an active set. Wind changes directional ignition delay; slopes and fuel masks constrain routes. Trees throw downwind embers, tanks cook off, smoke reduces perception, and scorched cells persist using run-length encoded saves. Sleep advances regrowth and supply checks. At dawn a supplied post receives a reinforcement truck instead of immediately refilling.

Rapier owns terrain and scenery collision, the kinematic player controller, raycast suspension, boat buoyancy, dynamic explosion fragments and jointed body pieces. Vehicle steering follows an authored bicycle path with physics suspension and collision queries, making the road/bridge surface match the first-person camera.

The view uses Three.js r180 node materials and the same TSL pipeline on WebGPU and WebGL2. The post pass provides outlines, hatching, paper grain and fever distortion. Animation clips are generated in `src/anim/rig.js` and played by AnimationMixer. All sound is generated through Web Audio and can be rendered with OfflineAudioContext.

## Saves, attract and diagnostics

Campaign saves use one localStorage account plus its previous backup, under the namespaced `fare-cry-concession-fourteen-v1` key. Settings have a separate key. Hub sessions never touch campaign storage.

The attract director has its own throwaway simulation and fourteen 27-second vignettes. It starts after ten seconds of front-end inactivity and discards itself on input, preserving the previous screen and focus. Touch-only profiles show the controller/keyboard message and a tappable Settings button; they run the same reel.

`window.__game.state()` returns a detached diagnostic snapshot. Mutation hooks (`step`, `input`, `dev`, `action`, `screen`, `navigate`, `render` and frame control) work only with `?test=1`. The UI dev commands call the same simulation functions. Debug pages expose state, physics lines, AI/navigation/fire information, feature coverage and network/frame counters.

## Co-op

The unmodified upstream Hub client is the first script after the charset declaration. The early connect handshake precedes bundle parsing. Physics and simulation readiness and the custom 2D card precede renderer creation. Nearby actors use kinematic collision controllers; distant actors use the terrain model. Server copies create no renderer, input controller or audio context.

`src/net/index.js` provides HubTransport and LinkTransport. The host owns NPCs, fire, objectives and case state. Local movement is immediate. Compact eight-Hz snapshots, reliable action bundles and reliable fire/event batches stay inside the protocol budgets. Snapshots include player and vehicle poses. Only the host finishes a Hub round, using player ids.

Title → The Job offers solo with an AI companion and Same Computer. The latter uses BroadcastChannel on the same origin; one window hosts, other windows join, then the host starts. Public online play runs through AI Hub sessions.

All work is original fiction and procedural art. No real place, ethnic group, source dialogue, source music or source assets are used.
