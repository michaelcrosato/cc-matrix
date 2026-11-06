# Content authoring

`src/data/content.js` is the canonical data source. It defines a fixed arena, defaults, enemy family values, four sector palettes/motifs, formations, stable encounter IDs, spawn timelines and boss phases. No gameplay position is derived from canvas dimensions.

To add a situation:

1. Add a formation: an array of [dx,dy] offsets in world units. Keep each component within ±400. Use a lowercase stable name.
2. Add an encounter with unique id, name, learning sentence, sector 0–3 and `spawns`. Each spawn has `at` seconds, formation, kind, x/y anchor, and optional merge/forcedMerge/lane/speed flags. Spawn coordinates must be 30..930 and 30..510. Normal deployments enter through telegraphed edge gates. No straggler is silently removed; old drifters steer back into the fight.
3. Assign one of the four sector motifs. Add art/palette records and corresponding native backdrop art to extend that vocabulary. Keep the command encounter last, with `boss:true`; exactly one boss encounter ends a mission.
4. Pause → Dev Mode → Encounter & timeline. Select an encounter and jump. The run is visibly unranked. Timeline scrub rewinds the selected encounter and simulates neutral input with invulnerability; single-step advances one 1/120-second frame. Resume to fly it using real combat.
5. Content JSON editor exports/imports `{version:1,formations,mission}`. Paste/edit JSON or select an exported file, then Validate & apply. A readable toast explains invalid data and retains the working configuration. A valid apply restarts the current encounter. File import/export remains standalone only.
6. Run `npm test` after changing covered source/data. The deterministic whole-mission scenario uses legal move/aim/fire through the actual native clock and collisions. Extend the milestone assertions for new mechanics.

The Flight Lab also exposes invulnerability, refill, formation/hunter/gunship spawn, clear, phase jumps, encounter restart, seed reset, slow/normal/fast world time, collision/aim overlays, JSON snapshot plus changed-input replay export, and three readable slider pages. Sliders show values and ranges through native controls; per-page and all-default resets are functional. Lowering boss health clamps living components without reviving destroyed emitters. Attract always constructs a separate canonical configuration. Hub lab access is diagnostic only; authority-changing commands reject session use.
