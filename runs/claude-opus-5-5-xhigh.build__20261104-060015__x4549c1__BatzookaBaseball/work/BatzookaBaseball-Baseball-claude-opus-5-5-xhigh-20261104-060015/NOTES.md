# Batzooka Baseball: build notes

## Layout
- `src/*.js`: the game, concatenated by name into one IIFE by `tools/build.mjs` (`build/game.js`), then bundled with
  the AI Hub client (first script in `<head>`, byte for byte) and the engine into
  `../BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html`.
- `index.html`: the dev page (engine + `build/game.js` as separate scripts).
- `tests/run.mjs`: the one command (`node tests/run.mjs`, `--browser`, `--hub`, `--full`, `--all`, `--only suite`).
  `tests/shot.mjs` takes screenshots for the look. `hub/`: the AI Hub harness files.
- `engine/my-3d2dge.js`: the engine with the changes in `ENGINE-CHANGES.md`.

## Decisions where the build differs from PLAN.md
- **Names:** TASK.md's names win: the dev folder and the HTML file use `claude-opus-5-5-xhigh-20261104-060015`.
- **Motion:** no motion-capture clips. The plan allowed the procedural fallback for any motion; every motion (swings,
  bunt, windup, throws, tags, dives, slides, climbs, umpire calls, celebrations, Rhubarb punches) is built on the
  engine's attack specs, poses and IK, which time exactly to the game's contact and release moments.
- **Fielders and runners** are simple kinematic points, not `E.Body`s; walls are analytic (the fence function, the foul
  walls, the backstop), which keeps thousands of simulated innings fast and deterministic.
- **The fence and stands in the Plate Cam** are Mode 7 billboards built by the game (Mode 7 draws the floor and
  billboards, not a TileMap's walls). In the Broadcast Cam the stands are TileMap walls and the fence is code-drawn
  quads so the curve stays smooth.
- **Broadcast Cam zoom** moves in four steps (0.5, 0.62, 0.78, 1) rather than continuously: the TileMap floor bakes once
  per zoom level (see ENGINE-CHANGES.md).
- **The catcher in the Plate Cam** is drawn smaller and lower than true perspective (as classic baseball games do), so
  the strike zone stays clear.
- **Playbook** is reached from the title's OPTIONS (Settings, Controls, Playbook) and from the pause menu.
- **Wild throws / out of play:** a fair ball or throw that leaves the field gives every runner one base (the batter two).

## Balance (seeded CPU-vs-CPU, 9 innings at Pro; `node tests/run.mjs --only ai`, `--full` for 30 games)
Typical: about 4-5 runs a team a game, AVG .25-.28, K% 12-17, HR% 4-7, errors 1-2 a game; harder CPU levels outscore
easier ones. All in the plan's ranges. The Derby bot hits about 3,000 feet a round.
Tuning lives in `BZ.TUNE` (dev mode sliders); the AI's knobs are in `20-ai.js` (`BZ.LEVELS`, pitch deception).
