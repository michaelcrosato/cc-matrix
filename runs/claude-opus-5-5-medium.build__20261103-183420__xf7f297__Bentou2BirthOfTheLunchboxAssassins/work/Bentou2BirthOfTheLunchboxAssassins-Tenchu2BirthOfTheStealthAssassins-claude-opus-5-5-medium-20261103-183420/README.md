# Bentou 2: Birth of the Lunchbox Assassins (dev folder)

- `node tools/build.mjs` builds `../Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420.html` (and `build/game.js`).
- `node tests/run.mjs [filter] [--fast]` runs every check: headless suites, then the browser bundle and the real AI Hub
  harness (needs `handoff/node_modules`: `cd handoff && npm install`). It prints only failures and one count line.
- `node tools/patch-engine.mjs` re-applies the engine patches (`engine/PATCHES.md`).
- `node tools/shot.mjs <name> "<js>" [ms] [WxH]` saves a screenshot to `shots/`.
- `src/` is the game in load order (see `ORDER` in `tools/build.mjs`); `index.html` plays the dev build.
