# PROGRESS
Title: Toll Booth of Doom (picked by crypto.randomInt, idx 1 of 50). Dev folder: TollBoothOfDoom-Diablo3-claude-sonnet-5-5-medium-20261105-162042
Deliverable: ../TollBoothOfDoom-Diablo3-claude-sonnet-5-5-medium-20261105-162042.html (root = work/). Exit interview: ../exit-interview.json
## Done
- M0 started: kit unzipped, hub files fetched as hub_*.
- Written: tools/build.mjs, tools/browser.mjs, src/data/{meta,tuning,classes}.js, src/sim/stats.js. Kit at dev folder root (unedited). hashes in tools_hashes.txt.
- Plan: compact implementation of M1..M9; never-cut list first. Library ids: use standing-torch/hanging-lantern (no torch/lantern/gibbet/mushroom ids).
- zonegen + items + monsters/zones/rooms data done & tested (tests/sim/zones.mjs, tools/runtier.mjs)
- SIM DONE & tested (tests/sim/combat.mjs: 3 classes kill 20 monsters with bot): src/sim/{core,powers,effects,hero,monsters,world,progress,bot,items,zonegen,stats}.js. Run tests: node tools/runtier.mjs tests/sim/*.mjs
- TODO next: view layer (models, clips, zonebuild, actors, vfx), game.js + UI (ui.js, hud, menus), audio, bosses/quests/knell sim, net, save, shell(attract, devmode, about), tests, exit-interview.json, final build.
- Sim conventions: intents {mx,mz,ax,az,soft,held[6],pressed[6],dodge,potion,interact,interactHold}; events drained by view via drainEvents(w). Props are monsters with prop:true. NavGrid origin [0,0,0] so sim coords = grid coords.
- models: src/view/models/bodies.js (38 defs, checkModel clean)
- Written (untested in browser): src/view/{zonebuild,actors,vfx,clips}.js, src/input/router.js, src/ui/{ui,glyphs}.js, src/data/{sfx,songs}.js (68 sfx, 10 songs, parse+render clean)
- NEXT: src/audio/audio.js (sfx wrapper, voice babble), game.js (TollGame with modes), HUD, screens, then bosses/quests/town sim, net/hub, save, shell, tests, exit interview.
- Written: src/sim/{campaign,bosses,town,knell}.js; src/data/quests.js; src/audio/audio.js; src/ui/hud.js. Zones data now has next:'town' for causeway, etc.
- NEXT: src/modes/game.js (TollGame), src/ui/screens.js (all screens), save, net, game.js entry, then BOOT TEST. Then tests, exit-interview, build.
- exit-interview.json written PROVISIONALLY (feedback answers 'unknown' to be replaced at end). tools/genabout.mjs generates about/credits.
- **BOOT WORKS** (quick=1 URL boots into ossuary1; screenshot ok). tools/shot.mjs "query" frames out.png [w h keys]. Build: node tools/build.mjs. Written: src/modes/{game,attract}.js, src/ui/screens*.js, game.js entry, src/net/hubflow.js (stub returning null; TODO full session flow).
- TODO: hero light, zone toast placement, net+card+session round, headless test, playthrough test, tests tiers, About check, touch test, hub harness, balance report, exit interview real answers, final build.
- NET DONE: src/net/hubflow.js (host/client/server/card/finish). Hub harness variant 0 (2 players) PASSES (tests/browser/hub.mjs, HUB_ONLY env). Variants 1-4 launched; check tests/hub-run/out.txt.
- Cut features (to remove traces at end): Drowned Pantry (zones.pantry + cellarer), Sister Pyx (PYX_BANTER), session level-up picks.
- HUB: all 5 harness variants PASS. tests/headless/{driver,playthrough,smoke}.mjs written; playthrough being debugged (PT_CLASS=0 node tools/runtier.mjs tests/headless/playthrough.mjs).
- TESTS: tools/test.mjs runner (tiers --sim --headless --browser --hub). tests/sim/{zones,combat,lint,systems}.mjs PASS (systems=1681 checks). Hub: all 5 variants pass. headless/{smoke,shell,playthrough,lastbell}; browser/{boot,input} written, not yet run. 
- Playthrough debugging: bot fixes (nav steering, stuck-ignore, nest priority, hero collision r 0.3). Run: PT_VERBOSE=1 PT_CLASS=0 node tools/runtier.mjs tests/headless/playthrough.mjs > tests/hub-run/pt0.txt
- STILL TODO: pass playthrough x3 classes, run shell/lastbell/browser tests, remove traces of cut features (pantry/cellarer/pyx banter/level-up picks), docs/DESIGNERS.md, screenshots review, balance numbers (bursar 60-180s, malison 120-300s), exit-interview real answers (ISSUES count), final build+verify.
- STATUS (late): ALL TIERS WRITTEN. PASSING: sim (zones, combat, lint 85, systems 1681), headless smoke, shell (136 checks incl attract x2 loops, About, exit interview shape), layout (43, all screens fit 427x240 virtual area via UI.setVirtual), browser boot (31: sound/touch/no-WebGPU/layout), browser input (27: pad/mouse/couch), hub (5 variants). 
- Cut features removed: Pantry, Pyx, session level-up picks.
- OPEN: playthrough (tests/headless/playthrough.mjs; run: PT_VERBOSE=1 PT_CLASS=0 node tools/runtier.mjs tests/headless/playthrough.mjs > tests/hub-run/pt0.txt ; was at cloister). Requiem XP explosion fixed (core.js) - recheck level at credits is 16-24 (xpRate/monsterXp 0.55). Bursar hp 110. Then: lastbell test, run all three classes, balance durations (bursar 60-180s, malison 120-300s), real exit-interview answers, rebuild, final test run, final chat reply w/ Source Info + 3 feedback sections.
- Playthrough bot knobs: src/sim/bot.js (stuck ignore, force goals, recentre). Monsters ghost through each other when jammed (monsters.js).
- LATE STATUS: exit-interview.json now has real answers (34 issues/13 critical; update counts at end). tests/ISSUES.md written (31 entries; add if more found). hubgame test (tests/browser/hubgame.mjs) PASSES after fixing sessionPaused deadlock. Bot hysteresis fix (mem.forcing). monsterXp factor 0.35.
- Playthrough run cmd in background: PT_VERBOSE=1 PT_CLASS=0 node tools/runtier.mjs tests/headless/playthrough.mjs > tests/hub-run/pt0.txt (done marker at file end). When class 0 passes run PT_CLASS=1 and 2, then lastbell test (tests/headless/lastbell.mjs), then full: node tools/test.mjs. Final: node tools/build.mjs, copy nothing else; deliverable = ../TollBoothOfDoom-Diablo3-claude-sonnet-5-5-medium-20261105-162042.html and ../exit-interview.json.
- FINAL PHASE: all three playthroughs pass individually (38 checks each incl. Knell Run; levels 19-20, boss durations in range) except re-confirmation after last bot tweaks; lastbell passes (30 checks). Final full run in progress: node tools/test.mjs --sim/--browser/--hub/--headless in parallel writing tests/hub-run/full_*.txt. exit-interview.json finalized (39 issues, 19 critical). After tests: just ensure build is current (node tools/build.mjs) and write the final reply with Source Information + Testing/Engine/Prompt Feedback copied from exit-interview.json.
- final full run started 21:54
- DONE: final full run green: sim 1769, headless 325, browser 58, hub 10 (0 failures). Deliverable built.
- Final: bot boss-radius fix; all four tiers green on last build (sim 1769, headless 325, browser 58, hub 10).
- LegStepper feet, twoBoneIK arms, Codex pages viewed+fixed, rigs test added; all tiers green.
- Pace: bot ~14 sim min, estimated first player ~28 min vs plan 60; room counts and thorough bot did not change this; reported, not enforced. Malison viewed (shots/malison.png).
- Final: Toll kill quota gate, monsterHp 1.5, density 1.3; all four tiers green.
