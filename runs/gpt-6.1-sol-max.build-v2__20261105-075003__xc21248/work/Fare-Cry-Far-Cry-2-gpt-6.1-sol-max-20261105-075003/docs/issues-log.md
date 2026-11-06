# Verification issues

Confirmed gameplay issues found by tests or visual inspection (running tally; open items remain until verified):

1. **Critical:** holding Use to skip the barge made the prologue timer negative; the movement gate then stayed closed. Fixed by clamping the completed prologue to zero. Input-driven movement regression passes.
2. The first skiff faced toward the bank and stopped after a few metres. Fixed its heading to follow the Marrow; movement test passes.
3. Pickup interaction lost to the nearby shop interaction. Fixed nearest-object selection so the vehicle can be entered.
4. Burning trees cast their first ember behind the advancing front. Moved the first cast earlier so embers can make spot fires.
5. Attract surgeries started on the exact preceding animation boundary, skipping finger and burn variants. Increased spacing; all four now appear.
6. **Critical:** destruction of an unused dynamite truck could fail an unrelated active contract. Restricted this failure to its own undelivered contract.
7. Reissued dynamite trucks retained their broken flag. Reissuing now restores health, cargo, engine state and timers.
8. First art check showed broad black cone-shaped grass and incidental title subtitles. Narrowed grass silhouettes, increased density, suppressed incidental title dialogue and moved decorative fire closer.

Test infrastructure corrections (not product failures): fixed an incorrect expected POI count, compared saved fire cells as sets, and tolerated floating-point accumulation at reel boundaries.

9. Holding Use through the end of the opening immediately opened the Ferryman menu. Added a release gate so the skip gesture cannot become a world interaction.
10. Synthetic mouse events following touch could rebuild the title menu during a tap. Mouse, keyboard and touch input now have separate unlock rules; Android and WebKit tap checks pass.
11. The objective accumulator discarded a fractional step and made timed endings run long. Fixed by retaining the remainder.
12. Saving immediately before an ending choice lost the pending choice on reload. Pending choices are now preserved and reconstructed.
13. **Critical:** expensive session graphics could delay first traffic or a result beyond the Hub grace period. Initial traffic now precedes graphics, static scenery is batched, expensive frames are governed, and fallback session graphics use a smaller allocation.
14. **Critical:** the physical held map uploaded a canvas before it had a Canvas2D context, stopping WebGPU rendering. The map is drawn before its GPU texture can become visible.
15. Night skies changed while constant ambient light left the ground too bright. Ambient light and the ink grade now follow the night factor.
16. Two-sided sign planes showed mirrored text from behind. Signs now have correctly oriented front and back faces.

Additional implementation corrections during code inspection: vehicle steering direction and handbrake; controller vehicle look/lights; player-specific case restrictions, case drop replication and group extraction; visible driving map; restored broken guns from an armoury; dev overlays and placed prefabs.

17. Short desktop and landscape title layouts clipped menu items or overlapped the footer. Added a compact title rule for viewports below 600 pixels high.

18. **Critical:** normal joining-player input actions were consumed locally without being forwarded to the host. The controller/keyboard action path now forwards actions, remote timed actions advance on the host, and player stance/seat flags travel in poses. The real co-op test now focuses the joining iframe and uses its keyboard to collect and deliver the case.

19. **Critical:** the opaque windshield blocked the forward driving view. Removed the opaque pane, aligned the roof with its pillars and replaced the solid steering disk with a ring. Nearby lamps/headlights now take precedence over distant fires in the light pool.

20. Accepting a contract could replace the newly opened buddy-twist sheet with the play screen. UI actions now leave queued events to the next simulation tick. A browser test accepts the real offer and chooses the twist.
21. **Critical:** an escaped radio convoy could leave its required contract permanently active. Escapes now fail the job for a sleep/reissue; the moving truck and its surviving driver supply the GPS target, and a destroyed truck skips the dead-driver conversation.

22. Fire damage could overwrite the charred death state with the fleeing state. Burning guards now stay fallen and charred; a regression test checks the state after an actual fire tick.
23. NPC shot events lacked combat feedback. Added distance/panned synthesized shots, muzzle flashes, shot counters in snapshots, and other-player shot/weapon rendering. A joining player now hears nearby fighting as the host does.

24. The monocular stored tags without displaying their markers. Tagged guards now show a visible marker in line of sight, including at scope distances, with a browser assertion against the rendered scene.

Testing tally: 24 confirmed product issues, including 7 game-breaking issues. No unresolved product issue is listed here. Environmental capture or memory failures and test harness corrections are not included in that tally.

Verified so far: WebGPU single-file boot, original AI Hub 2-seat harness, all survival/weapon/physics unit checks, deterministic replay, and 86% attract coverage. Full campaign and broader UI/hub checks in progress.

Final reports are recorded in `test-output/last-results.json`, `feature-coverage.json`, `attract-coverage.json`, the Hub reports and the serialized viewport reports.

A combined in-process test run retained the large simulation heap while launching browsers, triggering shared-machine memory kills. The single test command now isolates tiers in child processes and gives each Hub case a fresh page/context. The viewport tool is wrapped without modification to use one engine and page at a time. All 24 serialized viewport captures completed cleanly, including visible WebKit scenes.

Additional final verification covers mounted-gun ammunition, non-host keyboard case delivery, remote player damage/stance, visible reinforcement trucks and active field buddies.

Final test infrastructure uses fresh browser processes for Hub cases and waits for available RAM before loading multiple copies. Missing child-process reports cannot be mistaken for a previous tier result. Animation mixers use elapsed render time rather than a hardcoded frame duration.

Vehicle radio cycling now plays generated music or found dictations, and mounted-gun reload input is available on keyboard and pad. These were connected during the final controls pass.
