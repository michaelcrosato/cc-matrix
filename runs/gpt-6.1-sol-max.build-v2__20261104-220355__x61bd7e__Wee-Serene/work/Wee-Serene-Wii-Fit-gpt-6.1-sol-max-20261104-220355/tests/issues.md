# Issues caught and fixed during testing

1. Critical: Mocap sampling requires a clip object, not a clip name. Fixed the rig adapter.
2. Critical: Session options containing undefined fields replaced the contestants array and default duration. Filtered optional fields before constructing the context.
3. Gameplay: Laundry Line's compounded instability and gusts prevented skilled bots from finishing. Tuned default rope instability to 12 and gust strength to 4.5, with a harder second tier.
4. Gameplay: Tier 2 rail durations did not allow the planned rep counts. Added designer-owned durations for 12/10/12 reps.

5. Visual/gameplay: Road and Mode 7 overlays hid the player rigs. Drew the rigs in the overlay pass after the course.
6. UI: A nonmodal dialogue survived a scene jump. Closed it on transitions.
7. Input: The developer dock read a nonexistent key set. Corrected it to the engine's held-key set.
8. Required feature: Idle detection treated anyPressed as a property instead of calling it, preventing attract mode from starting. Corrected both input checks.
9. Balance: Single-sine bot noise missed the plan's Candle benchmark. Used the specified seeded smooth-noise generator for bot errors.
10. Presentation: Early WebKit matrix screenshots still showed the warming-up splash after the game had entered its first scene. The screenshot test now waits for the splash to clear before stopping the loop.
11. Readability: Instructions and result details crossed decorative props and low-contrast sea colors. Added bright panels behind the text.
12. Multiplayer presentation: World overlays also covered remote jog/slalom rigs. Drew those ghosts in the correct pass and transmitted actual exercise phases.
13. Input: Developer navigation shared WASD and lost category/page actions under the Class input map. Added a temporary developer map with dedicated arrows, Enter, Escape, Tab and pad bindings; the original map is restored on close.
