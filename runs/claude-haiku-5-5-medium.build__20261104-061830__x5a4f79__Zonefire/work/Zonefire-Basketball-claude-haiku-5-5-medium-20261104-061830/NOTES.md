# ZONEFIRE build notes (dev folder for claude-haiku-5-5-medium, 20261104-061830)

Decisions (this run):
- Title: ZONEFIRE, taken from PLAN.md (its title came from a real RNG pick, secrets.randbelow(50) = 18). STAGE.md says use the plan's title; TASK.md asks for an RNG pick, which the plan's pick satisfies. Noted for the final reply.
- Deliverable: ../Zonefire-Basketball-claude-haiku-5-5-medium-20261104-061830.html (in work/, beside TASK.md). exit-interview.json beside it.
- Dev folder: this folder. Build: `node tools/build.mjs`. Tests: `node tests/run.mjs [suite...] [--quick]`.
- Engine: my-3d2dge v0.85.2 from handoff; our edits marked `/* ZONEFIRE: ... */` in engine/my-3d2dge.js (copy the handoff engine's pristine file at handoff/my-3d2dge.js).
- AI Hub client: vendor/aihub-session.js (verbatim).
- Playwright 1.63.0 installed in this folder (node_modules).

Progress log:
- [x] setup: handoff, engine copy, vendor client, hub harness files, playwright install
- [x] M0 pipeline: tools/build.mjs (fragments -> build/game.js, build/index.html, root deliverable), tests/run.mjs + helpers.mjs
- [~] M1 court, ball, hoops: src/20 arena (TileMap), 21 hoop drawing, 30 ball physics, tests/physics.test.mjs (4 pass)
- [x] M2 core: 02 teams+players data, 31 player entity, 33 actions, 35 match flow (phases, clocks, inbounds, OT, sudden blam), 34 CPU brain (10 Hz, difficulty table), 37 step pipeline (commands, players, ball, rules, Supernova), 38 setup, 36 camera. CPU-vs-CPU full games end without errors (tested 4 seeds).
- [x] M3 arcade layer (partial): 39 dunks (catalog, choice, decided block/fail, slam), layups, alley-oop, steals, shoves, spin, blocks, goaltend, shatter chance. Pose layer and dunk choreography: NOT YET (rig uses state only).
- [x] scenes so far: title, menu, join, teams, lineup, rules, matchup, court (match), results, hall, howto, about (42-screens); HUD (41); announcer lines (05); event wiring and results data (36-fx)
- Scene names referenced but NOT YET WRITTEN: camp, tour, beat, attract, dev, hubcard. menuItems() calls goTourNew/goTourContinue/goExhibition (goTour* in 43-tour).
- [x] Since then (done): tour (43, 04), camp (44), attract (45), dev panel (46), twists (22), power-ups (06), courts 2-5 (03), audio (10 songs, 11 sfx, 12 voice), HUD (41), announcer (05), screens (42), UI kit (40), pose layer (32), breaks' subs (35), cheat codes (42 matchup), hub (50, 51).
- Engine edits (marked /* ZONEFIRE */ in engine/my-3d2dge.js): audio sfxBus/musicBus getters; Humanoid shorts (thigh pants to hem, skin, sock); Dialog voice as a function; hair afro/flattop/mohawk.
- Tests: `node tests/run.mjs --quick` = 76 headless tests (content, physics, rules, mechanics, ai, determinism, flow, ui, audio, net, camp, tour, attract, dev, bundle). Browser suite (3) and hub suite (4 harness scenarios) need Playwright: `node tests/run.mjs browser hub`.
- Hub status: scenarios 1 (2 players) and 2 (4 players, latency, loss) PASS; scenario 3 (host-leaves) running at last check; scenario 4 (server copy) not yet re-run after fixes.
- Balance (10 CPU games, 2:00 quarters): ~32 points per team per game, dunks ~1 in 4 baskets, Supernova ~4 per game, shot-clock violations ~1.4 per game, subs happen at breaks.
- Known gaps / deviations to report: subs are automatic at breaks for every team (no human SUB screen); the break card has no SUB buttons; the pose layer covers the hands (hold, dribble, shot, dunk, rebound) but the dunk choreography is the engine's pose plus a hand target (no per-dunk key frames); the pause's Options opens the engine's settings; the session overlay (Esc during a hub round) is not built; the title's attract/touch/hub are built.
- Tour score: a win adds 2000 + 50 x margin + 10 x points (plan: style points); style points are not tracked per play yet.

- [ ] TODO next: session overlay for hub rounds (Esc, sound and voice volume); human SUB screen at breaks (plan 11.4); per-dunk choreography keys; About SECRETS page; exit-interview.json; final review of screenshots; final reply sections.
