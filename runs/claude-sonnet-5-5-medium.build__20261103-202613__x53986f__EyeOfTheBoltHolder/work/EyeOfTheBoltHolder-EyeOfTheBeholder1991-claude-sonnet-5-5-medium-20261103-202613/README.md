# Eye of the Bolt-Holder

A real-time, first-person party dungeon crawler on the my-3D2dge engine (v0.85.2), inspired by *Eye of the Beholder* (1991). One HTML file; three.js and Rapier load from jsDelivr. Everything (art, music, sound, voices) is drawn or synthesized by code.

## Build, test, play
- `node tools/build.mjs` bundles `src/*.js` (name order) with `engine/`, `hub/session.js` and the import map into `../EyeOfTheBoltHolder-EyeOfTheBeholder1991-<model>-<stamp>.html`.
- `node tools/exit.mjs` writes `../exit-interview.json` from `src/98-about.js` (the About screen's source).
- `node tests/run.mjs [lint|sim|playthrough|browser|harness ...] [--fast]` prints only failures and one summary line.
  - `lint` / `sim`: content lint and 110+ checks of the deterministic sim in Node (`vm`, no engine).
  - `playthrough`: a bot plays New Game to the ending on Normal with no cheats (two seeds) and writes `tests/out/balance.txt`.
  - `browser`: Playwright, Chromium on WebGL 2 from `file://`: boot, attract mode (10 s idle, any input exits), Quick Start, keys, Party screen, glyphs (PlayStation / Xbox / keyboard), save and load, Dev Mode, Rat Run, touch-only notice. It drives time with `game.advance()` because the software renderer runs at about 4 fps.
  - `harness`: the AI Hub harness at `players=2`, `players=4&latency=150&jitter=50&loss=5` and `scenario=host-leave`.
- `tests/shoot.mjs name ...` takes screenshots into `shots/` (not part of pass or fail).

## Controls
Pad (PlayStation glyphs, Xbox in Settings): left stick or d-pad up/down step, left stick left/right sidestep, d-pad left/right or right stick turn, ✕ use (hold: put down), ○ throw, □ Party Strike, △ Party, L1/R1 member, L2/R2 off/main hand, L3 camp, R3 examine, Create map, Options pause.
Keyboard: W/S step, A/D sidestep, Q/E turn, F use, H put down, G throw, Space strike, I party, C camp, M map, J journal, X examine, 1-6 hands (Shift: off hand), Tab member. Mouse: hover to focus, click things in the view and menu items, right click strikes, click a hand slot to use it.

## Layers
`src/00-core` namespace B, rng, tuning. `10-12` rules, floors and text data. `20-25` the sim (pure, deterministic, JSON state, no view). `40-41` presenter (World3D). `50` audio. `60-66` UI. `70` Dev Mode. `71` attract. `72` walkthrough bot. `73` hub and Rat Run. `90-99` main, title, About.
See `CONTENT.md` for the data formats and `PATCHES.md` for engine changes.

## What differs from PLAN.md
The Veil choice changes floor 3 (join: a hound is called off and she whispers the candle order; refuse: two more hounds); Ysolde's choice changes rewards. Everything else in the plan's definition of done is built.
