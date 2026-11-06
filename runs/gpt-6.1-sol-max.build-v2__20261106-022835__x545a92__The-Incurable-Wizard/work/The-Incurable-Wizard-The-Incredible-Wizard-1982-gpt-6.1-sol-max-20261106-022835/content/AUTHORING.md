# Authoring another chamber

Edit only the declarative descriptions/layouts/spawn data in `src/content.js` for ordinary content changes.

The board is 21×13 cells. `#` is stone, `.` is walkable floor, `B` is a solid shootable bell, and the two `P` mouths are at (0,6)/(20,6). Leave a reachable path between both entrances, the familiar's (10,1) start, all bell-adjacent cells, the center waypoint (10,6) and both gates. The verifier tests every walkable cell and scheduled spawn against the same authoritative Grid.

Each spawn has a family, earliest active Hunt time, minimum kill count (`after`), and legal warning cell. Budgets are finite. The final three obligations in each room are stronger replacements unlocked after specified kills. The director needs every obligation exhausted, including delayed warnings, before releasing the familiar. Spawn warnings grant about 0.9 seconds before contact becomes dangerous.

`intrusions` is 0, 1, or 3. Ordinary authored intrusions may leave after four missed windows. The final three manifestations are separate one-hit entities; they change firing rhythm, not hit points. The last floor's declared 5,000 bounty consumes its earned next multiplier only once.

A native tile is 16 world units. GridMover positions are cell coordinates; `IW.world(cell)` adds the half-cell center and scales by 16. Never store screen coordinates in gameplay. Cosmetic random state must not consume World.rand(). Bell lure uses legal path distance; visibility uses an unobstructed cardinal lane from either living player.

Run `node tools/verify.mjs --core` after content/balance changes. Rebuild and run `npm test` for integration or release. Native pause → Developer provides live sliders and room/encounter tools; changes mark Practice. Reset restores the clock, invulnerability and all balance overrides. Hub rounds expose only local diagnostics.
