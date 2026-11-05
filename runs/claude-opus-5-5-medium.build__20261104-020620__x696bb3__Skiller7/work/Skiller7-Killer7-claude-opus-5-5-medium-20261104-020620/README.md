# SKILLER7 — dev folder

An original on-rails scan-and-shoot game inspired by Killer7, built on my-3D2dge v0.85.2 and its 3D module.

- `node tools/build.mjs` builds `../Skiller7-Killer7-claude-opus-5-5-medium-20261104-020620.html` (and `out/bundle.js`).
- `node tests/run.mjs` runs every test (Node suites, then browser suites and the AI Hub harness); it prints only
  failures and one line with the count. `--node`, `--browser`, `--only a,b`, `--metrics`, `--quick`.
- `node tests/browser/look.mjs` saves screenshots for review into `tests/out/look/`; `node tools/sheet.mjs` tiles them.
- `python3 tools/patch-engine.py engine/my-3d2dge.js` applies the S7 PATCHes to a pristine engine
  (`engine/my-3d2dge.orig.js` is the untouched v0.85.2 file).

Layout: `src/` the game's systems (core, input, world and rails, sim, combat, bosses, audio, UI, HUD, dev mode, bot,
attract, Echo Run and the AI Hub, presenter, scenes, start); `content/` the data (personas, weapons, enemies, items,
areas, story, songs, shapes, About); `engine/` the handoff copy (patched) and the 3D module; `vendor/` three.js,
Rapier and the AI Hub client and harness; `tests/` the suites and the golden route.
