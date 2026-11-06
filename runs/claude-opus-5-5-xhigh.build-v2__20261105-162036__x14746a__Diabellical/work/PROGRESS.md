# PROGRESS (read me first after a compaction)

Title (picked by RNG from 50): **Diabellical**
Dev folder: `Diabellical-Diablo3-claude-opus-5-5-xhigh-20261105-162036/`
Deliverable: `Diabellical-Diablo3-claude-opus-5-5-xhigh-20261105-162036.html` in this folder (root), beside `exit-interview.json`.
Kit: pixel-engine 0.46.0 copied unedited into the dev folder. session.js beside it. Hub harness in `tools/hub/`, hub README in `docs/HUB-README.md`.
Original hashes: pixel-engine.js 80408b4c72ef08be3ec628d578f8b008644c1c7e447a4cc8c5979b08212e78aa, session.js 6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a

Rules: TASK.md wins over PLAN.md. No subagents/workflows for review. One test command prints only failures + a count line (`node tools/test.mjs`). 1-2 browsers at a time. All files inside own folder. Stop only own PIDs.

## Milestones
- [x] M0 setup
- [x] M1 one good room
- [x] M2 zone pipeline
- [x] M3 three classes
- [x] M4 loot
- [x] M5 campaign
- [x] M6 multiplayer
- [x] M7 endgame
- [x] M8 shell
- [x] M9 finish: shots reviewed at 1080p, exit-interview.json final, final build passed the whole suite, scratch files removed

## Notes
(see below, appended as I go)

## Status log
- M0 done. Sim core written (src/sim/*, src/data/*): world/hero/effects/monsters/bosses/quests/knell/round/commands/bot/zonegen. Bot finishes the campaign in the sim for all 3 classes (`node .scratch/campaign.mjs <class>`), about 10 sim minutes, level 18-19.
- tests/ISSUES.md gets one line per issue a test catches (needed for exit interview counts).

## Architecture notes (for after compaction)
- src/sim is plain JS, reads only Rng/NavGrid from the engine. stepWorld(w, intents[seat]). All menu actions go through applyCommand(w, seat, {c:..}) in sim/commands.js.
- Sim emits events in w.events (t: spawn, hit, death, cast, mcast, fx, lob, shot, shotx, area, areax, tele, telex, wave, zone, quest, toast, sub, talk, open, cut, boss, drop, dropx, pick, level, ...). View consumes them; host forwards them.
- Objects/props get deterministic ids (ID_BASE 1000000, props 2000000) so hub clients agree.
- Next: src/view (models, clips, zonebuild, actors, vfx), src/ui (ui, glyphs, hud, menus), src/input, src/audio, src/modes (game, shell, play), src/net, tests, tools.
- Boss HP needs tuning up (bot kills Bursar in 20-60 s; want 60-180; Malison want 120-300). Sexton single-target DPS looks low. Tune in M9 with tools/report.mjs.

## Status log (cont.)
- View (src/view/*), models, clips, audio (src/audio, src/data/sfx.js, songs.js), UI (src/ui: ui, glyphs, icons, hud, menus/*), input router, game object (src/modes/game.js), attract (src/modes/attract.js), shell set (src/view/sets.js) all written and rendering. `node tools/build.mjs --quiet` builds. `node tools/shots.mjs title,menu,play,zones,fight --size 1280x720` writes PNGs to .scratch/shots.
- TODO next: src/net (hubflow.js is an empty function now; transport/host/client mirror/card), tools/test.mjs + tests/*, tools/report.mjs balance, boss HP tuning, Belfry arena lights, docs/DESIGNERS.md, exit-interview.json (TASK order), About text, final rebuild, cleanup .scratch and .dl not needed for hand-in but kit stays. Remember final chat reply with Source Information, Testing/Engine/Prompt Feedback.
- src/net done (host, client, codec, hubflow, card); harness players=2 passes. tools/test.mjs + tests/sim/all.mjs done (all tier 1 pass). tools/report.mjs prints balance (`node tools/report.mjs 11,12`). tools/hubcheck.mjs "players=2&auto=1" runs one harness variant.
- TODO: tests/headless/all.mjs (playthrough per class through real menus, Last Bell per class, screens, dev tools, attract, about, exit interview shape, audio), tests/browser/all.mjs (boot, pad only, mouse+keys, couch 4 pads, touch, sound via analyser, layout at 3 sizes), tests/hub/all.mjs (5 variants + game-level P2 moves + outside-session). docs/DESIGNERS.md. exit-interview.json. Look at all shots. Then final build, cleanup.
- Tiers written: tests/sim, tests/headless (harness.mjs, simplay.mjs), tests/browser, tests/hub. All harness variants pass. Remaining failing test only the exit interview (not written yet).
- Polish TODO: credits screen after ending; GetUp + coffin burst at start; couch off-screen teleport; wheel zoom; footsteps; mon_hurt; tall prop fade; town dressing (stall/fountain/well/statue/anvil); Belfry arena lights; class font labels in session; bone ring around Warden; plate 1/3 per run; docs/DESIGNERS.md; analyzeClip on Shamble; look at all shots at 1920x1080.
