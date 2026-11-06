# PROGRESS
Title: Totter Fit (picked with python secrets.randbelow, index 25 of 50).
Dev folder: TotterFit-WiiFit-claude-opus-5-5-medium-20261105-045333/
Final file: work/TotterFit-WiiFit-claude-opus-5-5-medium-20261105-045333.html + work/exit-interview.json
Log real test-caught issues in notes/issues.md as they happen.

## Status
- [x] M0 setup: deps installed, session.js hash OK
- [ ] M0 skeleton (core, physics, data started)

- [x] Written so far: core/, physics/, render/, art/, anim/, input/, audio/, data/, ui/{ui,focus,disc,speech,css}, events/ (all 14 classes), tools/build.mjs
- [ ] TODO next: game/ (director, island+hub, checkin, jar, screens, attract, devmode, groupclass, session, ghost, ending), art/island.js, main.js, tools/test.mjs + tests, shots, exit-interview
- [x] First build works. events + balance tests exist (test/events.mjs, test/balance.mjs). `V=1 node tools/test.mjs balance` prints table. tools/dbg.mjs evaluates JS in the page.
- [ ] NEXT: test flow (whole-game), input, audio, hub, ui, unit; rendered boot check + screenshots art pass; exit-interview; final build.
- [x] tools/shots.mjs renders scenes to notes/shots (real WebGPU, device alive). Art looks good; fixes applied for island height, plank, grand hold camera.
- [x] test/flow.mjs whole playthrough passes through ending; test/unit.mjs, test/audio.mjs written.
- [ ] NEXT: test/input.mjs, test/hub.mjs, test/ui.mjs, rendered event check, WebKit boot; exit-interview; final build.
- [x] tests written: unit flow events balance input audio hub ui (all in test/). hub harness passes 4 scenarios.
- [ ] NEXT: rendered events pass (every event 2 s with RENDER, ink pixels), WebKit boot; attract wall-clock; polish review of first-5-min, title beam; exit-interview; final build; final reply.
- [x] Polish pass done (notch anim, leave class, ending light, attract title, ghost seats, keys in air). events test includes soak + WebGPU per event + WebKit. flow includes wall-clock attract.
- [x] DONE. Final build at work/TotterFit-WiiFit-claude-opus-5-5-medium-20261105-045333.html, exit-interview.json beside it. `node tools/test.mjs full` passes; unit, ui and input rerun on the final build. Nothing left that this computer can do.
- [x] Final: Research field corrected, rebuilt, full suite rerun on the final file (hash 7367bba6...). Runner now uses a fresh browser per group.
- [x] test/coverage.mjs added (journal graph, unlocks, spoken text, clips, sliders, dev tools, disconnect, audio tag, keys, 4-pad class, podium). Full suite rerun on final build.
- [x] FINAL: 24 issues, full suite green on the final build.
- [x] FINAL 2: hover outline, key bot, session card, ghost clips, heron demos, whisper, crate fruit, wave, sfx, dev stats. 27 issues, 9 critical.
- [x] Full suite complete on final file a916d34b.
- [x] FINAL 3: faint, per-player prompts, Plate band .65, plan-table bots. 28 issues, 9 critical.
- [x] FINAL 4: Poses hold drift; parked play can't earn Exemplary; guard test added. 29 issues, 9 critical.
- [x] FINAL 5: drift only while breathing, full art pass (notes/art-pass.md), 30 issues, 9 critical.
- [x] FINAL 6: About type, backdrop rock, bot noise 1.8/2.0 documented in notes/art-pass.md.
- [x] FINAL 7: Tug back to plan's .72, bot fixed, outcome tests. 32 issues, 10 critical.
- [x] Tug table limit measured and recorded in notes/art-pass.md. No game change. Final file hash 75a0bb40.
