# Europhoria Football: build notes

Work root: `..` (TASK.md, PLAN.md, STAGE.md). This folder holds every dev file.

- Build: `node tools/build.mjs` -> `build/game.js`, the dev page `build/index.html`, and the deliverable
  `../EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739.html` (everything inlined; runs from
  `file://`). The About pages are generated from `../exit-interview.json`.
- Test: `node tools/test.mjs [suite ...]` prints only failures and one count line. Suites: unit rules euphoria ai
  content ui saves attract dev training determinism lint playthrough hubsim sweep audio browser hub task. Add
  `--report` for the balance soak's numbers, the audio peaks, the harness checklists and the `task` suite's
  TASK.md-line-by-line results; `--soak` runs 20 matches a pairing.
- Screenshots: `node tools/shot.mjs out.png "#deep/link" wait:ms eval:js key:Code shot:path`; `node tools/grid.mjs`
  makes a contact sheet; `tools/check.mjs` and `tools/filmstrip.mjs` are the engine's.

## Layout
- `engine/my-3d2dge.js`: my-3D2dge v0.85.2 with five changes (`// EF:`), see `engine/CHANGES-ENGINE.md`;
  `tools/patches/*.mjs` re-apply them to a fresh engine.
- `vendor/session.js` (AI Hub client 1.4.0, unmodified), `vendor/mocap/` (the engine repo's mocap player),
  `mocap/ef-clips.js` (31 clips cut with the engine's anim-set tool).
- `src/NN-*.js`: the game, one IIFE. 00 core, 01 input, 02 glyphs, 03 audio, 04 art, 05 anim, 10-20 the match
  simulation (match, pitch, ball, footballer, keeper, team AI, rules, set pieces, referee, Euphoria, events), 21-27
  presentation (camera, replay, commentary, HUD, view, crowd, cast), 30-34 UI and scenes (UI kit, front end, cup,
  match, training), 40 attract, 41 dev mode and deep links, 42 AI Hub, 43 saves, 50-55 content (teams, stadiums,
  story, lines, drills, chants), 90 start.
- `tools/harness/`: the AI Hub harness (harness.html, bridge.js, round.js) for the `hub` suite.

## State
Feature-complete per TASK.md and PLAN.md: Cup Run (prologue, five rounds, team talks, challenges, villain, ending
with ceremony, parade and credits, CONTINUE?), Kick-About (6 teams, 5 stadiums, conditions, 1-4 local players),
Penalties, Training (9 drills), Sticker Album (51), About & Credits, attract mode, dev mode, AI Hub sessions.
All suites pass.
