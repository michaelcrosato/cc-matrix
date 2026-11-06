# Progress
Title: Silly Folk. Dev folder: SillyFolk-AnimalCrossingCityFolk-claude-opus-5-5-medium-20261105-171821
- [ ] step 1 scaffold
Plan of modules: see PLAN §21. Done so far: core/util,storage,calendar; dev/tuning; ui/font,input,kit,icons; art/critter; actors/clips,actor; data/items; tools/build.mjs
Also done: art/textures,models; tools/genmap -> data/townMap; world/place,layout,terrainMesh,rooms. Next: core state+save, systems, game.js, town view, dialogue data, audio, net.
Done: data/cast, data/lines (writing). Next: state.js + systems + game.js.
Done: state.js, core/world, core/save, systems/days. Next: audio (voice, sfx, songs), ui/dialogue+script, world/view, actors/player+npcs, systems/*, ui/screens, ui/shell, game.js, main.js, net, tests.
Done: audio/composer,voice,sfx,music; world/view. Next: ui/dialogue+script, actors/player+npcs, systems/nature,talk,services,city,year,dayone; ui/screens,shell; game.js,main.js; net; tests.
Done: ui/dialogue, actors/player, systems/nature. Next: systems/tools+interact, npcs, talk, services, home, city, year, dayone; ui/screens,shell; game.js,main.js; net; tests.
Done: world/places, actors/npcs, systems/interact (targets+tools). Next: talk, services, home, city, year, dayone; ui/screens,shell; game.js,main.js; net; tests.
Done: ui/screens (pockets, keyboard, card, mail, map, almanac, catalogue, emotes, chime, pattern). Next: talk, services+home, city, year, dayone; ui/shell; game.js,main.js; net; tests.
Done: systems/talk, systems/services (gander, clementine, quill, mothwick, shelves, wings, rating). Next: home (furniture, bureau rating), city (bus, venues, crowd), year (festivals, contests, vesper, rocco, ending, pimm), dayone; ui/shell; game.js,main.js; net; tests.
Done: systems/home. Next: city (bus, venues, crowd), year (festivals, contests, vesper, rocco, ending, pimm), dayone; ui/shell; game.js,main.js; net; tests.
Done: systems/city. Next: year (festivals, contests, vesper, rocco, ending, pimm, stars, snow), dayone; ui/shell; game.js,main.js; net; tests.
Done: systems/year, systems/dayone. Next: ui/shell (title, pause, settings, dev, about, attract), game.js, main.js; net (hub round + visit); tests; polish; exit-interview.
Done: ui/shell, data/about(+aboutText drafts - fill at end, "pending" must be replaced). Next: game.js, dev/attract, main.js, net, tests.
Done: game.js, dev/attract, main.js; build OK. net/round.js is a STUB (must implement hub round + visit: net/transport, visit). Next: first run in headless and browser, fix; tests/run.mjs suites; net; polish; aboutText final answers; exit-interview.json at work root.
Done: net/transport, net/round (hub), net/visit. Next: wire visit in game.js (G.visitMenu, guest guards), tests/run.mjs suites, fix.
tests/headless.mjs, tests/play/{bot,playthrough}.mjs, tests/browser/{shot,hub_suite}.py written. hub players=2 pass. Next: playthrough green; sim suite; browser suite; visit suite; tests/run.mjs; replay/fingerprint; screenshots polish; final about text.
tests/sim/sim.mjs (green), tests/browser/browser_suite.py written. Found: sawtooth wave poisoned audio with NaN (fixed). TODO next: rerun browser suite; visit suite; replay check; tests/run.mjs; sheets; screenshots review of all key screens; final about text; exit-interview.json; cleanup tests/tmp, tests/browser/aud.py.
All suites written (tests/run.mjs): sim, play, replay, browser, hub (all 4 pass), visit pass. Package.json+node_modules in dev folder for check.mjs --sheets. Polishing visuals via tests/browser/tour.py. Remaining: review shots, final aboutText, exit-interview.json at work root, rerun everything once, cleanup tests/tmp, tests/browser/aud.py, dev node_modules ok.
aboutText final drafted; tools/gen_exit.mjs writes ../exit-interview.json. Next: full `node tests/run.mjs`, grep no TODOs, cleanup tests/tmp + aud.py, final reply with feedback text.
FINAL: dev replay + free camera implemented. Final `node tests/run.mjs` running in background; when it reports 7/7, reply with Source Info + feedback (src/data/aboutText.js) and finish. Deliverables present: ../SillyFolk-...html, ../exit-interview.json.
Final full run: 6/7, visit FAILED (G.visit null). Investigating.
Final: node tests/run.mjs 7/7 on the delivered build. One earlier full run had 6/7 (visit, intermittent, cause not established; 6 later passes). Finished.
Hook said not done. Closing gaps: input lock root cause (Visit flake hypothesis: lock swallows a press arriving before next slow frame), Mirror verify, attract contact sheet, composite fossils, lemur SpringChain tail, puddles, NPC umbrellas/fishing/carrying/gather at Vesper, musician+murmur sound, STUN test, cloud shadows, fish rings, frosted windows, bus visibly arriving + Hester, roofless shack until evening, guest drop gifts.
NPC nav origin bug fixed (neighbours were not pathing); attract blocked during Visit (likely real cause of Visit flake); input lock frame-based.
Text updated, rebuilt. Running full suite twice (tests/shots/final{1,2}.log).
FINAL: node tests/run.mjs 8/8 twice in a row on the delivered build. Finished.
Hook round 3: proving Visit cause, adding mouse HUD icons, tile highlight, assertions (xbox glyphs, bureau mail, host leaves, full gate), season+festival shots, sheet warnings.
Round 3 fixes in. Final evidence: tests/final_run.log (2 full + 5 visit).
FINAL (round 3): 2 full runs 8/8 exit 0, Visit 37/37 x7 total on the delivered build (log: dev folder tests/final_run.log). No leftovers. Finished.
Round 4: stargaze glide, guest catch validation, last sheet warnings, reproduce old Visit error, door lights/attract summer/credits shots.
Round 4 done: glide, catch validation, fireworks rebuilt, sheet warnings, old Visit error reproduced. Final evidence running to tests/final_run.log.
FINAL round 4 result recorded: see tests/final_run.log
Round 4 full run 1 FAILED stun guest arrives (run 2 + 3 visit passed). Investigating with tests/browser/stun_stress.py.
Reply Slip STUN fixed. stun stress 9/10 (one unlogged miss, unexplained) then 25/25 and 30/30. Final evidence running.
FINAL result in dev tests/final_run.log.
Join miss root cause proven by stress diagnostics (channel already open at ondatachannel; hello never sent), fixed.
Join miss fully explained: (1) channel open before onopen, (2) first hello lost at channel (counters sent 2 recv 1). Both fixed; retry. Final evidence to tests/final_run.log.
FINAL evidence complete, see tests/final_run.log
tests/PLAN_AUDIT.md written. HoldUp/Wave/Love arms fixed from contact sheets. Final evidence running.
FINAL: see tests/final_run.log and tests/PLAN_AUDIT.md
Round 6: review all sheets, spring chains for laundry/scarf/ear, spatialized river/surf.
Round 6: all 97 sheets reviewed, flagpole+bell roof fixed, spring chains, spatial water. Final evidence running.
FINAL: see tests/final_run.log, tests/PLAN_AUDIT.md
Roof wedges fixed everywhere (V to ridge). Chains seen in game. Final evidence running.
FINAL: see tests/final_run.log, tests/PLAN_AUDIT.md
All roofs re-checked on sheets and in village; no game code changed since final_run.log. Finished.
