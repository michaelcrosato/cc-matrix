# Tare Island: development

Open the matching HTML in the parent folder in a WebGPU-capable browser. It is self-contained and works from a file URL. No server or network is needed for solo play or Family Hour. The title is defined in `src/data/title.js`.

- `npm run build`: bundle the game and write the root HTML and `exit-interview.json`.
- `npm test`: headless rules, full story playthrough, browser/input/audio/layout checks, four AI Hub harness cases and the engine's package check. Prints failures and one count. Uses an OS-assigned localhost port only for the harness and stops its own server.
- `npm run test:fast`: Node checks only.
- `node tools/shot.mjs activity tree`: capture the rendered world with its pixel HUD; use another activity id or scene.
- `node tools/clip-sheet.mjs`: software contact sheets of original clips and models.

For unbundled development, serve this folder on `127.0.0.1` and an OS-assigned port, then open `index.html`. The engine's documentation remains in `GUIDE.md`, `API.md`, `ASSETS.md`, `LIBRARY.md` and `ENGINE-README.md`. `pixel-engine.js` is unchanged; its import checksum is in `vendor/pixel-engine.sha256`.

Controls: WASD/arrows or left stick to lean; Shift for half lean; mouse movement supplies force relative to the dial. Space/R2 or hold left click to breathe in, release to breathe out. F/J, L1/R1 or mouse buttons to step. Enter/Cross confirms; Esc/Options pauses; Circle goes back. In the island, M/Tab opens the map; Space jumps, V waves and B sits. Menus support hover and click, keyboard, d-pad and stick. Q/E or L1/R1 changes pages; developer values also accept mouse dragging.

The Week has three guest slots and seven days, then an open Week 2. Drop-In opens every class and records best scores. Family Hour joins individual pads alongside keyboard/mouse, with optional bots. AI Hub uses the ghost Medley and does not touch local progress. Touch devices show the controller/keyboard requirement and run attract mode.

Pause -> Dev Tools provides live balance, breath/rep, rhythm, games and economy values, per-tab and global reset, JSON export, scene/day/activity jumps, result control, currency/unlocks, bots, god mode, speed, overlay, free camera, dialogue, audio and animation previews, and save resets.

Original game data is under `src/data/`; activities, scores, schedules, dialogue, unlocks, boards and rhythm charts can be extended there. `PROGRESS.md` in the parent folder records implementation and verification. Captures/reports are under `check/`.
