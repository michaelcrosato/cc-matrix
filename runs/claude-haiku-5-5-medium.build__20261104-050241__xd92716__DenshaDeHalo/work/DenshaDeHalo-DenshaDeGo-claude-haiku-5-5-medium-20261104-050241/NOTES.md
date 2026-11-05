# Densha de Halo! — build notes (dev folder)

Title: Densha de Halo! (GameTitle DenshaDeHalo, SOURCE DenshaDeGo). Plan: ../PLAN.md. Spec: ../TASK.md.

## Files
- engine/ — my-3D2dge v0.85.2 handoff copy (unmodified so far).
- _src/ — clones (engine, ai-hub lib/hub) used for reference. DELETE before finishing.
- src/00-core.js — DH namespace, RNG, colour, TUNING sliders + ranges, TRAINS.
- src/10-rail.js — DH.Rail renderer, DH.buildScenery, DH.todGrade, Tint (fog/grade).
- src/21-route-compiler.js — ROUTES (halo -300..20700; depot 0..1000), compileRoute, validateRoute, ZONES.
- src/22-stages.js — STAGES S0 (depot, noDwell, frozen halo), S1..S5, PR. Timetables = measured par + 9 s (tools/calibrate.cjs).
- src/30-train.js — Train physics (plan 4.3). Check values pass (test/.scratch/physics.cjs).
- src/31-sim.js — Sim: signals/blocks/aspects (passedAsp caps), ATS, limits, stops/judgments/dwell/depart, halo, score, comfort, calls, horn, crossings/obstruction, events, maxPoints/rankOf, snapshot().
- src/35-autopilot.js — Auto: predict() model rollouts; stopMode (MPC inside 260 m, fine controller inside 60 m); cruise (look-ahead over caps within 450 m); calls; horn; ATS; EB release; departure.
- src/40-sound.js — DH.Sound (continuous Web Audio graph, one-shot DH.SFX, DH.MELODIES).
- src/50-hud.js — DH.Glyph (prompt badges), DH.drawCab, DH.drawStopGauge, DH.drawHud, DH.drawGlove, judgment colours.
- tools/calibrate.cjs — par (min-time, Halo frozen) per stage.
- test/.scratch/*.cjs — probes (play.cjs = whole-stage autopilot run; trace*.cjs; physics.cjs; final.cjs).

## Status (autopilot, skill 1, Normal)
- S1 A, S2 B (comfort low, rain slips), S3 A (2 PERFECT), S4 A, S5 C (halo ~20, max high), PR A. All finish, no game over.
- Calibrated timetables in 22-stages.js.

## Not yet written
- UI/scenes (title, menus, halo map, briefing, results, game over, ending, log, help, about, settings, dev mode), attract mode,
  touch-only branch, Babble voices (41), hub (63), duel (64), bundle (tools/bundle.mjs), tests (test/run.mjs), exit-interview.json,
  About text, ENGINE-CHANGES.md (none so far), gallery deep link, screenshots.

## Update (later in the session)
- Built: src/12-art.js (line-side art, station kit, trains as strips/things), src/40-sound.js, src/41-babble.js (voices),
  src/50-hud.js (cab, HUD, glyph badges), src/60-scenes.js (title, map, briefing, results, game over, log, help, about,
  free run, dev, ending, attract wiring), src/61-drive.js (drive scene, finishDrive, attractScene, devRows, HELP_PAGES, ABOUT),
  src/99-start.js (game, input map, settings, scene registry, deep links, debug handle).
- Bundle: node tools/bundle.mjs -> ../DenshaDeHalo-DenshaDeGo-claude-haiku-5-5-medium-20261104-050241.html (session.js first).
- Browser: engine/node_modules/playwright (1.63.0, npm install in engine/). Screenshots: test/.scratch/shot.mjs -> shots/.
  Stub-draw of every scene: test/.scratch/drawtest.cjs (no errors).
- Fixed on the way: strips attach to every segment they span; near-camera clamp; EB release; cruise planner; permanent slow order;
  halo start value; horn/calls span limited to the stage.
- Lever direction setting: NOT implemented (dropped from settings) — report as not done.
- Still to do: hub ghost mode (src/63-hub.js), local duel (src/64-duel.js), test/run.mjs suites, About text (Source
  Information + feedback), exit-interview.json, remove _src/ and test/.scratch/ and engine/node_modules before finishing.
