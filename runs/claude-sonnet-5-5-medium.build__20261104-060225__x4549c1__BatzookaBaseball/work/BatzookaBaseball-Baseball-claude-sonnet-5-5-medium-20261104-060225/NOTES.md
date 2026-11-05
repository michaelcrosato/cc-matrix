# Notes
- Build: `node tools/build.mjs` (src/*.js -> build/game.js -> ../BatzookaBaseball-...html, one file with the engine and the hub client inline).
- Tests: `node tests/run.mjs` (headless sim: whole seeded games, bot through human intents, rules, derby, balance sliders), add `--browser` for the Chromium scene smoke test, scripted playthrough, attract mode, dev mode, tour, lessons, 2-player. `node tests/hubcheck.mjs 2` runs the AI Hub harness (needs Playwright in /tmp/s55pw or PW_DIR).
- Exit interview: `node tools/exit.mjs` writes ../exit-interview.json from src/49-about.js.
- Balance defaults live in BZ.TUNE_META (src/00-core.js); the dev mode sliders edit BZ.TUNE live.
