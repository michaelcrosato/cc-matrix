# Progress
Title: Wee Tare (RNG-picked from 50). Dev folder: WeeTare-WiiFit-claude-opus-5-5-medium-20261105-024328
Deliverables: WeeTare-WiiFit-claude-opus-5-5-medium-20261105-024328.html + exit-interview.json in this folder root.

## Status
- [ ] 1 skeleton
- [x] 1 workspace in dev folder; hub files fetched to labs/game/hub (client sha differs from plan: 6ab6be43…, use fetched)
- [x] sim written: settings, types, wobble, bots, all events/*, flow, pilot, director, island, round, props/index.ts, builds, cast/clips
- balance table: `WT_SEEDS=1 npx vitest run labs/game/scenes/balance.test.ts -t meets` -> out/balance.json
- [ ] next: page (main.ts, ui/*, audio/*, bodies/*, materials, looks, cameras), onefile, verify.mjs, hub test, lines (200+), about-data, README, ENGINE-FEEDBACK, exit-interview.json
- Calls: moving props have no body (write sceneProp pose directly); stage camera `cam3=stage` driven by page shot table.
- [x] page written (main.ts, ui/*, hud, screens, dev, hub/session.ts, maps), onefile works; game boots ~70s on SwiftShader; whole game test passes in Node (scenes/game.test.ts), balance test scenes/balance.test.ts
- helper scripts in .t/ (b.sh build, sheet.py screenshots) — delete at the end (not part of deliverable)
- [ ] next: verify remaining visuals (plunge,hoop,jog,tilt), hub harness test, browser stage test script tools/verify.mjs + tools/browser.py, attract/pause/dev/touch tests, npm run check clean, README, ENGINE-FEEDBACK, about-data feedback text, exit-interview.json, final build, cleanup
- tests: node labs/game/tools/verify.mjs; browser.py + hub.py in tools. helpers moved to out/t. Remaining: fill about-data feedback (pending now), README, ENGINE-FEEDBACK, write exit-interview (tools/write-interview.mjs), final screenshots by eye, check clean, delete out/ .hubref at the end.
- tally so far of issues caught by tests: see below in final report
- browser.py passes 101/0. about-data feedback filled (update tally at the very end if needed). Running 10-seed balance shards + hub harness. Then: final screenshots by eye, npm run check, write-interview, cleanup (.hubref, out/, node_modules stays?), final reply with Source Info + feedback.
- DONE. verify: 125 passed, 1 failed (formatting only; fixed, npm run check now ok, rebuilt file is byte-identical to the tested one). exit-interview.json written.
- DONE: verify 142 passed 0 failed on the delivered file (sha 9004166f461c0b37); npm test passed; goldens, x qa audio, by-hand harness added.
- DONE: verify 188 passed 0 failed on delivered file (sha 7bf091dc3668eb70) incl. pad-only and keys+mouse routes to credits; npm test passed; no file over 400 lines.
- DONE: verify 213 passed 0 failed on delivered file (sha ec5d50b21120a2bd); npm test passed on same build; labs/game/PLAN-CHECK.md maps every plan section to its evidence.
- Hub re-run on delivered file with every check listed: 28 ok, 0 fail (2, 3, 4, host-leave, by hand).
- DONE: Line retuned by measurement; verify 213 passed 0 failed on delivered file (sha 129f65da9e321cc9); npm test passed on the same build.
