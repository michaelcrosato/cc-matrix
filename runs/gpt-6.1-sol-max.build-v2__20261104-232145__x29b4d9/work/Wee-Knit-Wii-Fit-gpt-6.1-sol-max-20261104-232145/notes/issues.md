# Issues caught by testing

Counts refer to builder tests, not the planning document's prototypes.
- 01 [gameplay] Fruit inherited general prop damping, causing ballistic shots to land short. Set flight damping to zero; excluded spent fruit from recatching.
- 02 [flow] Floating-point accumulation left an event just short of its timer. Added a fixed-step epsilon to completion.
- 03 [critical input] Quick direction taps between physics polls were lost in menus. Direction inputs now latch key presses, matching the foot/confirm path.
- 04 [scoring] Still Water counted time in the calm zone twice, inflating form. Removed the duplicate accumulation.
- 05 [scoring] Tug calculated the winning form before its last score assignment. Result now derives directly from pulls won.
- 06 [gameplay] The plate bot switched target bands every tick and never replenished one. It now commits until the selected plate is healthy; pad stick deadzone is radial to preserve circles.
- 07 [gameplay] Grand Hold's target told the player to stop bracing as the gust began. Kept the brace target through the gust.
- 08 [input] Simulated players left the stick held on results menus. Clear the injected controller when the event ends.
- 09 [UI] Clicking a live slider applied both the pointer position and another increment. Pointer and confirm changes now each apply once.
- 10 [gameplay] Diagonal bot wishes exceeded the unit disc, exaggerating loaded leans. Normalize every balance wish in the physics core, including pad and bot paths.
- 11 [UI] Newly created HUDs reused a cached prompt device and displayed empty control hints. Invalidate prompt rendering when a HUD is built.
- 12 [visual] The title camera and sea hid the island's single-rock pivot. Lowered the sea for the island and framed its underside.
- 13 [gameplay] Tier 1 mixed too many heavy hazards into its teaching round. Reduced their frequency and mass; the bot now avoids urchins.
- 14 [input] Mouse hover made the island walker move because pointer lean was being reused as walking. Island mouse movement now only aims at hotspots; clicking walks there. Also corrected click-to-walk after orbiting the camera.
- 15 [input] A keyboard waking a touch-only title activated its old Settings button. Rebuild the title when a keyboard or controller becomes available.
- 16 [input] The circling finale camera made lean directions drift away from screen directions. Rotate both wishes and the Balance Disc with the camera.
- 17 [gameplay] Fruit basket colliders were 6 cm above the recipe, so fruit hit the back rim and knocked the doll instead of entering cleanly. Aligned the collider and drawn basket with the planned height.
- 18 [balance] Three-seed clumsy Still Water scores averaged below Adequate. Slightly enlarged its teaching-tier calm zone.
- 19 [critical physics] Spilled fruit stayed in the doll's collision lane on the floor, where it contacted the doll's feet and caused falls even with an empty hat. Spills now collide only with scenery, then retire after two seconds. Loaded fruit still uses real doll contacts.
- Diagnostic experiment (not counted): tried soft flight finishes and catch cushioning while isolating Fruit Hat instability. Kept a soft horizontal finish and cushioned first catch after measuring the integrated result. All fruit in the basket uses dynamic contacts and load.
- 20 [critical physics] Disabled fruit retained contacts and the hat behaved as though banked loads were still attached. Removing retired prop bodies and clearing references fixed the three-seed balance tests; never banking still spills. Reusable ragdoll colliders are also explicitly disabled.

- 21 [critical render] The ink scene pass updated only on its first node frame while the DOM and outer render counter kept changing. Use Three’s animation loop and draw TSL ink hulls with the cel surfaces in the native render traversal. Tests check actual scene renders and rendered scene changes. The art screenshots caught this.

- 22 [visual] The solo Room Service set drew four walkways with a gap at the player's position. Build the walkway count from lanes; face the guest and tray down the path.
- 23 [UI] The enlarged Balance Disc caption wrapped below the TV safe area. Keep it on one line and raise the disc and control hints.
- 24 [audio] Step Class inherited the Cardio track's fixed tempo. Match its music to the chart BPM and judge live play on the audio clock, with the deterministic simulation clock used by manual tests.
