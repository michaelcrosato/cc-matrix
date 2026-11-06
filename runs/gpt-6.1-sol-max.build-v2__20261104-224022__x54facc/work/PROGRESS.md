# Build progress — COMPLETE

## Final handoff
- Game: **Wobble Fit**.
- Root deliverable: `Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html` (6,898,984 bytes; offline, no downloads).
- Root `exit-interview.json` is valid JSON, exported from the same canonical data used by the in-game About pages.
- Development workspace: `Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022/`.
- Final full command: `node labs/game/tools/verify.mjs` — **101 checks passed, 0 failed**. Saved in `out/verify/full-report.json` and `out/verify/full-summary.log`.
- Breakdown: static gates 4; Node simulation/audio tests 26; Node/Chromium golden replays 14; metadata/package checks 5; browser checks 19; Hub cases 4; viewport/visual checks 29.
- Final overlay typography and CLI clean-exit adjustment then passed **49 quick checks** and a fresh **4-player Hub case**, both with exit code 0. `out/game/final-quick.log`, `out/game/hub-final.log`.
- All 2,135 pinned engine files are unchanged. The embedded session client matches the unmodified 1.4.0 trimmed SHA-256.
- Visually inspected: all 14 WebKit matrix images, six native viewports, title/island/Pose/Pond/Line/Garden/Tilt/results/pause/dev/About TV captures and the two-player Hub view.
- Feedback tally: **34 logged issues corrected, 14 critical**. All are resolved; historical notes below record the build and test iterations.
- Testing stand-ins: emulated standard pads, touch profiles, WebKit for iOS layout, numerical PCM. Real controller/TV/iOS and human listening quality are unknown.
- No running server or browser is intentionally left behind. Each test script closes its own processes.
- No required work remains.

---


## Task and deliverables
- Build PLAN.md in full on the read-only my-3dge workspace.
- Title chosen using Python secrets.randbelow from 50 candidates: **Wobble Fit** (index 3).
- Development folder: `Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022/`.
- Final single-file game: `Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html` in this root.
- Also deliver root `exit-interview.json`, reports, and documented one-command tests.

## Current state
- Read all of TASK.md and PLAN.md.
- Generated full game workspace pinned to e7a124394afe087a40c36e2662a5c4ca2b39a663; npm ci complete. Hub v1.4.0 client and harness fetched byte-for-byte. Public APIs being mapped before gameplay implementation.
- Shared machine: use file URLs or own ephemeral loopback server; only stop own processes. No subagents.
- Toolkit cheatsheet path is absent; viewport-matrix and Python Playwright are installed.

## Decisions
- Keep engine unchanged; implement gameplay and art under labs/game.
- Include all essential activities, five-day story, finale, local group, AI Hub ghosts, attract, settings/dev/about.

## Test issue tally
- Issues caught: 0. Critical: 0.

## Implemented modules (first assembly)
- Shared deterministic wobble/breath model, all 13 activities, five-day flow, authored clip set.
- Procedural island and retreat props, tracksuited native puppets, custom composition camera.
- Large-screen menu shell, programme/noticeboard/results, persistent settings, controls/dev/about.
- Hub client/card/ghost integration and single-file build. HTML built successfully.
- First typecheck is clean. First pilot probe found negative rhythm-index crash (critical), and rewards decaying after completion. Both fixed; tuning ongoing.
- Next: boot browser, fix runtime issues, bot thresholds, complete story/visual details, check/format/tests/harness/viewport matrix.

## Current milestone: first full model pass
- `npx vitest run labs/game/scenes/game.test.ts --maxWorkers=1`: 18/18 PASS, 27.45 s. Covers 10 seeds × 5 input patterns per activity, all poses, exact capture/restore, full five-day story to credits on 3 seeds.
- Chromium WebGPU boots with zero engine errors; title screenshot inspected at 1920×1080 (`out/game/title.png`). Full-resolution presentation selected explicitly (engine otherwise defaults to 330 lines).
- Root HTML is currently built but stale relative to latest edits. Rebuild with `node labs/game/tools/onefile.mjs` from dev root.
- Need finish: browser suite (keyboard/mouse/pad, saves, touch, dev, attract), real Hub harness 2/3/4 players + host-leave, viewport matrix screenshots including WebKit unsupported page, audio numerical tests, golden replays, npm check/test, final reports and exit-interview JSON.
- All ongoing exec sessions finish on their own; no server has been started yet. Headless Playwright processes are closed by their Python scripts.
- Test assets moved to dev `.cache/hub/` to keep upstream harness files pristine and out of game lint. `session-client.txt` is pristine; trimmed SHA-256 is plan's `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a` (whole-file SHA includes final LF and differs).
- `labs/game/ui/about-data.ts` is canonical report data; feedback counts currently unknown, update before final bundle. Final exit interview must be exported from it.
- 212 original short dialogue/notice/result lines now in `ui/lines/cast.ts`, connected to cast and plaque interactions.

## Distinct defects caught so far (track final tally from this list)
1. Negative rhythm chart index for delayed bots (critical crash) — fixed.
2. Rewards decayed after course/tray completion — activities now finish on completion.
3. Dive bot release missed swinging gauge — fixed.
4. Referenced nonexistent built-in sand texture (critical startup) — original flat sand material used.
5. Menu action map omitted default movement actions (critical startup) — fixed.
6. Rebuilding terrain for every height query slowed setup — cache immutable ground data.
7. Dive arc crossed terrain (critical story blocker) — arc corrected, full story passes.
8. Paddle used raw target input while balance sway accumulated topples — now uses CoB and a sustained alternating-foot boost.
9. Engine pixel resolution default did not match intended art — explicitly full resolution.
10. Engine overlay typography coloured activity heading cream — explicit game typography reset.
11. Attract timer elapsed during engine warm-up — reset when game is ready.
12. Presentation guides wrote phase/pose data — made guide readers pure.
13. Attract exit input could also choose a menu item — consumed that first input.
- Critical count so far: 4 (items 1,4,5,7).

## Recent edits to verify
- Appearance choice now changes puppet body; initial 3 colours, further colours unlock with pebbles.
- Hub seat-coloured puppet bodies, remote names in Group HUD.
- Expert variants toggle by left/right on Noticeboard after 10 pebbles.
- Cairo/cairn pebbles, creeping plaques, Tare follows and hops; finale spawns 12 visible guests.
- Font-size check should account for SVG text scaling, or exclude decorative SVG labels; disc label now 10 viewBox px.
- Touch attract still needs a persistent Settings button/message; unsupported browser Back currently can return normal title and should be kept friendly.
- App currently ~400 lines; keep it under 400 by extracting runtime helpers as needed. No engine files have been edited.

## Midnight integration update (Nov 5)
- Simulation + numerical audio suite: 19/19 passed. Four full story runs were not claimed; the actual test uses 3 seeds, all five days and credits.
- First 14 golden replays passed Node ×2 and Chromium ×2. They now need re-recording because final content added fields/remarks, not because determinism diverged.
- `npm run check` passed all 4 tool families before the final UI/session changes; engine remains read-only.
- Strong Hub tests correctly rejected a protocol-only success while WebGPU was still warming. `gfx.warmUp=asked`, a small session look, seat-coloured bodies prepared at spawn, and session-only reduced shadow work make the actual scene ready. A 2-player harness now passes with ready=true, no engine errors and real ghost entities.
- Found and fixed an important input integration issue: a fixed `EngineOptions.actionMap` resets `input.use` every sample. The page now supplies a single reactive map function, also used by its menus.
- Found and fixed rejected ghost arrays: scene actions require an object; list payloads are wrapped in `{items}`.
- The renderer cannot gate menu/controller polling. UI uses an independent 16 ms timer; pad input while paused is now observable.
- `GPUShaderStage` is read by three.js at module import even in unsupported Firefox. The HTML provides only the standard enum constants, without pretending a GPU exists; actual capability is still probed, and unsupported browsers show a friendly page.
- Native touch layer is removed after engine attachment in addition to touch=off, so no hidden touch-control DOM remains.
- Latest built HTML includes these changes. Current running session 83090 is browser-check.py; read out/game/browser.log for its failures/status. Do not build over the HTML while a test starts new pages.
- Last Hub quick run passed 1/1. Full 2/3/4/host-leave still required. No server is left running between scripts; each harness owns and closes its ephemeral server.
- Remaining finish: final browser checks, full Hub, viewport matrix + inspect screenshots, finalize feedback counts, generate exit-interview.json, record final goldens, run one-command verify, update progress complete, deliver root HTML and reports.
- One-command verifier and report exporter are now in labs/game/tools/. The viewport script has not yet been written.

## Latest verified state (Nov 5, after 00:34)
- **15/15 browser checks PASS** (`out/game/browser-report.json`): keyboard lean really moves the sim; mouse menus; controller navigation; pause/dev live sliders/reset; volumes and glyph persistence; all About pages; activity views; attract/save isolation; touch-only Settings during attract; WebKit + Firefox friendly unsupported page.
- **21/21 Node tests PASS** before the most recent exact Morning Check scoring adjustment. Includes direct pose-entry control, input-driven dive rotation, attract Centre Stone duration, and actual ghost sim entities.
- Full Hub: **2 players, 3 players and host-leave passed; 4 players missed ready deadline** on the last two copies. No protocol errors, engine errors or missing ghosts once loaded. Latest source now progressively prepares the round neighbours after the first actual player frame, to preserve the 20 s deadline without cutting multiplayer.
- Running tool session **76052** is `hub-check.py --players=4` on the current built HTML. Read out/game/hub.log. Do not overwrite the HTML while a running test starts new pages.
- No other server/browser is running from our work. Harness server lifetime is internal to its Python script.

## Final source additions since last all-green browser build
- Real earned headband and colour unlocks, reachable from Settings → Your retreat outfit.
- Dev finish score can be chosen across every rank; time scale uses native clock controls.
- Independent menu polling and single pause input owner (removed duplicate native/DOM pause handling).
- Correct native slider increments; every numeric game setting is live.
- Pose strip entry now advances only while following the guide; dives scrub only from lean input; garden disc and tray reflect tilt input.
- Original shore/wind/rain synth ambience, ripple/splash/stamp emitters.
- Physical drinks drift by day, unattended garden marbles move on Day 4, Bex has a phone-shaped stone; Plumb has closed-eye arcs and opens them briefly at dawn; original cast participates in the finale.
- Morning Check now uses 12 s stillness, 24 s reach, 8 s one-foot scoring windows with the plan's .45/.30/.25 weighting. Retaking a check updates today's age instead of creating another yesterday.
- Current compiled typecheck is clean. Need rerun Node tests and record final replay hashes after the Morning Check/world changes.

## Remaining finish sequence
1. Finish 4-player startup and run full Hub cases (2,3,4,host-leave) until all pass.
2. Run final npm check/test, record final replays with `node --import tsx labs/game/tools/record-replays.ts`, verify Node/Chromium parity.
3. `labs/game/tools/viewport-check.py` now exists. It runs installed WebKit viewport-matrix (own out/ folder), native WebGPU phone/tablet/desktop/ultrawide screenshots, and 1920x1080 title/island/activities/menus. Inspect PNGs; fix any clipping.
4. Finalize `ui/about-data.ts` (testing count not yet final), export root exit-interview.json using tools/export-report.ts, rebuild root HTML, run `node labs/game/tools/verify.mjs` (quiet, one count line).
5. Finish README/ENGINE-FEEDBACK/PROGRESS, check JSON parses, final chat must include Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, plus clickable HTML.

## Additional tested defect tally
14. Rendering-gated menu polling lost controller input while paused (critical) — independent UI timer.
15. Demo Settings button rebuilt while a tap was in progress — memoize its raw content.
16. Native touch controls remained hidden in DOM — remove the native touch layer.
17. Firefox lacked GPUShaderStage at module import (critical startup) — standard enum only; still honestly detects no GPU.
18. Hub graphical warm-up missed deadline (critical integration) — requested render paths, light session scene, progressive neighbours; four-copy fix in progress.
19. Ghost scene-action arrays rejected (critical integration) — object envelopes.
20. Fixed EngineOptions.actionMap reset every input.use call (critical controls) — one reactive map selector.
21. Duplicate pause input handling reopened pause after Resume (critical controls) — one menu input owner.
22. Dev slider step grid rejected valid-looking values — decimal increments containing defaults.
- Count currently **22 issues, 10 critical** across the explicit tally. Additional planned feature/polish changes are not added to this count.

## Final correction tally (32 logged issues; 14 critical)
23. Attaching a ghost component to a pending actor threw SIM_NO_ENTITY (critical) — supply extra components at spawn.
24. Keyboard plus connected pads could drive the wrong local mat (critical) — independent seat assignments and raw device input.
25. Daily checks after the ending could replay credits — endingSeen and free-practice daily flow.
26. Wobble title clipped on a 344 px phone — clamp portrait logo size by width.
27. Saved finds remained visible, and erasing did not rebuild collected objects — cull saved finds and reset the scene on erase.
28. Sandbox progress could later leak into the real stay — private snapshot, memory progress, and full restoration when switched off.
29. Group/practice started from title could overwrite an existing stay with a fresh world (critical) — hydrate saved progress before any activity; preserve queued activity choices.
30. Foot rebinding did not preserve other device codes or update prompts/local seats — native replace-code rebinding and one shared binding reader.
31. Idle walking copied undefined fields into actor.intents, breaking capture/actions; stationary modes could retain walking wishes (critical) — plain values and one pilot clearing wishes.
32. Stations/Tare could hide guest, bench, noticeboard or hut interactions — choose the closest actual interaction and give the noticeboard a real UI event.
- 25 Node tests most recently passed; final recorder/verifier will run after this source freeze.
- Current root HTML is stale relative to the final source. About report now contains the actual logged issue counts and final feedback, in one canonical data module.
- Latest standalone browser run: 15 passed with 3 cascading timing/held-input failures in the new local/sandbox/rebind checks. Local check now advances the logical class lead-in using the actual captured seat packet and always releases held inputs. These new checks must pass in final verification.
- Latest viewport pass had all 29 layout/visual checks pass, but caught the exploration plain-data error. That error is now covered by a Node capture/hash regression and fixed.
- Four-player Hub now passed with real actors, no errors, and 3 ghost entities in every remaining copy. Full 2/3/4/host-leave still to be rerun against the final package.

## Source freeze after final visual findings
33. Attract could interrupt an in-game settings/controls pause and discard the active class — limited to front-end flow, including the noticeboard; active rebind capture is protected.
34. Terrace heights were relative to terrain's -1 m origin, sinking actors below decorative floors — offset flat specs and added physical mat/deck/jetty supports. A feet-height regression passes.
- Final canonical feedback currently records **34 logged fixes, 14 critical**. Source Information and all feedback answers are in ui/about-data.ts; root exit-interview.json has parsed successfully with all 15 source fields and 4/6/4 feedback answers.
- **26/26 Node tests passed** after terrain, input, persistence and interaction regressions.
- Important root cause for flaky Hub boot: the engine prewarms every registered prop, even if unplaced. Props are now factories registered in buildWorld(small): only the pavilion set in the Hub, the full library on the island. No engine changes.
- Current single HTML is rebuilt with the final source and scoped prop registry.
- Running session **19986**: fresh full Hub suite followed by viewport suite, sequentially. Two-player screenshot now visibly shows complete bodies above the supported mats and a real remote avatar. Read out/game/hub.log and out/game/viewport.log.
- Last full verifier (superseded artifact) ended with 3 failed stages: two functional test assertions/timing issues, Hub readiness, one 30 s screenshot timeout. Functional screenshots were removed because the dedicated viewport suite supplies visual evidence. Rebind reset assertion now switches back to keyboard prompts. Local-seat check fast-forwards its logical lead-in using the real captured seat packet and releases inputs in finally. Screenshot waits are bounded at 90 s without asserting performance.
- Need: fresh full browser 19 checks, full scoped-prop Hub result, final viewport result and inspect the final PNGs, final one-command verify. Then update this file to complete and deliver HTML + exit JSON with all required report sections in chat.
- Inspected all 14 WebKit matrix PNGs and 6 native viewport PNGs. WebKit matrix had zero errors/overflow. Native narrow-title clipping was fixed. Final TV activity captures still to inspect after the supported floor correction.
