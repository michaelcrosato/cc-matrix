# Verification issue ledger

Product issues: entries 1–9 and 16. Test/pilot issues: entries 10–15. All are repaired in the release.

Product issues found and repaired:

1. **Critical:** the imported engine left `_booting` true after `boot:false`, silently deferring every scene change. The browser title could create a World but never enter play. Fixed one upstream branch; regression assertions check both the flag and actual scene.
2. Native title padding plus TV scaling wrapped the title too narrowly and clipped its last actions. Corrected composition; viewport assertions and a TV screenshot cover it.
3. `vh` modal sizing was applied inside a scaled shell, making long balance screens impossible to scroll fully into view. Restored sizing relative to the native shell’s available height.
4. Mouse aim read renderer dimensions after a resize, so input mapping depended on whether a frame had drawn. It now reads current screen dimensions; the wide/letterbox test checks the actual direction.
5. Raw pointer-idle detection depended on `movementX/Y`, missing activity on some browser-generated pointer events. It now compares client positions; attract pointer cancellation is tested.
6. The first touch composition retained a desktop HUD. It now leaves the menu, a brief hint/warning and the contextual siege action, keeping invisible sticks clear.
7. An online local menu was immediately closed by clearing `game.paused`, despite the engine’s supported live-menu mode. It now keeps the native local pause state and lets the host timer continue the world.
8. A failed send could be retried on every host-timer pulse. Retries now share the 100 ms input/snapshot cadence; instrumentation measures sent bytes, unreliable packet size and messages in a rolling second.
9. Ordinary shots vanished on an immune core without sufficient impact feedback. A cool chip burst and short SIEGE ONLY / AIRBORNE ONLY response now communicate it.

Test/pilot issues found and repaired:

10. A Python helper named inspect.py shadowed Python’s inspect module. Renamed it.
11. Synthetic touch pointer IDs are not browser-owned IDs, so setPointerCapture correctly rejected them. Replaced the test input with real Chromium CDP multitouch events.
12. Some visual fixtures stepped simulation without requesting a browser draw, or captured a native fade before it finished. They now draw explicitly and finish screenshot animations. WebKit waits for semantic movement instead of assuming wall time equals simulated time.
13. The initial ordinary-action pilot attempted late Swirl interception too near the core. It now stages farther left and evades its locked lane.
14. The remote pilot used the solo pilot’s exact alignment threshold against delayed state, making it oscillate without calling the cannon. The final remote pilot uses a tolerance within the physical core/projectile geometry and an input timer independent of drawing; the release asserts an ordinary-action full campaign at baseline latency, and two-player loss/jitter conformance separately. Stochastic combat pilots can lose valid rounds; the earlier two-client stress victory is development evidence, not a universal balance claim.

The final feedback counts will distinguish product defects from test/pilot defects. No resource or victory is granted to make the ordinary-action campaign pass. Attract-only invulnerability is declared and excluded from balance evidence.

15. The first interview-schema assertion expected sixteen source fields, but TASK.md defines fifteen. The test now compares the exact key list instead of a guessed count.

16. Mixed-device local co-op reused the first scout’s siege label and could retain the previous pad assignment state across a mode change. Each scout now gets its own device label; explicit reassignment clears prior pad state. A pad-plus-keyboard regression check covers it.
