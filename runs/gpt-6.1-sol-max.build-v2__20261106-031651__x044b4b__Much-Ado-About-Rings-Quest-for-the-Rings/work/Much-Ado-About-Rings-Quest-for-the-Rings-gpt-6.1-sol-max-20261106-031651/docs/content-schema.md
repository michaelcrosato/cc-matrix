# Authoring another labyrinth

Add a site to `MA.SITES` and two definitions to `MA.ROOMS` in `src/content/content.js`. A site names its family, two room IDs, board position, ring rune, hazard/monster preview, shortcut and lore. Required destinations use `World.reachable()`; optional reward sites are single-use. Neither classes nor cache rewards gate mandatory travel.

The `room(id, spec)` authoring helper takes tile coordinates, with each tile equal to 16 world units. It expands coordinates to world positions and produces the data consumed by both renderer and simulation:

- `w`, `h`: room size, default 31 by 23. The helper encloses every room in an unphaseable exterior.
- `walls`: inclusive `[x,y,x2,y2]` rectangles, phaseable stone or crystal according to family. `hiddenWalls` marks selected crystal ribs in mixed-family rooms.
- `lava`, `bridges`: inclusive rectangles; lava blocks all hero classes. Bridges carve normal safe stone before hidden geometry is added.
- `spawns`: two safe entry cells. Optional `shortcutSpawns` names two inner waystones unlocked by a specific recovered seal; they do not skip a room. `fallback` derives from the first. Ring recovery and phase re-entry resolve to verified safe cells.
- `exit`: lit arch. Room one crosses onward; room two requires carrying its `ring` back to the arch. Completion has one authoritative transaction.
- `shifts`: pairs of alternate inclusive wall rectangles. Both states must preserve an ordinary route. A two-second arrow warning precedes movement; overlap resolves safely.
- `hazards`: `[x,y,x2,y2,offset]` flame rectangles. The live telegraph registry controls warning length. Each lane has an 8.5-second cycle and a 1.1-second active window.
- `enemies`: `[kind,x,y]` budget entries: fighter, fire, spider, nightmare, dragon. Additional director events use a finite room budget, separated random streams and safe spawn-distance checks.
- `props`: `[kind,x,y,z]` entries. Large solid props block the same tile in normal and phase navigation; decorative props remain nonblocking. Their visual placement and collision use the same definition.
- `cache` and optional `rescue`: a single-use well or hold-to-rescue challenge, followed by return to the arch.
- `stations`: four binding cells in the final sanctum. They become available after the seven-second learning beat. A wipe resets station progress while retaining campaign rings.
- `teaching`, `text`, `family`, `site`, `index`: director grace, contextual instruction, palette/geometry family, site ownership and first/second-room semantics.

Generated definitions also carry phase tags, reveal timing, camera limits, navigation regions/waypoints and fallback data. The renderer never changes collision or objective state. The companion uses the same navigation and movement contract; hazards and shifts invalidate its route as needed.

Preview via Pause → Dev Mode → authored-room jump. Run `node tools/test.mjs sim` to validate both wall-shift states, all objective paths, safe spawns and all ten class combinations across every extraction at maximum Dread. Run `node tools/test.mjs visual` for the composition captures. Mutating a preview marks it assisted, so it cannot be confused with normal playthrough evidence.
