# Progress
Title: Wibble Fit (RNG-picked from 50). Dev folder is this folder. Deliverable: ../WibbleFit-WiiFit-claude-opus-5-5-medium-20261105-001833.html
- [x] kit + hub fetched (engine 0.46.0)
- [x] core (dot,tunables,actions,device,clock,save) + data (lines,poses,reps,charts,boards,week,activities...)
- [x] drivers, progress, ui font/widgets/menu/prompts, glyphs
- [x] audio (songs,sfx,voice), clips (validated), avatar
- [x] app.js, base scene, dialogue
- [x] activity base, stage helpers, results
- [x] lane sims: poses reps hoop step header
- [x] single-player activities: slackline tray jog pier longstand
- [x] island, hub, weighin
- [x] report, ferry, ending, jar, records, locker, about data(feedback to fill at the end)
- [x] settings pause howto about dev title
- [x] medley/join/viewer/main/build; headless smoke test OK (tests/headless/smoke.mjs)
- [ ] visual pass via tools/shot.mjs; full test suite tools/test.mjs; hub harness; fill about.js feedback at end
Notes: `node tools/build.mjs` builds root html + exit-interview. Tests must call App.go without await (cover needs frames).
- bots tuned, tests/headless/activities.mjs --v shows table. Hoop flick must be held .26 s (plan's raw flick auto-caught while circling). Tray wrong cup needs .9 s dwell.
- [x] tests/headless: core, activities, flow (playthrough) pass. replay deterministic. Next: tests/browser + hub harness + tools/test.mjs, then visual pass of every screen, fill about.js feedback.
- browser tests + hub harness all pass (tests/browser). Visual pass under way (tools/shot.mjs with montage in .shots). Remaining after visuals: rerun node tools/test.mjs; fill data/about.js feedback from real run; final reply must include Source Info + feedback.
- visuals: ok for all activities/menus/card; fixes pending: canPause on card, dev timescale after go, crosshair for all lean, ripples, kevin rail/sunbeams, half lean prompt only on keys. Then final tools/test.mjs + about.js.
- [x] DONE: all plan steps built. Node 13744/13744, browser 70/70, hub 12/12, kit check OK. Deliverable + exit-interview.json in parent folder.
