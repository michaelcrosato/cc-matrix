# Verification and resolved issues

The supported graphics paths are WebGPU and WebGL2. Chromium was tested with the documented software-WebGPU flags and without them; WebKit was tested with desktop and iPhone/iPad profiles. Firefox on this headless host cannot obtain WebGL2 and receives a recoverable graphics screen. Real Safari, physical controllers, actuator strength and human audio quality are unknown. Gamepads are emulated in standard mapping; synthesized audio is rendered with OfflineAudioContext. Chromium’s permissive autoplay means a pad-only audio unlock could not be proved here.

The unified command is `node tests/run-all.mjs`, optionally with `sim`, `browser` or `hub`. `TEST_FILTER=responsive node tests/run-all.mjs browser` selects a named check for targeted regressions. The runner prints failures and a single count, with details in artifacts/test-results-*.json.

Normal bot playthroughs check victory, A-or-better rank, 45–75% of the available timer, and at least 35 ordinary vitals. Scripted dips and arrests are checked separately: the design deliberately sets them to 35 and 15, so including those forced values in the ordinary-vitals invariant would contradict the plan. A noisy bot with a 0.25-second tool reaction delay must finish every main operation on Intern. An idle surgeon must fail. Co-op checks one through four surgeons, task/HP scaling, exclusive forceps ownership, simultaneous shocks and separate suture threads.

The real Hub harness checks 2 players, 3 and 4 players at 150±50 ms and 5% loss, host departure, server authority, and a 4-player WebGL2 run. It requires traffic both ways, valid results and no protocol warnings. A final standalone check verifies the client does not seed Math.random outside sessions.

The viewport-matrix run wrote 19 clean screenshots to /tmp/viewport-matrix/trauma-tempo-20261105-051847. Representative phone, foldable, tablet, laptop and ultrawide pictures were inspected. Additional browser geometry checks cover all Settings pages and a Consult chart at 375×667, 756×352, 640×400, 768×1024 and 2560×1080.

## Issue ledger

There are 26 tracked issue groups. Eight were classified critical because they blocked progress or normal scripted completion. Related visual symptoms are grouped together.

1. **Critical:** ordered objectives prevented emergency cleanup. Hazard tools now bypass task ordering.
2. **Critical:** repeated Legato bleeders exhausted the clamp budget. Phase attack spawns are bounded.
3. **Critical:** Coda attacked after its arms were severed. Downbeats now require an arm.
4. Unary exponent syntax prevented the first bundle. Expressions were corrected before browser testing.
5. The scalpel could nick immediately after a completed cut. Completion has a release grace interval.
6. An extraction axis of zero became 90 degrees. Explicit null handling preserves valid zero angles.
7. **Critical:** an incomplete pull moved the anchor and eventually became unreachable. Embedded objects return to their original anchor.
8. The bot released forceps to use the IV and crossed a target during its reaction delay. It holds the grip and waits before moving.
9. Recurring debris distracted the bot from the spawning nest. It treats the source first.
10. HUD portrait placement, tray framing and wet highlights failed visual review. They were repositioned and toned down.
11. Clip-path reveals allowed fast clicks through to the previous screen. Reveals use opacity while retaining hit targets.
12. Queued phase hints could overwrite an immediate tool selection in test jumps. Events are drained before yielding the jump.
13. Early attract segments repeated too few operations. The loop now shows a scene, every system, report and title.
14. Hairline, torso winding, and the foreground table/drape obscured faces. Geometry and staging were corrected.
15. Render entities retained stale data across operation ids and keyframes. Reconciliation keys include phase/site and refresh entity references.
16. Cast and trophy meshes were repeatedly recreated. Casts are cached, trophies retained, and removed meshes disposed.
17. Skip and More Time displayed the wrong keyboard token; existing tokens did not refresh immediately. Dedicated tokens and refresh logic fix both.
18. Tips could sit below the tray and the final patient had no visible charge cue. Tray height and world-space shock rings fix those cases.
19. A phone Consult chart pushed Begin below the viewport. Compact chart spacing and type keep the full chart visible.
20. **Critical:** feeder regeneration duplicated dead feeder records and overfilled the field. Regeneration restores at most four live feeders; the bot approaches them at an appropriate pace.
21. Shared-screen HUD/gift routing and forceps ownership could address the wrong seat or object. Current-input seat routing and exclusive grips are enforced.
22. **Critical:** suturing a separate wound could tear another surgeon’s thread. Each held suture input owns its current wound; a two-surgeon regression check covers it.

All listed groups are resolved. Test artifacts record the executed checks and full Hub reports.

23. **Critical:** extracted strain trophies lacked live guide data. Their render geometry now has safe defaults; a rendered post-extraction regression check keeps the following phase alive.
24. **Critical:** Float32 cylinder endpoints could generate a negative skinning index. Clamping the normalized skin position fixes the skeleton bounds; every strain is now drawn on WebGPU, WebGL2 and WebKit in the graphics checks.

25. Portrait planes did not write depth, allowing underlying wound edges to leak into the ink pass. The portrait and cut-in planes now write their own depth while rendering above the field.

26. The tall tablet/session frame could overlap the bark and gift panel. Its rem scale now also respects available width, with a 775×960 intersection regression check.
