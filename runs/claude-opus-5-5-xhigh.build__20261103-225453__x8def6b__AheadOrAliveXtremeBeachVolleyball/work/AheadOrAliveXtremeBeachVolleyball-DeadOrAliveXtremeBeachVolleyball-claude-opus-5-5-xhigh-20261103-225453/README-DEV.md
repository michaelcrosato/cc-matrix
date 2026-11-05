# Ahead or Alive: Xtreme Beach Volleyball (developer notes)

## Build, run, test

```sh
npm install                      # Playwright 1.63.0, for the browser tests and tools
node tools/build.mjs             # build/game.js, build/dev.html and the deliverable ../<name>.html
node test/run.mjs                # every suite: prints only failures and one count line (exit 1 on a failure)
node test/run.mjs --only=match,ai --skip-browser --skip-hub
node tools/tour.mjs [regex]      # screenshots of every screen into test-output/tour/
node tools/rigsheet.mjs cast|suits|poses|acc|clips [fighter]   # rig sheets into test-output/rigsheet/
```

Open `build/dev.html` (separate scripts) or the deliverable straight from `file://`.

## Layout

- `src/*.js`: game modules, concatenated in name order into one IIFE (`const E = My3D2dge, G = {}`; `window.AOA = G`).
  00 core, 01 tuning (every dev slider), 02-06 data (cast, items, world, text, music), 10 input, 11 UI kit, 12 audio,
  13 rigs, 14 world art, 15 animation, 20-26 volleyball (ball, rules, players, AI, match, netplay, match scene),
  30-34 vacation (state, map, places, shops, story), 40 Pool Hop, 41 casino, 42 postcards, 50 title, 51 attract,
  52 Beach Match, 53 dev mode, 54 results, 55 About, 99 main.
- `engine/my-3d2dge.js`: the patched engine (see `ENGINE-CHANGES.md`); `vendor/`: the AI Hub client (unmodified) and the
  mocap player with the cut clip set `AOA` (31 clips); `hub/`: the harness (tests only); `.src/`: the engine repository.
- `test/`: `run.mjs`, `lib/` (the headless loader, bots, the fake hub), `suites/` (22 suites; `pads` drives four players on two keyboard halves and two emulated controllers). `TESTING-LOG.md` lists every issue the testing found.

## Conventions

- Gameplay never calls `Math.random`: `G.rng('world' | 'match' | 'casino' | 'cosmetic' | ...)` (a test greps for it).
- Every system reads `G.T` each step (the dev panel's live sliders).
- Scenes are single objects reused on every visit: reset their state in `enter`.
- `game.debug.tools` drives everything the dev panel does; tests use the same calls.
