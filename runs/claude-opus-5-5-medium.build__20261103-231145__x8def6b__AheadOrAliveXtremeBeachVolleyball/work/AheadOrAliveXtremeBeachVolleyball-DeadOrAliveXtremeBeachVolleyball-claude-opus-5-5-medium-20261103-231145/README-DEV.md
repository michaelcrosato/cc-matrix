# Ahead or Alive: Xtreme Beach Volleyball — development

- `node tools/patch-engine.mjs` — rebuild `engine/my-3d2dge.js` from the pristine handoff engine in `.src/` (see ENGINE-CHANGES.md).
- `node tools/build.mjs` — concatenate `src/*.js` into `build/game.js` (one IIFE), write `build/dev.html` and the
  deliverable `../AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-medium-20261103-231145.html`.
- `node test/run.mjs` — every suite; prints only failures and one count line. Flags: `--only=match,casino`,
  `--skip-browser`, `--skip-hub`. The hub suite serves `test-output/hub-serve/` on 127.0.0.1 at a port the OS picks and
  stops that server by its own PID.
- `node tools/shots.mjs title map match …` — screenshots into `test-output/` (Playwright, file://).
- `node tools/check.mjs <html>` — the engine's checker (errors, look notes).

Conventions: gameplay randomness only through `G.rng(stream)` (a test greps for `Math.random(`); every tuning number is
in `G.TUNING` and read live from `G.T`; every scene goes through `G.wrapScene`; `game.debug.tools` drives the dev panel
and the tests.
