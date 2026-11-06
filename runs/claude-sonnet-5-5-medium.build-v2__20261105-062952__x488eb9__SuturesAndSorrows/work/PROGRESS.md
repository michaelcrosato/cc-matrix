# PROGRESS
Title: Sutures & Sorrows (RNG pick idx 3 of 50). Dev folder: SuturesAndSorrows-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-062952 (D). HTML at work root with same name + .html
Vendor cloned in D/vendor (engine my-3d2dge handoff, hub). 
## Done
- [x] read STAGE/TASK/PLAN, title, vendor clone
## Next
- read engine API.md, hub README
- [x] D/src/engine/my-3d2dge.js = patched copy (touch notice patch, Appendix E). Vendor dir stays pristine.
## Design notes (to keep after compaction)
- Files in D/src wrapped IIFE sharing window.GAME (G). manifest D/src/manifest.json = load order. tools/build.mjs bundles. tests/run.mjs = one command.
- Plan: core/sim.js (Op.create/step, plain-data S), core/strains.js, data/cases.js, data/story.js, art/*, audio/*, ui/*, scenes/*, net/hub.js, bot/autosurgeon.js, main.js
- Cut-list allowed by plan if short: Case 9, Skills Lab, Da Capo r2, ship ward. NEVER cut: 8 tools, both gifts, finale, Grand Rounds+hub, attract, dev mode, About, exit-interview.
- cd carries! always use absolute D path.
- [x] M1/M3/M5-M7 sim DONE in D/src/core (sim, tools, objects, strains, cursor), data/cases.js (c1..c11 + grandRounds(n)), bot/autosurgeon.js. `CASES=c1,..,c11 node tests/run.mjs` -> all 11 cleared by bot at Resident (15 checks).  tests/lib.mjs playCase(); tests/dbg*.mjs are debug helpers (delete or keep out of run: names don't start with t_).
- TODO next: GR test with bots; art (tissue painter, sites, objects draw, bust, instruments, stages), audio, UI (hud, wheel, menus, dev, about), scenes (title,menu,difficulty,story,chart,op,lost,results,ward,casefiles,lobby,credits,attract,hubround), net/hub.js, story data, build.mjs, exit-interview, about-data.json, notes/feedback.md, CONTENT.md, hub harness test (tests/hub.py), appendix D/E.
- [x] written (untested in browser): art/{tissue,sites,bust0,bust,draw}.js audio/{audio,music}.js data/story.js (G.STORY scenes, G.CASE_STORY, G.WARD_TALK, G.BARKS, G.CHART). manifest.json needs art/draw.js, data/story.js added (not yet!).
- NEXT: art/stages.js, ui (glyphs/hud/wheel), scenes (all), main.js, net/hub.js, build.mjs, browser tests.
- [x] written: art/stages.js ui/ui.js scenes/opview.js (G.OpView: ctl/dev/step/draw/overlay/hud). manifest still must list: art/draw.js art/stages.js data/story.js ui/ui.js scenes/*.js net/hub.js ui/dev.js main.js
- NEXT: scenes/core.js (title,menu,difficulty,story,chart+lightbox,op,lost,results) -> scenes/extra.js (ward,casefiles,lobby,about,credits,attract) -> net/hub.js -> ui/dev.js -> main.js -> build.mjs -> browser check
- [x] written: scenes/{core,extra,opview}.js ui/{ui,dev}.js net/hub.js (hubround scene). STILL TODO: main.js, manifest update, tools/build.mjs, src/about-data.json (+gen js), index.dev.html, browser check (tools/check.mjs), tests (draw errors, attract, dev, hub.py), notes/feedback.md, CONTENT.md, exit-interview.json, final html at work root.
- [x] ALL BUILT. node tests/run.mjs (full, incl playthrough ~8 min) ; hub.py, browser.py pass. Remaining: confirm final full run passes, final reply with Source/Testing/Engine/Prompt feedback.
