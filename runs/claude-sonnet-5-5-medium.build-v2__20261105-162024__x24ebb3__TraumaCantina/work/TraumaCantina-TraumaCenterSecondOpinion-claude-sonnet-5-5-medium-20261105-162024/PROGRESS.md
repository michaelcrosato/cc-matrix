# PROGRESS (Trauma Cantina)
Title: Trauma Cantina (RNG pick idx 3 of 21). Folder = this dir. Deliverable html in parent root.
## Plan of work (mark [x] when done)
- [~] 1 skeleton (sim+ops+bot done & passing via tests/try.mjs <op> <skill>; ops1.js ops2.js in src/content/ops): build.mjs, tests/run.mjs, game.js boot
- [ ] 2 sim core + tools + ops + bot (src/sim, src/content/ops)
- [ ] 3 view: field, hands, hud, op stage
- [ ] 4 audio: voice, sfx, songs
- [ ] 5 story/busts/sets, menus, settings, pause, dev, attract, touch gate, about
- [ ] 6 consult couch + hub session
- [ ] 7 tests, build, exit-interview.json, final reply
## Notes
- DONE: sim/ops/bot/balance (tests/balance.mjs calibrate), audio, stages (menu story briefing operation results consult credits attract card), net (hub harness 5/5 pass), browser tests 31/31.
- DONE (no TODOs left): 1080p review of all arenas (incl. Op 3 tables A/B/C), sets and busts; about.js Q&A filled (4/6/4); exit-interview.json written. Build: node tools/build.mjs (writes ../<STEM>.html).
- Also: room shells, set props, field entities, tools, busts, figures are model() data (check.mjs --sheets: 54 models, 0 problems). Kidney tween verified on screen (check/k6-grey.png, k6-pink.png).
- Tissue is now a 480x270 RGBA DataTexture on a 192x108 PlaneGeometry exactly as PLAN s9 line 542 (painted via 2D canvas, copied into the DataTexture each frame).
- Test cmds: node tests/run.mjs [sim|content|browser|hub]; hub single: node tests/browser/hubdbg.mjs "players=2"
## FINAL (all done)
- Full suite: node tests/run.mjs all => 2502/2502 (sim, campaign, content, audio, net, browser 31, hub 5/5 harness cases).
- Deliverable: ../TraumaCantina-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-162024.html (7.1 MB); ../exit-interview.json written and parses.
- Follow-up done: real 3D comm bust (camera-anchored, castShadow off), RenderView live monitor in OR-7, Mirror in the scrub room, 1080p review of all 10 arenas, story sets and busts (check/r-*.png). Models remain code primitives, not model() data.
