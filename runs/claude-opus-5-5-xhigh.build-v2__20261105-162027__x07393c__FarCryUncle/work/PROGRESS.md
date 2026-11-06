# PROGRESS (read me first after a context reset)

Title: **Far Cry Uncle** (item 7 of 50 from a real RNG draw).
Dev folder: `FarCryUncle-FarCry2-claude-opus-5-5-xhigh-20261105-162027/`
Deliverable: `FarCryUncle-FarCry2-claude-opus-5-5-xhigh-20261105-162027.html` + `exit-interview.json` in this folder (work root).
Engine: 0.46.0 (same as plan). Plan file: PLAN.md. Brief: TASK.md.
Test: `cd <dev> && node tests/run.mjs [--all] [--only suite]`. Build: `node tools/build.mjs --verbose`. Hand-in check: `node tools/handin.mjs`.

## Status by build step (PLAN section 25)
- [x] 0 Pipeline
- [x] 1-6 World, fire, combat, body, vehicles, missions M0..End; the playthrough bot drives them through both endings
- [x] 7 Shell, 8 Multiplayer (hub + link suites), 9 Polish (visual passes)
- [x] 10 Ship: deliverable built, exit-interview.json written

## Second pass: gaps found by re-reading the plan (all done, tests added)
- Step types `steal`, `escort`, `ride` as data; M3's alt route now uses `steal`.
- Cab: a wheel and dash per vehicle (`CABS`), hands at ten and two in frame, forearms that reach them, gear lever and a shift.
- Fort Clement walls rebuilt from library `stone-wall` and `battlement`, in bays with one box collider each.
- Muffle on the fire roar and nearest engine (`sfx.blocked`). Holster clip at the Mile Forty limit.
- Stock clips in use: IdleLook, Crouch, CrouchWalk, Crawl, SitDown, StandUp, Hurt, Wave, Shout.
- `analyzeClip` + `validateClip` in the static suite; 9 clips fixed that went through the floor.
- `kit` suite runs `check.mjs --headless`, `--sheets` and the page. Browser suite adds iPad Pro 11, Pixel 7 and WebKit iPhone.
- Library chair, rock, bush, shovel placed. `Math.random === 0` oddity removed.

## Third pass: the stop check asked for the plan line by line
Read every section again and checked it by script. Fixed:
- `state().prompts` now lists menu prompts; a test walks every screen in PlayStation, Xbox and keyboard glyphs. It found Game Over had none.
- All 32 glyphs are pixel art. About, Game Over, ending, Credits and Settings are overlays with a solid sheet, not full covers.
- Now used: `twoBoneIK` (cab arms), `SpringChain` (flags), `Squash` (landing dip, moved off the camera), `gaitClip` (limp), `Push` (close shove), `Climb` (M8 boarding), `driver` role, library `bush` and ridge `rock`.
- New tests: walk, wade, jump, fall damage, burning vehicle, HUD hide, map zoom, weather, aim assist, lost pad, every dev button, epigraph, line and bark counts.

## Fourth and fifth passes: the stop check again
- M3 uses the plan's exact wind; the tanks moved to where it carries fire (the plan gives no tank coordinates).
- HQ follows the plan: no pass, they shoot. The notice board is the way in, with a warning on approach and time to walk out after reporting.
- The fever's plan collapse holds in the last act too; it waits only for a scene or a moving train.
- M6 and M7 raised to 8 spoken lines; the static suite counts speakers.
- Fog: the plan's amount, near and far. Only top differs, measured: -60 drops contrast from 0.22 to 0.05.
- `tools/plan-coverage.mjs` now reads the checks that really ran and passed (`tests/.passed.json`) instead of grepping source. Weak tests made real.

## Finished
- `node tests/run.mjs --all`: 3168 passed, 0 failed, on the final code. `node tools/handin.mjs`: every line ok.
- `node tools/plan-coverage.mjs`: 288 requirements, 275 by a check that ran and passed, 6 by a file, 2 by eye, 1 differs with a reason, 4 need a person, 0 missing.
- The plan's ten screenshots re-shot on the final build and looked at together.
- WebKit iPhone profile: no WebGPU there, so the engine shows its failure message; no uncaught errors, as the plan expected.
- Not in tests/ISSUES.md, since they are mistakes in my test scripts: the mouse-look test passed on drift (Playwright's mouse reports no movement under lock), and five tests could never fail. All fixed.
- No process of mine left running. Nothing committed to git (not asked).

## Notes
- tools/shots.mjs names: title main day rust town map nightfire truckmap cab cabtruck cabtanker shift rack talk surgery surgery2 fight dev pause ledger ending harrow fort fort2 fort3 mine river rescue m0 soldiers convoy train herd night nofog ads scope kill card cash about about2 xbox burn
- A new bug: add a line to tests/ISSUES.md, then `node tools/exit.mjs` (counts feed About + exit interview), then rebuild.
- `tests/lib` uses python `http.server` for the hub; an interrupted run can orphan it, so check for one in this folder before finishing.
- `pgrep` on `tests/run.mjs` also matches other agents on this machine: check `/proc/PID/cwd` before believing a process is mine, and never stop theirs.
