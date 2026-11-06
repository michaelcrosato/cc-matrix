# Distinct implementation issues found and fixed

Assertions repaired because the test itself was wrong are not counted as game defects.

1. **Critical:** build-time String.replace expanded dollar sequences inside the engine. The packaged engine failed to parse. Callback replacements now preserve script bytes/semantics.
2. Native map warnings for unregistered bell/gate characters. Added explicit legend tags.
3. Title typography and actions overflowed the 1080p frame. Corrected the native shell title sizing and padding.
4. **Critical:** two authored central walls occupied the familiar waypoint/spawn cell, which could trap an uncaught familiar. Validated and opened those cells; all rooms and spawn coordinates are now connected.
5. Bell reveal/lure timers stopped expiring outside Hunt. Moved their clocks into the phase-independent fixed step.
6. Developer modal height used viewport units inside the TV-scaled shell and could place Resume outside the viewport. Bounded it relative to its native shell and enabled internal scrolling.
7. Reassigning a previously active controller to a different couch seat could produce a false disconnect pause. Explicit device reassignment now resets the primary input's previous pad identity.
8. High-density portrait screens expanded the logical buffer too far, making the game and HUD unnecessarily small. Added the engine's portrait resolution override and verified both orientations.
9. Terminal network state could finish between periodic snapshots. Terminal snapshots now repeat and the host waits for peer acknowledgement before reporting a completed campaign, with a bounded fallback; time-up still reports immediately within grace.

10. Repeated encounter-tool actions grew the native menu stack. Tool actions now update their existing page, and an exhaustive developer-action test verifies stack stability and reset.

11. A portal arrival lock only cleared along the horizontal axis. It now clears after leaving the arrival area in either axis.
12. A player could walk into a Wizard warning before he materialized. The warning relocates and restarts if its destination becomes occupied.
13. Checkpoint validation accepted unknown creature families. It now rejects invalid family/queue/projectile schemas before simulation or rendering.

Headless pilot route mistakes, a test firing toward the outer wall, a TileMap.center array/object assumption, pre-draw screenshot state, and expected iframe count after host removal were test defects, not additional game issues.
