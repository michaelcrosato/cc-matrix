# Adding or editing a hotel floor

All authored level content lives in `src/content.js`. Five compact 21×13 floors share 16-unit native tiles and use five route compositions from four navigational grammars: the roof transforms the glasshouse with two evacuation cross-links. No rule code needs editing to author another floor.

A floor is `{id,name,subtitle,rows,quota,rooms,beetles,supply,homes,spawns,palette,decorations,tutorial,layout}`. `rows` contain `#` walls and `.` corridors. The `rowsFrom` authoring helper carves explicit cardinal polylines into walls; the resulting rows remain the common authority for rendering, collision, navigation, prediction and validation. `rooms`, `homes`, `spawns` and `supply` are cell coordinates. `beetles` hold `{cell,age}` presets. `decorations` are staging instructions placed away from navigable corridors.

The first mystery-room position is guaranteed to contain a baby. Set `quota` to the required rescue count; the remaining slots form a seeded shuffle containing exactly `quota-1` babies plus decoys. Hidden outcomes never change with approach, animation or reconnection. Do not make a decoy mandatory for completion. Keep several complete loops and at least two viable paths away from a pursuing tracker.

Place homes along the outer walkable edge. There must be at least two distinct reachable homes from every baby room; four homes provide cooperative choice and visual clarity. Avoid room/home/supply overlap. `spawns` need two distinct walkable positions with at least four graph steps from initial threats. Safe recovery also considers all authored home cells, with a deterministic safest-corridor fallback if threats occupy those candidates.

Use palettes with `bg,floor,floor2,wall,top,trim,accent,plant`. Native shaded tiles, rigs and hotel props consume these colors. Each floor should have one memorable prop accent and short tutorial text that teaches its route lesson. Keep detail on walls or stage margins so threats, doors and sanctuary symbols remain legible.

Call `TSS.validateContent()` during build/tests. Validation rejects disconnected walkable regions, blocked/out-of-range content, room conflicts, duplicate rooms/homes, missing cooperative slots, unreachable homes, unsafe initial spawns and impossible quotas. Campaign integration tests also exercise the actual native graph through uncheated legal inputs. Add the floor's quota to expected campaign totals when changing campaign length.

Balance is separate data: `DEFAULT_BALANCE` is immutable, `BALANCE_LIMITS` defines slider min/max/step, and simulations own their live copies. Every tuning mutation marks the run unranked. Later-floor difficulty comes primarily from composition and initial age presets rather than enemy speed increases.
