# Adding a maze

Add a version 1 stage object to src/content/stages.js. All stages use 21 × 17 rows of # walls and . floor; two hero spawns, twelve uniquely numbered f0–f11 foods (eight ordinary/four starred), three personality definitions inside the centred pen, paired horizontal tunnels, gate and reveal presets, introduction/clear copy, seed and stable ID. The existing authored corridor segment lists are editable data, not AI branches.

Keep the 5 × 5 permanent pen at x8–12/y6–10, its 3 × 3 interior, four possible door cells, and an exterior connected ring. The door is a graph state, never a decorative-only wall. Set gate.turning to introduce rotations. Reveal kind is none, all, or bands; the latter fades only upper/lower sections. Predators have data-driven release times and speed multipliers.

M.validate reports actionable errors and cells: dimensions/types, boundaries, paired tunnel rows, food identity/type counts, distinct spawns, permanent pen, three roles, safe two-exit pockets, all-orientation reachability and at least six interception loops. Do not bypass it. Test a new board with legal-intent Bot and ordinary lives/speed, then use actual controls and view its last-three-food phase.

The Maze workshop exports {format:"mix-up-maze",version:1,board:...}. Import uses the same validator and retains the existing maze on error. Saves use a versioned profile with three slots; native engine settings have their own versioned schema. Invalid/unavailable storage falls back to visit memory with a notice.

Custom shapes/materials live in view/theatre.js and extend E.SHAPES/E.MATERIALS. Creatures derive from E.Blob; their authoritative states drive their look, feet, squash, mouths and tells. Audio data/instruments live in audio/sound.js. Neither art nor audio draws gameplay randomness.

Build with npm run build. Test with npm test; targeted iterations use node tools/test.mjs --unit, --browser, or --hub. Open the HTML beside the development directory directly. No runtime resource fetches or CDN dependencies are required.
