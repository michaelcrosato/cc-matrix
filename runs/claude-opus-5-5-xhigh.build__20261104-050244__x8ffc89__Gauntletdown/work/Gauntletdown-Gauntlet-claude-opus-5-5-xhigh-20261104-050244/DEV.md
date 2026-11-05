# Gauntletdown: the workshop

The deliverable is `../Gauntletdown-Gauntlet-claude-opus-5-5-xhigh-20261104-050244.html` (one file, works from file://).
This folder is the engine handoff (my-3D2dge v0.85.2, patched: ENGINE-CHANGES.md) plus the game's sources and tests.

| Command | What it does |
|---|---|
| `npm install` | Playwright 1.63.0 for the browser suites (once) |
| `node build.mjs` | joins `game/src/*.js` into `game/game.js` (the dev page `game/index.html` loads it) |
| `node build.mjs --bundle` | also writes the single-file deliverable in the run folder's root (the AI Hub client first, unmodified) |
| `node tests/run.mjs [suite ...]` | the tests: floors sim play net ui hub (all by default); prints only failures and one count line |
| `node tools-dev/floorcheck.mjs [id]` | validates floors and prints their counts |
| `python3 tools-dev/floors.py` | redraws floors 2-9 and the treasure rooms into `game/src/16-floors.js` |
| `node tools-dev/botrun.mjs [ids] [--god]` | bots play floors headless and report times |
| `node tools-dev/shots.mjs game/index.html [--size 1920x1080]` | screenshots for look review into `shots/` |
| `node tools-dev/about.mjs` | writes the About pages and `../exit-interview.json` from one source |
| `node tools-dev/patch-engine.mjs` | the engine changes (already applied; it refuses to apply twice) |

`docs/DESIGNER.md` says how to add a floor, a monster, an item or a line. The plan the game follows is `../PLAN.md`.
