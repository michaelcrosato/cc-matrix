# Observed verification issues

1. Critical — initial full-sortie bot caught the ground collision threshold intersecting the assisted takeoff height. Fixed the aircraft clearance against the modeled ground instead of an absolute 14 m floor. Regression: takeoff and full sortie.
2. Critical — native bloom/postprocessing hid all procedural pen geometry under the WebGL fallback. Disabled bloom; native direct rendering works and remains the visual foundation.
3. Major — flak danger radius exceeded attainable displacement during the warning interval. Tuned to 42 m for the heavy-aircraft response and added an evasion controller to verification.
4. Major — inspection confirmed native `_render` omitted the camera foreground in split screen. The local extension now draws the rebuilt foreground under the active viewport and restores the renderer's previous auto-clear setting.
5. Major — native scene entry resets split view. Moved split setup to the gameplay scene's enter hook.
6. Major — a stationary pointer could move new pause-menu focus away from Resume, interfering with the pausing player's controller. Hover now requires recent deliberate pointer motion; native focus stays with the pause owner.
7. Moderate — a controller removed before a new sortie could trigger a stale disconnect pause on the first gameplay tick. Refreshing device state before scene entry fixes that transition.
8. Moderate — touch context actions refreshed on a quarter-second cadence, sometimes lagging a station transfer. They now refresh immediately when the authoritative station changes.
9. Major — the attract controller's extra authored bank override displaced its bomb approach and could return before showcasing release. Removed that override and drive the full sortie through the common controller; cosmetic engine damage is applied only after the primary strike.
10. Major — a pilot handover could leave both players viewing the pilot seat, even though only one owned it. The handover now releases and swaps both occupied seats atomically; regression asserts unique stations.
11. Major — aircraft-local roll signs disagreed with the native pen's right-side-down frame. Unified the transform with the engine convention and added a frame regression check.
12. Moderate — fixed-resolution captions were too small in the phone screenshot. Touch now has a concise readable DOM status/caption layer and contextual actions while retaining the same simulation and sights.
13. Moderate — Firefox without graphics support failed during dependency evaluation before the game's renderer error handler could run. The packaged HTML now checks capabilities before evaluating the 3D bundle and shows a useful unsupported-browser screen.
14. Major — a guest could end with the last periodic state rather than the authoritative terminal state. The host now sends a reliable final result/state before reporting to Hub, with a short bounded delivery lead.
15. Moderate — the initial exterior timer could hide a newly selected station. Quick selection, touch station choice and dev mission jumps now end that reveal immediately.
16. Moderate — the runway shared a plane with the terrain, creating visible striping. Raised the runway surface slightly to remove the coplanar overlap.
17. Moderate — the briefing forecast retained the earlier travel distance after the operating area grew. It now sums the authored route and home leg and includes launch/recovery allowance; the final package check compares offered loadouts and routes.
18. Moderate — immediately aborting through the pause menu used the early-safe-return headline before the aircraft had recovered. Immediate abort now has its own headline and never claims the crew-home bonus; the final package test checks that distinction.

Test harness corrections (not game defects): isolated combat tests accidentally enabled authored waves; a score test mistook newly destroyed neighboring components for double-scoring; the initial headless wrapper omitted native draw(); a UI bot held the flight-down action while choosing map destinations; a selector matched both native Back controls; a guest driver pressed doors before its station snapshot arrived; a synchronous accelerated Hub driver batched postMessages at the bridge. The driver now yields while the same native simulation advances, waits for visible station state, and asserts the harness completion flag.
