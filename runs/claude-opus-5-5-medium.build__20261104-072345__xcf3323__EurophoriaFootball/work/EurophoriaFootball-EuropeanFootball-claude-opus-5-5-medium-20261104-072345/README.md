# Europhoria Football: dev folder

- `node tools/build.mjs`: builds `build/game.js`, the dev page `build/index.html` and the single-file game in the work root.
- `node tools/test.mjs [suite ...]`: every headless suite (unit, rules, content, ui, saves, attract, dev, determinism,
  playthrough, hubsim, lint; `soak` only when named); prints only failures and one count line.
- `node tools/hubcheck.mjs`: the AI Hub harness in Chromium, all four scenarios (a local server per scenario, stopped by PID).
- `node tools/shots.mjs <hash ...>`: screenshots of deep links into `shots/` (for what a script can't check).
- Deep links: `#match`, `#match/<stadium>`, `#match/corner|freekick|penalty|shootout|super|duel`, `#cup/r1..r5`, `#ending`,
  `#training/<drill>`, `#album`, `#about`, `#attract`, `#dev/anim/<move>`; `?seed=N`, `?touchonly=1`, `?dev=1`.
- Source: `src/` numbered fragments (one IIFE). Engine: `engine/my-3d2dge.js` (changes in `engine/CHANGES-ENGINE.md`).
