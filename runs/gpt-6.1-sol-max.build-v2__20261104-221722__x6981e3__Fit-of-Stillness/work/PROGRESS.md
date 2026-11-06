# Fit of Stillness — progress

## Brief and decisions
- Read `PLAN.md` and `TASK.md`. Build a complete fitness comedy game on the unmodified Pixel Engine, with a seven-day story, balance physics, activities, local Medley and AI Hub sessions.
- Title selected with Python `secrets.randbelow` from 50 original candidates: **Fit of Stillness**.
- Development folder: `Fit-of-Stillness-Wii-Fit-gpt-6.1-sol-max-20261104-221722/`.
- Final files at workspace root: matching `.html`, `exit-interview.json`, and this log.
- No subagents. Use file URLs and headless tests first. Own servers only on OS-assigned localhost ports; stop by owned PID. Browser reports and images stay in the dev folder except the machine viewport toolkit's own output.
- `~/dev/TESTING-TOOLKIT.md` is absent; the supplied AGENTS instructions describe the installed tools.

## Current stage
- Pixel Engine 0.46.0 and Hub client 1.4.0 downloaded; GUIDE.md, ASSETS.md and Hub README read whole. Engine checksum recorded and unchanged.
- Development modules and single-file build exist. `node tools/build.mjs` writes the root HTML and exit interview from `src/data/about.js`.
- Implemented all 17 activities, seeded Dot/bots, three save slots, week mornings/goals/reports, seven-day story and confession, Week 2, island walking/stations, locker/jar/records, settings, pause, developer tools, attract, local Medley and Hub ghost integration.
- Original 19 model defs, 23 animation defs, tiled surface, mixed-case HUD, original code music/SFX/formant voices and 150+ lines.
- Headless suite initially passed **88/88** including complete seven-day playthrough, every activity, saves, pause, Medley, attract loop, deterministic replay, data validation and engine checksum.
- Browser suite has verified file WebGPU boot, pad/mouse/keyboard, 3 independent local lanes, music/SFX and offline voice RMS, phone gear/touch message and attract, tablet/foldable, wide layouts, graceful Firefox and WebKit WebGPU failures. All **four Hub harness cases pass**.
- Final full run: **114/114 passed**, including the complete real-menu story playthrough, all four Hub harness cases, neutral-rig animation analysis, audio/input/layout/touch checks and the kit's packaged-file check.
- Final build is complete. HTML is **5,593,646 bytes** and runs from `file://`. Exit interview schema and engine checksum validated. Final feedback is included in the HTML's About screen and root JSON.
- Inspected all screen captures, all 23 animation sheets and all 19 model sheets. Improved Step display, chunky slackline, raised tray, side-view pier, island jog props, visible locker turntable, records/chart/calendar tabs, native sliders and hard class selection.
- Correcting animation preview setup to use a neutral rig caught Tuck and Disembark foot penetration. Both now analyze cleanly; the full run is green.
- Added unscaled UI time, verified attract from a frozen Settings menu, and fixed a tray cup-name regression in Jog scoring. All three tray boards are wired into runtime and the hard board has a third colour and respawn gap.

## Completion
- No required work remains. Inspected final class, island, balance-game, locker, report, records, ending, family, title and phone captures, plus original model/animation contact sheets.
- Optional balance games were completed rather than cut.
- Deliverables: root `Fit-of-Stillness-Wii-Fit-gpt-6.1-sol-max-20261104-221722.html`, root `exit-interview.json`, this log, and the matching development folder.
- Dev usage and controls: development folder `README.md`. Rebuild with `npm run build`; verify with `npm test` (or `npm run test:fast`). Reports are in dev `check/tests.json`, `check/hub-*.json` and `check/report.json`.
- Chromium rendered the game. This machine's Firefox and WebKit lack WebGPU and passed the expected graceful-failure checks. Touch and controllers used browser profiles/stubs; no claim of physical controller/TV/iOS Safari testing.
- Every browser and localhost server started for verification has closed through its own cleanup.

## Issue ledger for feedback (22 grouped findings)
1. Final fractional frame could exceed 100 percent.
2. Sloppy coconut AI matched expert.
3. Palm tube went below its model floor.
4. Idle coconut play could earn a passive star.
5. Asynchronous scene/voice context race.
6. Stale queued pad input defeated keyboard prompts.
7. Ounce obscured the island hero.
8. Step display covered the player's head.
9. Slackline was too thin to see.
10. Tilted tray intersected floor and mats.
11. Jog duplicated the class stage and island.
12. Pier framing did not show a clear runway/flight.
13. Locker menu hid the appearance preview.
14. Evening-report comments overlapped.
15. Music did not resume reliably after pause, including hub/Medley.
16. Controller could join Family Hour but could not start it.
17. Hard classes had no regular selector.
18. Manual browser steps used stale HUD dimensions after resize.
19. Tuck feet penetrated the floor.
20. Disembark feet penetrated/slid.
21. Paused UI timers froze typewriter and menu attract.
22. A tray cup array temporarily replaced Jog's numeric cup counter.

## Verification and issues
- Toolkit cheatsheet path is missing; supplied AGENTS instructions still apply.
- Findings fixed so far: final fractional score overrun; sloppy Header AI too accurate; palm under floor; passive Header stars; scene-transition/voice context race; stale queued pad input defeating key prompts; Ounce hiding the island hero; hair/locker visibility; Step covering the player's head; unreadable rope; tray intersecting floor/mats; duplicate Jog stage; unfinished pier framing; music resume; controller joining/start; missing hard-class selector; HUD sizing during manual steps; Tuck foot placement.
- Test corrections: pause measured after opening the menu; backend name is `WebGPU`; animation analyses now use a neutral model; activity time bounds include settle/release.
- Tools: `node tools/test.mjs --fast`; `node tools/shot.mjs title` (or `activity tree`, `hub`, etc.). Captures in dev `check/visual/`.
