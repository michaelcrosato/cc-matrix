# Authoring the next castle

All layouts and encounter budgets live in `src/content/content.js`. Rules live in `src/sim/sim.js`; rendering observes those rules in `src/view/view.js`. A room is a 25 × 19 tile ground plane at 16 world units per tile. Coordinates in definitions are converted from tile centers by `at(x,y)`.

| Symbol | Rule |
|---|---|
| `#` | Outer, unphaseable boundary |
| `w` | Interior stone; Phantom may phase through |
| `c` | Solid crystal, periodically and locally revealed; Phantom may phase through |
| `s` | Partition solid in shift state zero |
| `t` | Partition solid in shift state one |
| `~` | Lava; always blocks travel, including phase/cloak/dodge |
| `.` | Ordinary walkable floor |

Each room defines an id, name, family, rows, entry and fallback spawns, exit, optional ring, enemy spawns, authored hazard rectangles/timelines, prop placement, reveal cycle, shift period, navigation radius, camera bounds, teaching text, fiction, a finite enemy budget and permitted director events. A cache additionally sets `cache:true` and an immediate `heal` or `ward` reward. A finale supplies the four station positions.

Use the `layout()` helper’s explicit rectangle lists to construct interior walls, lava, crystal and both partition states. These are authored coordinates, not randomized layouts. Keep every objective reachable in both partition states without a class power. Crystal visibility affects feedback rather than collision. Lava boundaries are never phaseable. Hazard lanes have a warning, active interval and recovery period; do not put mandatory spawns inside an active lane.

Add a site to `sites` with its two room ids, ring index, name, token position, hazard/monster description and visible shortcut name. The mandatory opening unlocks the remaining connected roads. All other required castles remain available regardless of class or caches. The four recovered seals expose the finale. Site entry and a failed-room retry each charge exactly one capped Dread step; ordinary transitions and Continue do not charge.

The Ringmaster draws from room-appropriate events using a labeled deterministic stream and a finite per-room budget. It waits for a clear telegraph window, teaching grace and rescue recovery. `director.event` and `director.reason` make its decision inspectable. A possession echo copies a kit silhouette into a hostile projection while leaving player ownership untouched.

Ordinary movement uses the same `walkable`, circle radius, path and hazard helpers for human controls, companion behavior and test drivers. Interaction priority is revive, seal station, eligible exit, ring pickup, then willing pass. Objective commits increment the room epoch and emit stable event ids. Checkpoint data stores only safe transitions; it excludes live attacks and projectiles. The two cache rewards, four secured-ring flags, four final station flags and victory each have a single authority-owned source of truth.

Preview content from Pause → Dev Mode → Jump to authored room. Run `node tools/test.mjs simulation playthrough` after editing definitions. The validation checks both shift states, objective paths, spawn/fallback safety, room metadata and all ten unordered hero pairings. The complete normal input driver independently checks every castle completion, four unique ring events, four unique seal bindings, victory and unassisted state.
