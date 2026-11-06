# K.C.'s Hungry Hullabaloo

Open the matching `.html` file in this folder's parent directory. It is self-contained and works from `file://`; no server, CDN, images or audio downloads are required.

Move with WASD/arrows, the left stick or D-pad, or an invisible floating touch stick. Bites happen automatically on the golden tail fruit. Space / Cross plants a snack; touch exposes a contextual PLANT button. Enter / Cross confirms, Escape / Options pauses. Menus support hover, clicking and tapping. PlayStation glyphs are the default; Settings → Controls offers Xbox glyphs.

The finite campaign has five original gardens with three successive courses each. Heads always hurt. Every bite frightens both sentries; catch one for points and a harmless spin. Trees are optional and replenish the three-seed shared reserve. Retry restores the current garden's entry score, resources and course, so partial courses cannot farm records. Solo and co-op records are separate.

Local co-op uses keyboard plus one pad or two independently assigned pads. AI Hub supplies online shared-world co-op, including a nonplaying authoritative host. There is no standalone internet lobby. The Hub owns session start and results.

The native pause menu includes Developer Tools with live sliders, freeze/step, invulnerability, stage/course selection, actor reset, refill/reseed, overlays, teleport and state inspection. Changes mark the run as modified and exclude it from campaign saves and records. Hub diagnostics are read-only.

The Maze Workshop uses the same schema, simulation and renderer as the campaign. Q/E or L1/R1 changes brush, Enter/Cross paints, Tab/Triangle opens tools; mouse paints and touch taps. It supports routes/spawns, paired wraps, validation, undo/redo, themes, playtest-return, named local saves, JSON import and download. Invalid geometry cannot be played or saved.

Build with `npm run build`. Run all verification with **`npm test`**. It emits only failures and one passed/failed count. Targeted checks use `node tools/verify.mjs --only=sim,net,tools` or the other groups `devices,integration,hub,delivery,lint`. The already installed Playwright Python 1.63 environment is the default; set `PLAYWRIGHT_PYTHON` for another installation. Node Playwright 1.63.0 is a pinned development dependency; browsers are not downloaded by this project.

The tests cover ordinary-command full solo/co-op campaigns, a complete emulated-controller campaign with initials entry, fixed-step edge cases, workshop/storage/tuning, mouse and touch, two pad assignments, attract timing/tour/wake, native audio analysis, Firefox and WebKit smoke checks, live impaired shared state, and the pristine official Hub runner. All test servers bind 127.0.0.1 with OS-selected ports and close afterward. Captures, issues and results are under `artifacts/`.

Engine: full my-3D2dge v0.89.1, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, unmodified vendor source. Hub: protocol v1 / client v1.4.0, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Native Grid/GridMover, Arcade wake handling, projected Blob rigs, menus and audio are extended in authored adapters. Exact provenance and the engine MIT license are preserved. The separate Hub license at that snapshot is unknown; its pristine original client notice is retained.

No person listened or used physical controllers/touch hardware. Browser stand-ins and bounded synthesized audio do not establish subjective sound quality, real iOS Safari behavior, internet conditions, or a human 12–18 minute first-campaign time. The normal bots are much faster than that target. Date/model/usage and required feedback are in the in-game About and `../exit-interview.json`.
