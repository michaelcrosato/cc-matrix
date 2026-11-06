# PROGRESS
Title: Far Dry Season (random pick of 50; index 15). Dev folder: FarDrySeason-FarCry2-claude-opus-5-5-medium-20261105-162030
Deliverables: ../FarDrySeason-FarCry2-claude-opus-5-5-medium-20261105-162030.html, ../exit-interview.json
Status: step 0 in progress (kit unpacked into dev root; vendor/ downloaded).
Done so far: src/content/{title,tuning-defaults,roads,sites}.js, src/core/{tuning,look,actions,events}.js, src/world/{geom,fire,terrain,sky}.js, src/art/{models,viewmodels,clips}.js (checked by tests/lib/artcheck.mjs).
Fire calibration: p plain (plan's 0.02) matches plan's speeds. rowOf/around in engine have other signatures; models.js has local helpers.
Plan: next content (weapons, dialogue, missions), then world.js, actors, combat, body, vehicles, missions runner, ui, dev, attract, net, audio, game.js, main.js, tests.
Avoid: never run a bare `cat > file` w/o heredoc (hangs); keep every file inside this folder.
Written (untested): src/world/world.js, actors/{rig,soldier,player,buddy,civilian}.js, combat/{projectiles,viewmodel,weapons}.js, body/health.js, vehicles/vehicle.js, ui/{dialogue,prompts}.js, missions/{runner,scripts,ledger}.js, content/{weapons,dialogue,missions}.js.
Remaining: world/map-texture.js, core/save.js, ui/{hud,glyphs,menu,screens,pixfont,about}.js, dev, attract, audio, net, game.js, main.js, tests, DESIGNERS.md.
All core written incl. game.js; headless boots (tests/lib/boot.mjs). net/round.js is still a placeholder class -> must write real net (session.js, round.js) next. Then tests/run.mjs suites, ABOUT feedback, exit-interview.json, DESIGNERS.md.
Net written (net/session.js, net/round.js), tests/run.mjs + suites/hub.mjs: 2-player and server scenarios pass. Next: tests/lib/bot.mjs + suites/{playthrough,systems,static,replay,browser,link}.mjs; log issues in tests/ISSUES.md. Then polish: screenshots, ABOUT feedback text, DESIGNERS.md, exit-interview.json, final reply.
Playthrough suite passes (269 checks, both endings). Next: suites static, systems, replay, browser, link; full hub; visuals pass; DESIGNERS.md; ABOUT feedback; exit-interview.json.
Suites static, systems, playthrough pass (feedback text pending in about.js). Next: replay/browser/link/hub run.
All 7 suites green (feedback text pending). Now: visual pass via tests/lib/shots.py (tests/shots/*.png); then DESIGNERS.md, feedback text in about.js, exit-interview.json.
Feedback text in about.js; tools/finish.mjs writes exit-interview.json and fills counts - rerun it last after final ISSUES.md then build.
Final loop: shots batch log4 running; then node tests/run.mjs --all; node tools/finish.mjs; build; verify files in work root.
Running final node tests/run.mjs --all; afterwards verify and write final reply (feedback from about.js).
Final full test run after surgery tweak; then final reply.
DONE: all suites green, deliverables in work root. Only the final reply remains.
ALL DONE: --all 1682/0 on final build; screenshots reviewed incl. hub card.
ALL DONE: --all 1688/0 on final build; harness card, surgery, Web Audio levels done.
ALL DONE on final build; all surgery scenes, glyphs, harness card reviewed.
ALL DONE: final build, audit in tests/PLAN-AUDIT.md.
ALL DONE on final build.
ALL DONE; tests/lib/checklist.mjs prints section 27.
ALL DONE on final build; checklist green.

## Requirement-by-requirement pass
tests/suites/lines.mjs checks plan values and every dev tool, settings control, weapon and rack item; each result is in tests/PLAN-LINES.txt (271 pass, 0 fail). It found 3 game bugs, now fixed and logged: MG never overheated, tapped jump too low, automatic guns under table rate. `node tests/run.mjs --all`: 2290 passed, 0 failed. Issues logged: 37, 17 critical.

## Final build
Build 8362f87bf1e9. Fixed the wheel covering the raised map and garbled map text. `node tests/run.mjs --all`: 2290 passed, 0 failed; PLAN-LINES 271 PASS, 0 FAIL; checklist 16 PASS. Screenshots re-shot from this build and looked at. Issues logged: 39, 17 critical.

## Final build, last pass
Build b81fac8e7b13. Map drawn at about 1:1 so its small text reads. Balance measured by bot and held in bands in the lines suite. `node tests/run.mjs --all`: 2298 passed, 0 failed; PLAN-LINES 279 PASS, 0 FAIL; checklist 16 PASS; all scenes re-shot from this build. Issues logged: 39, 17 critical. Not possible here: full-speed play by a person, physical controller, listening.

Later check on b81fac8e7b13, no code change: 12-run enemy-fire medians at 35 m are 14.25 s (1 soldier), 6.5 s (3), 5.25 s (6). All 27 plan sections have an audit row. About page 6 looked at on this build.

## Final build, after moving scenes to Timeline
Build 3d9ffd7203e7. M0 ride, rescue drag, M9 table scene and both endings run on the engine's Timeline (src/ui/scenes.js). `node tests/run.mjs --all`: 2338 passed, 0 failed; PLAN-LINES 306 PASS, 0 FAIL; checklist 16 PASS; 20 scenes re-shot from this build and looked at. Issues logged: 41, 17 critical.
Known differences from the plan: merged modules against the section 4 tree; fires tire after about 200 m; walks use the reused hero clips, not gaitClip; SpringChain, Squash and twoBoneIK unused; tracers do not use the engine's Trail (the plan allows a sprite).

## Final build, after the animation base and module split
Build be6c5b2c272a. gaitClip, SpringChain, Squash and twoBoneIK in use; standalone modules split out to the plan's names. `node tests/run.mjs --all`: 2370 passed, 0 failed; PLAN-LINES 317 PASS, 0 FAIL; checklist 16 PASS; 20 scenes re-shot and looked at. Issues logged: 43, 18 critical.
Still different from the plan: fires tire after about 200 m; class-internal modules and screens stay merged against the section 4 tree. Tracers use a sprite, which the plan allows.

## Final build, section 4 layout complete
Build 2c1ef0d002d3. Every file in the plan's tree exists (the static suite checks each one), plus index.html, which boots from a local server (tests/lib/devpage.py). `node tests/run.mjs --all`: 2531 passed, 0 failed; PLAN-LINES 317 PASS, 0 FAIL; checklist 16 PASS; 20 scenes re-shot and looked at. Issues logged: 43, 18 critical.
Addition the plan doesn't ask for: fires tire after about 200 m unless relit, which keeps one match from burning the whole map. Needs a person: game feel and balance, a real controller, listening.

## Final build, after checking every name in the plan
Build 38035903f74c. Attract beats join with cover('dither') and reveal; Fort Clement built from the library's stone-wall and battlement; chair and shovel placed; pathfinding marks true wall footprints, with the gate open; M7's alternate plan keeps fire off the east road. `node tests/run.mjs --all`: 2537 passed, 0 failed; PLAN-LINES 324 PASS, 0 FAIL; checklist 16 PASS; scenes re-shot and looked at. Issues logged: 46, 18 critical.

## Final build, after reading the plan's prose against the game
Build 0c4e83a3132f. Added from that read: subtitles under 60 characters, MG tracers can light grass, Harrow's tablets, the map's hand torch at night, sounds muffled behind walls, M6 partner protected until the wind turns. `node tests/run.mjs --all`: 2721 passed, 0 failed; PLAN-LINES 337 PASS, 0 FAIL; checklist 16 PASS; 21 scenes re-shot. Issues logged: 50, 19 critical.
