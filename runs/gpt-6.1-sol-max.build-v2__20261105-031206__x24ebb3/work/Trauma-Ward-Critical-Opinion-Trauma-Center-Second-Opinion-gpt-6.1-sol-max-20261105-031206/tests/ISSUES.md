# Issues caught during verification

The counts in the exit interview use distinct root causes, not repeated instances of the same model or assertion. Updated as tests progress.

1. Bot changed targets halfway through a wound path, preventing triage progress. Fixed by keeping the active work target. Game breaking.
2. Bot repeatedly activated the transplant's forced rewind after the first successful use. Fixed by respecting the completed teaching flag. Game breaking.
3. Build-time archive comparison exceeded Node's default subprocess output buffer. Fixed with an explicit archive-sized buffer. Packaging blocker.
4. The stage omitted the engine's required cameraTarget hook. Fixed with a reusable vector. Game breaking at engine boot.
5. Hospital figure feet extended below the ground. Fixed the rig origin and shoe placement. Visual issue.
6. Model contact sheets found floating portrait details, thin details and coplanar colored faces. Adjusted attachment, thickness, and face offsets; all 21 models now have no geometry problems. Visual issue.
7. Off-guide Scalpel damage accumulated then reset each frame. Fixed the work/dry-timer interaction. Rule enforcement issue.
8. Attract exit left the initiating input queued, advancing from Title to Main. Fixed activity detection and swallowing input until neutral. UX issue.
9. Couch pad index 0 was treated as a missing source, so both seats followed the last active pad. Fixed nullish fallback. Multiplayer breaking.
10. Heart mouse picking used too few fixed-point iterations at a steep edge. Replaced with a bounded surface root solve. Precision interaction issue.

The first cross-browser test also had an incorrect device profile spelling (`mini` versus `Mini`), which silently created a desktop context. Corrected the test setup; this is not counted as a game defect.

11. WebKit phone emulation reported a coarse pointer with zero maxTouchPoints. Touch detection now recognizes that combination and shows the required gate.
12. Unused hand groups received null visibility, which the renderer treated as visible. They now receive a strict boolean; the browser checks only joined seats render.
13. The surgical HUD had low contrast, a cropped dose label, and narrow-device clutter. Corrected texture color space, anchored the tool card, moved stage data into the top strip, and simplified gated views.
14. The OR table obscured portrait faces. Portraits now stand in front of the set geometry.
15. Pause/settings drew a second HUD underneath the menu. Removed that overlay so menu text and prompts remain clear.

All sixteen issues are resolved. The complete suite passed 183 checks; final wheel/drop regression checks additionally passed in their affected scopes.

16. A moving partner pad changed the global prompt device and stole mouse aiming from the keyboard seat. Desktop aiming now tracks its own device independently; a mixed mouse-and-pad browser regression passes. Multiplayer breaking.
