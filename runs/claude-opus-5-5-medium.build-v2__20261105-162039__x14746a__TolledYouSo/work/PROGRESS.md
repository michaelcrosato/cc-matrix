# PROGRESS
Title: Tolled You So (RNG pick from 50). Dev folder: TolledYouSo-Diablo3-claude-opus-5-5-medium-20261105-162039
Deliverable: TolledYouSo-Diablo3-claude-opus-5-5-medium-20261105-162039.html in work/ root; exit-interview.json in work/ root.
## Status
M0 in progress.
- Data (src/data) and sim (src/sim) written. tools/scratch/camp.mjs <cls> runs bot through campaign in pure sim: completes for bellwarden/sexton (~10 sim-min, needs balance). NEXT: view (src/view), ui, input, game.js, build, net, tests, exit interview.
- View written: src/view/{zonebuild,actors,vfx,view,clips}.js, models/*; audio: src/audio/*. NEXT: src/input/router.js, src/ui/{ui,glyphs,hud,menus,devmode}.js, src/modes/{shell,play}.js, game.js, tools/build.mjs; then net, tests, polish, exit interview.
- All modules written incl net (src/net), shell, attract, game.js, tools/build.mjs. Headless check passes. NEXT: browser shots (tools/shots.mjs), tests (tools/test.mjs + tests/), fix bugs, balance (Bursar/Malison durations, XP), docs/DESIGNERS.md, exit-interview.json at work/ root, final rebuild.
- tools/report.mjs --assert: balance targets (bot campaign). tests/sim passing. NEXT: tests/headless (playthrough via real menus, screens, attract, audio, about, exit), tests/browser (boot, pad, mouse, couch, touch, sound, layout), tests/hub (5 variants + game level), visual polish review, docs/DESIGNERS.md, exit-interview.json, final build, remove tools/scratch and check/ dirs? (keep only useful).
- tests/headless/playthrough.test.mjs written (real game headless, ~90 s). Keep going: screens/attract/audio/about/exit headless tests, browser tier, hub tier.
- Headless tests written: playthrough, screens, attract, audio, replay, exit. NEXT: tests/browser, tests/hub, exit-interview.json, visuals pass (title scene, zones), docs/DESIGNERS.md, cleanup (rm tools/scratch, check/, tools/out, tools/.bundle.js kept out; keep node_modules? remove at end if large).
- tests/hub written and passing. NEXT: tests/browser; visuals pass; docs; exit-interview; cleanup.
- tests/browser written (boot pad mouse couch touch sound layout); pad/mouse/couch pass after fixes; run touch, sound, layout next. tests always exit (TEST_LIMIT env).
- docs/DESIGNERS.md done. Narrow-window HUD and card done. REMAINING: exit-interview.json at work/ root (count from tests/ISSUES.md), rebuild, node tools/test.mjs full, cleanup (tools/scratch, tools/out, check/), final reply with all four feedback sections.
- exit-interview.json written. Final steps: full test, count issues in tests/ISSUES.md (update testingFeedback[0,1]), rebuild, look at attract/couch/dev/about shots, delete tools/scratch tools/out check/ .bundle, final reply.
- DONE: final build tested; exit-interview.json in place.
- DONE: final build, all tiers pass.
- Stop-hook audit round: added SpringChain bell, dissolve on tall props and ragdolls, seat-coloured panels, dialogue choices, Triangle compare, Trail on projectiles and swings, spatial fire voice, per-type monster voices, boss stinger, falling beams, any boss in dev spawn, adaptive boss sizing (per-run timing assert), tests: features, analyzeClip, WebKit iPhone no-WebGPU. NEXT: run all tiers; full shots review.
- DONE after audit round: all tiers pass on final build (sim+headless 2660, browser+hub 276), every listed screen reviewed.
- Final: 28 issues logged; sim+headless 2660, browser+hub 276 pass on the final build; every listed screen reviewed; exit interview re-read in full.
