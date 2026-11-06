# K.C.’s Krazy Wrap Party

A complete, original overhead arcade maze chase inspired by K.C.’s Krazy Chase! (1982). Open the single HTML in the parent directory directly in a browser. No server, network connection or external game asset is required for standalone play.

Five Venus gardens form a finite campaign. Nibble the glowing LAST segment, dodge the horned head, catch pale sentries, and plant bait. Trees are optional. Couch co-op shares lives/seeds/score; AI Hub supplies authoritative online shared-world co-op, including a non-playing host. There is no standalone online lobby.

Move: WASD/arrows or left stick/D-pad. Plant: Space/Cross (Xbox A). Mouse: click a reachable passage to walk; click the adjacent planting preview to plant. Directional input cancels click navigation. Touch: invisible floating stick on the left half, contextual PLANT with another finger, top-right menu. Keyboard diagonal ties favor horizontal; analog input uses dominant-axis hysteresis. Controller symbols can be changed in native Settings/Controls.

The title reaches Play, Continue (valid solo checkpoint only), local device assignment, Maze Workshop, Settings and paged About/Credits. Ten idle seconds starts a six-scene actual-simulation attract tour; any physical input wakes the title and is consumed. Pause contains native settings, rebinding, fullscreen, retry and Developer Tools. Developer/workshop/replay runs cannot overwrite normal records.

The workshop supports walls/floors/trees, nursery, crawler spawns and length, two sentries, paired wraps, palette choices, undo/redo, validation, playtest, three named local slots, JSON import/export and return with edits preserved. Select an unlocked campaign garden as a template. New content uses the same level schema, graph, simulation and renderer.

## Build and verify

From this directory:

```sh
npm run build
npm test
```

`node tools/build.mjs` assembles the pristine Hub client, full engine and authored modules into the correctly named parent HTML. The root exit-interview.json supplies catalogue/About metadata. All internal closing script strings are escaped while the first Hub script remains byte-for-byte pristine.

`node tools/verify.mjs` runs the build, packaging/schema checks, simulation/network/native draw checks, actual browser campaign/device/audio checks and the pinned official Hub acceptance scenarios. It prints only failures and one passed/failed count. Focused flags: --unit, --browser, --hub, --delivery. Python browser tests use the workstation's installed Playwright 1.63.0 environment; the official runner's matching Node dependency is retained under vendor/hub/node_modules. No browser/system downloads are required on this workstation. A browser test on another workstation needs its own matching Playwright setup.

The Hub test owns an OS-selected 127.0.0.1 port and records its PID/origin before confirming the served game's title. Its server/browsers close in its cleanup path. Runtime Hub traffic uses only AIHub.send, never a separate socket or broker.

## Architecture

- src/sim.js: seeded fixed-step rules, shared graph, continuous paired-edge movement, chain history, event ordering, AI, campaigns, snapshots and validation.
- src/tools.js: versioned storage/checkpoints and reversible workshop commands.
- src/view.js: native shaded pixel garden rendering, Blob rigs, state animation, particles, fixed whole-maze projection and HUD.
- src/audio.js: code-composed motif/five arrangements/title/stings, effects and gibberish voices on separate buses. Fresh music is 10%.
- src/net.js: authority, seat mapping, reliable deduplicated actions/acknowledgements, stale input rejection, snapshots, presentation interpolation and Hub lifecycle.
- src/main.js: native screens/menus/settings extensions, device assignments, campaign reports/ending/records, editor, attract tour and developer tools.

The vendored my-3D2dge v0.89.1 source is unchanged, pinned to 8ecc2f62353761187bdfe226f327b7ea5d2eb691 (MIT). AI Hub protocol v1/client v1.4.0, harness and runner are pinned to 35a1047f2067b2af3de3943f0fe452f39105d869. Client bytes and upstream hashes are recorded under vendor/hub. The complete engine already contains grid/arcade; no duplicate modules are loaded.

## Evidence and limits

artifacts/verification.json records selected final checks and artifact SHA-256; dedicated simulation, controller, audio, visual, device and Hub reports provide detail. artifacts/issues.md counts unique corrected issues. artifacts/research.md records actual source observations and unavailable material. Source imagery/video remains research evidence only and is not embedded in the game.

Automated ordinary-command campaigns prove a real ending/defeat/retry path; staged visual scenes use clearly separated setup hooks. Physical controllers, touch hardware, TV, iOS Safari, subjective listening and first-human-run 12–18 minute pacing are unknown. Chromium/WebKit and standard gamepad/multitouch stand-ins were used honestly. No FPS claim is made.

All required Source Information, Testing Feedback, Engine Feedback and Prompt Feedback answers are in root exit-interview.json and the game's paged About/Credits. Usage: added on import.
