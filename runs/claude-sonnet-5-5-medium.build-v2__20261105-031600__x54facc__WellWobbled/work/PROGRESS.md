# Progress
Title: Well Wobbled (RNG pick from 50). Dev folder: WellWobbled-WiiFit-claude-sonnet-5-5-medium-20261105-031600
Deliverable: WellWobbled-WiiFit-claude-sonnet-5-5-medium-20261105-031600.html in work/ root.
## Done
- [x] read STAGE/TASK/PLAN, title picked
## Next
- [ ] setup workspace (new-game.mjs), npm ci, npm test
- [x] workspace made in dev folder (npm ci, npm test ok). cd into dev folder for all commands. Starter in labs/game.
## Plan of attack (layers; keep every file <400 lines, @file comment)
1 scenes/settings.ts, wobble.ts, bot/*.ts + tests  2 island scene (terrain, cast, pilot, flow)  3 activities  4 page UI  5 audio/voice  6 hub  7 attract/dev  8 about/exit interview/build/verify
- [x] wobble.ts+bot/players.ts calibrated; world data (terrain cached! groundAt must use cached island()), props/builds/clips/looks/bodies/materials written (art/ cast/ folders), components.ts, island.ts scene runs (2.6ms/step), events/{types,runner,index,morning}.ts started
- NOTE: entities spawned in setup get components only through spawn spec (w.add fails same-step). removeProp for props. engine prop ids bench/crate exist -> mine are rbench/rcrate.
- [x] runner per-seat refactor; morning + pose A/B/C pass balance targets (suite.ts helper balanceReport/expectTargets/mashSafe). Next: pond, reps, step, line, paddle, garden, cliff, hoop, jog, group/round, tilt
- [x] ALL solo activities in scenes/events/*.ts pass balance (morning,poseA/B/C,pond,step,reps,line,paddle,garden,cliff,hoop,jog). one.test.ts = scratch (ONE=id env) -> delete/replace by real activities.test.ts at the end.
- TODO sim: tilt.ts (Great Tilt 5 steps), round scene (game:round, ghosts, group class seats), flow actions (begin/sleep/day/pebbles/cairn), director (attract)
- TODO page: main.ts, ui/*, audio (sfx/songs/voice), lines (200+), cameras, about-data, dev panel, hub, onefile.mjs, verify.mjs, README, ENGINE-FEEDBACK, exit-interview.json
- [x] tilt.ts passes. NEXT: page (main.ts+ui), then lines/audio, cameras, build html, round/hub, attract, dev, verify/docs
- [x] round.ts (Group Class/hub round sim), ring/poseH, ui/{glyphs,hud,screens,store,about-data,theme.css,lines/*}, audio/{sound,voice}, cameras/stage.ts written. NEXT: scenes/director.ts(attract), app.ts/main.ts (page), dev.ts, hub/session.ts, game:round scene, build+browser test
- [x] page works in Chromium (title, island walk, pavilion renders; software GPU is ~3s/frame near pavilion so waits must be long). Fixed: input map must be given via createEngine actionMap fn; island buttons latched via flow.nUse/nPlan/nWave from 'game:*' values. NEXT: lint/format (npm run check), verify.mjs + playthrough + 10-seed tests, hub harness test, browser tests, README/ENGINE-FEEDBACK/exit-interview/about, final build
- [x] app split into app/appenv/appparts/appscreens/settingsui (lint+typecheck clean for labs/game). NEXT: npm run check, tests (npm test), verify.mjs, hub harness, browser tests, docs, final build
- [x] hub harness passes 2/3/4/host-leave; browser.py stages mostly pass (software GPU stalls seconds: always poll). NEXT: verify.mjs, final doc/about data (testing counts), exit-interview.json, final build, full test, screenshots
- verify.mjs running in background -> out/verify.log (started 06:13); after: screenshots, exit-interview.json (node labs/game/tools/interview.mjs ../exit-interview.json), final reply
- [x] FINAL STATE: html + exit-interview.json written in work/ root; npm run check ok; 87-check verify ran (hub 2/3/4/host-leave pass individually; browser stage flaky only under memory pressure/crashes from shared machine). Remaining: final chat reply (Source Information, Testing/Engine/Prompt Feedback).
