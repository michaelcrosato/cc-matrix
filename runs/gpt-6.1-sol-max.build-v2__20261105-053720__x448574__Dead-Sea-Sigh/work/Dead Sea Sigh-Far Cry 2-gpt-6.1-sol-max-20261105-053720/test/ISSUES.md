# Testing issues
Record confirmed defects caught by tests below, including severity and fix.

1. Gameplay: soldier head art exceeded collision capsule; raised soldier capsule to match the visible head so aimed headshots connect. Noncritical.
2. Traversal review: dam stair ended outside the top walkway; added a connected landing and native ladder/mantle traversal. Critical progression defect fixed before final testing.

3. Aim validation: recoil changed the shot direction before casting, causing single-shot weapons to shoot above the aimed point (especially rockets). Recoil now applies after the cast. Critical combat/progression defect.
4. Network review: clients were spreading their own fire and kept enemies omitted from new snapshots; clients now apply host ignition events and remove missing enemies. Critical shared-world consistency defect.
5. Network review: player seat 0 and the host hero were skipped by PvP ray damage. Fixed explicit remote-id checks and host damage dispatch. Critical multiplayer combat defect.
6. Audio review: simulation-only tests could schedule real voice/pluck nodes while muted; respect mute before scheduling generated audio. Noncritical resource issue. Browser processes were also terminated by shared-machine memory pressure; those environmental terminations are not counted as game defects.

7. World inspection: the new step loop did not call the retained scatter streamer, leaving terrain without thorn/bottle trees. Restored streaming and charred replacements. Noncritical art/collision defect.
8. New-game review: cleared post flags survived a new campaign reset. Reset post states before applying any saved state. Noncritical persistence defect.

9. Controller review: D-pad navigation was absent on menus and right-stick vertical aim was reversed. Added menu direction bindings, isolated FPS movement to the left stick, and corrected vertical aim. Critical controller usability defect.
10. Buddy choice review: medicine could silently become mercy after the last seconds elapsed. Medicine now becomes unavailable explicitly; mercy always requires selecting Mercy. Noncritical choice/UX defect.
11. Mouse choice review: any click selected the current ending. Added shared draw/hit coordinates and hover focus for every choice row. Noncritical menu input defect.

12. Alternate convoy plan: a repaired stolen truck was forced back to 18% health each tick, and its map target stayed at the convoy. Apply the initial damage once and point the objective to Red Steps. Critical alternate-contract progression defect.

13. Rendered screenshot test: civilian NPCs used a null weapon before the native pose solver read weapon hand placement, crashing the title draw. Pose with a valid hand-placement profile, then hide the gun. Critical rendered-boot defect. Added engine-caught error checks alongside browser page errors.

14. Visual inspection: held map/card was clipped below the screen and subtitles obscured its notes. Raised and reduced the paper, and hide duplicate subtitles while reading held objects. Noncritical readability defect.
15. Menu review: the shared camera captured the mouse on title clicks; disable pointer capture on menus and restore it in play. Noncritical input defect.
16. Idle-menu review: a paused Settings screen blocked title-scene attract timing. Added a wall-clock idle check that closes title menus and starts the reel, including on touch-only devices. Noncritical attract requirement defect.

17. Finale screenshot: the wheel view could face a control-house wall. Place the first-person wheel stance at the basin-facing opening and draw the physical wheel and helicopter; the flood is visible while the ending plays. Noncritical finale presentation defect.

18. Crash review: damage checked the speed after impact, so a wall stopping the vehicle could suppress damage. Use the previous approach speed, with a short impact cooldown. Noncritical vehicle damage defect.
19. Held-card review: left click fired a gun instead of activating a held shop/log/watch card. Click and Cross now act on the paper; jump is suppressed while using a held card. Noncritical input defect.

20. Firefox rendered boot: three r182 referenced missing WebGPU flag globals during import even on the WebGL path. Supply only absent standard flag constants before the module imports. Critical cross-browser boot defect. Firefox provides no headless WebGL context here; an isolated Xvfb attempt also failed because the shared X11 socket directory disallows listeners. Firefox simulation/replay is tested, with wide rendering checked in Chromium. Those environment limitations are not counted as game defects.

21. Buddy persistence visual check: the people renderer ignored the gone flag, and departing rescue actors remained drawn. Hide dead/deployed home NPCs, remove departed rescue actors, and leave a bottle at the empty chair. Noncritical visual persistence defect.
22. Shared-world AI review: soldiers evaluated only the host hero, leaving clients and dedicated-server players untargeted. Pick the nearest living network player and route remote damage through host events. Critical multiplayer AI defect.

23. Multiplayer action review: client melee and throwables bypassed host authority, and blast damage ignored remote players. Route melee/throw requests through the host and apply shared blast damage. Added rendered remote-melee and client-bottle replication checks. Critical multiplayer combat defect.

24. Dam traversal inspection: 20 m of the 46 m wall was buried, reducing the basin view, while NPC use ignored height and allowed talking from below. Raise the usable dam top to 46 m, extend the stairs/ladders, and require vertical proximity to NPCs. Noncritical geometry/interaction defect.

25. Non-cheating opening check: the nearby road post could join the two scripted ambushers, including while the player was restrained. Keep normal patrol streaming out of P0 and protect the bound ride/blackout. Added a real-ammo, real-jam, god-mode-off opening playthrough. Critical opening progression defect.

26. Determinism check: cosmetic plucked-note selection consumed the gameplay RNG when audio was active. Give music its own seeded random stream and compare identical jam/fire/reload sequences with sound muted and active. Noncritical reproducibility defect.

27. Controller About check: scrolling was updated only in scene updates, which stop while paused, and vertical stick scrolling was reversed. Move scrolling to the engine input hook, which runs while paused, and use the natural vertical direction. Noncritical controller UI defect.
