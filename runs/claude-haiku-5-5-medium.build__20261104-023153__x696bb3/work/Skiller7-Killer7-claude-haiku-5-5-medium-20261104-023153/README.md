# Skiller7 (dev folder)

The game's source and tools. The shipped file is `../Skiller7-Killer7-claude-haiku-5-5-medium-20261104-023153.html`
(one file: the engine, its 3D module, the AI Hub client and the game, built by `node tools/build.mjs`).

- `src/` the game, in build order: `00-core` (units, tuning, personas, weapons, Whiteouts, bosses), `10-levels` (rooms,
  rails, camera shots, waves, pickups, gates, terrain), `20-sim` (the rules, in metres), `30-present` (the 3D world, actors,
  camera, gun, events), `40-scenes` (title, attract, Room 7, play, dev mode, results, HUD, AI Hub, start), `50-audio`,
  `60-text` (dialogue, About & Credits), `70-debug` (`game.debug`, the state hash).
- `engine/` the pinned engine (my-3D2dge v0.85.2 at 4390a98): `my-3d2dge.js`, `my-3d2dge-3d.js`, and its docs.
- `vendor/aihub/session.js` the AI Hub session client 1.4.0, unmodified.
- `tools/build.mjs` builds the single HTML (and `out/bundle.js` for the Node tests).
- `tests/run.mjs` the one test command: builds, runs the rules in Node, then the flows in headless Chromium. Prints only
  failures and a count. `tests/hub-check.mjs` is the AI Hub mock-parent check (separate: slow under a software renderer).
- `out/` screenshots and logs (never shipped).

Run: `npm install` once (Playwright 1.63.0), then `node tests/run.mjs`.
