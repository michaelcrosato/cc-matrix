# PROGRESS
Title: Why Fit (random pick 3 of 50). Dev folder = this folder. Root = parent (work/).
Deliverable: ../WhyFit-WiiFit-claude-sonnet-5-5-medium-20261105-012138.html ; ../exit-interview.json
## Done
- kit + hub downloaded, sha recorded (vendor/pixel-engine.sha256)
## Next
- read GUIDE.md, ASSETS.md, vendor/hub/README.md
- Read PLAN/TASK/GUIDE/ASSETS/hub README (re-read PLAN sections as needed; it's 75KB, sections 4,5,9,12,15,16,17,18 matter most)
- core/ui/audio(voice,sfx,songs)/clips written (src/core, src/ui/font+widgets, src/audio, src/art/clips+glyphs); tools/check-clips.mjs passes
- src/art/models.js done (37 models, check.mjs --sheets clean of problems)
- data/*.js written (activities, poses, reps, lines(196), week, questions, unlocks, classmates, charts, boards, medley, about(provisional feedback! finalize at end)). world.js, avatar.js, app.js, base.js, settings/pause/about screens written. NEXT: scenes (front, hub, activities...), index.js registry, build, tests
- tools: build.mjs, test.mjs (tests/headless/*.mjs default export (t)), lib-node.mjs (boot/go/run), lib.mjs+shot.mjs (browser). tests/headless/dot.mjs passes. StillActivity written (scenes/activity/{base,lane,still}.js). front.js written (title/menu/slots/dropin/avatar pick). NEXT: probe still with bots, then hub/weighin/report etc, other activities
- written: hub, weighin, report, cutscene(ferry,ending), screens(jar,locker,records), chart. build ok. NEXT: probe2 for runtime errors, then other activities (reps,hoop,step,header,slack,tray,pier,jog,longstand), medley/join/card, attract, dev, tests, shot-judging
- ALL 17 activities written & bot-probed OK (still,reps,hoop,step,header,slack,tray,pier,jog,longstand) in scenes/activity/*; registered in scenes/index.js KINDS. probes: tests/headless/probe*.mjs (not run by test.mjs).
- Run `node tools/build.mjs` to rebuild html. `node tests/headless/probe3.mjs <ids>` bot-sweeps activities.
- STILL TODO: medley (scenes/medley.js: lanes w/ ghosts, 3 events), join (Family Hour), card (session), net.js (AIHub glue), attract (app.startAttract/stopAttract/attractNext), dev tools overlay + app.openDev/openAbout, the real test suite (tests/headless/*.mjs + tests/browser/run.mjs), settings Look wiring check, visual judging screenshots (title composition: camera too close, move fountain), exit-interview feedback text (about.js provisional!), final reply.
- tests/headless/playthrough.mjs passes (266 asserts). probes ok for medley/attract. NEXT: remaining headless tests (clips,data,activities,save,pause,dev,determinism,medley,voice,engine), browser tests (tests/browser/run.mjs), visual judge, about text, hub harness
- visual pass 1 done (title/menu/hub/tree/header/squat/slack/jog/weighin/results fixed). NEXT: browser tests tests/browser/run.mjs + hub harness, about text finalize, final shots at 1280x720/640x360 layout, README notes, final reply
- tests/browser/run.mjs written & passing (main, touch, nogpu, hub harness x4). net wiring done in main.js. NEXT: full 'node tools/test.mjs', pause icon for mouse, tab/confirm E conflict, about text finalize, remaining screenshots (podium/join/locker/jar/records/report/ending), README, final reply
- FULL SUITE 1137/1137 passed (node tools/test.mjs, ~4 min). remaining: visual checks of other screens, about text, final reply
- about text finalized; podium/jar/results/jog HUD polished. NEXT: final full test run, final reply
- FINAL: 1137/1137, deliverable+exit-interview in root. Done.
