# Fixed issue ledger

Eight distinct defects were found by automated or visual testing:

1. Native `start({boot:false})` left the upstream engine's booting flag active, so requested scenes never entered. **Critical.** Start with ordinary native scenes and omit that option; engine stays unmodified. Actual file:// start/play and Hub traffic prove the correction.
2. An arena background queued as an overlay obscured actors. Use native floor decals so actors remain bright above it. Visual screenshot review.
3. Content validation rejected an authored pincer's spacing. Align the documented range with legitimate formations. Canonical deck validation.
4. Projectile cleanup preceded swept collision, dropping a very fast crossing hit. Resolve swept collisions first. High-speed segment scenario.
5. Drifters recomputed their original velocity and stuck to rails. Retain reflected velocity. Boundary scenario and full missions.
6. Dev spawning discarded explicit speed. Carry it into the spawned actor. Spawn scenario.
7. Quick fire press/release between fixed updates was lost by held-only input polling. Accept native pressed OR down. Split-keyboard quick-tap browser regression.

8. A quick guest fire press fell between 10 Hz intent packets and never reached the host. Retain it until a successful send, clear on overlay/end, and test exactly one actual host shot plus failed-send retry.

Additional corrections came from integration review and received regression coverage:

- Set native `game.live` as well as its options field for Hub overlays. **Critical:** a local pause could otherwise freeze authority.
- Normalize remote aim vectors while retaining bearing, rather than clamping their axes independently.
- Map a guest's first local device to its assigned world pilot, including mouse and touch aiming.
- Guard audio scene/unlock calls after Hub end so ended audio cannot restart.
- Attempt audio unlock from meaningful gamepad input, with idempotent gesture handling.
- Clamp existing boss component health on balance reset, using the same policy as a live slider change.
- Stop showing rescue cues for a departed, inactive pilot.
- Keep the predicted shield exposed while held fire awaits acknowledgement.
- Measure Unicode snapshot fragments in encoded bytes when enforcing protocol limits.
- Clear custom invisible-stick contacts when a menu opens so releasing a finger while paused cannot leave stale movement or firing.

Two critical defects in total were corrected. A source setup-script typo and corrected test-selector, canonical mode-name, and viewport-shape assumptions are not counted as game defects.

The final presentation integration also connects procedural dispatcher voices to short readable subtitles in the native HUD.
