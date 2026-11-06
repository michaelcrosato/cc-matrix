# Authoring a night garden

`stages.js` is the campaign's complete, renderer-independent content table. Load it before `src/sim.js`. A stage is an object with a unique `id`, readable `title`, short `subtitle`, one contextual `lesson`, environment index, palette, bounds, rectangular obstacles, entrance cells, a required target schedule and rival pressure rules.

The world is always 384 × 240 units; one native engine tile is 16 units. Coordinates are overhead ground coordinates. An obstacle's `x,y` is its top-left corner and `w,h` its solid footprint. Entities and husks use centroid `x,y` and radius `r`. Scenery never supplies collision. Keep a four-unit outer margin and an open route from every entrance to the bottom-centre checkpoint.

Each target schedule entry specifies `at` in encounter seconds, `type` (`left`, `right` or `bell`) and `entrance` index, or explicit `x,y,dir`. Direction 0 is east, 1 south, 2 west, 3 north. Entries must be sorted by `at`. Paired arrivals make small pursuit decisions while later arrivals sustain the composition. The final scheduled arrival sets a natural lower bound on duration; no unannounced timer or mandatory stall rule exists. Target families turn left or right preferentially at obstacles, with a deterministic opposite-turn and reverse fallback.

Rival rules specify `first`, `interval`, `cap`, `guardAt`, `huntAt` and hunter `speed`. All times are in seconds and speed in world units per second. Rival cells visibly warn for 1.15 seconds by default and defer release whenever a player occupies the immediate entrance. Scouts drift, guards orbit nearby quarry, and hunters use bounded turns and a small movement prediction. Pressure increases modestly with encounter time, rather than adding an unlimited flood.

The final encounter contains the oversized `bell` archetype. Its circuit is part of the simulation's small boss routine: move, expose core, wind up a pulse. A pulse pushes nearby friendly centroids along legal movement paths without removing bees. The core keeps accumulated wounds while its shell closes so multiple ordinary sting openings can finish it. Two living seats scale ordinary health to 155%, boss health to 600 (versus 430) and add at most one rival, preserving readable lanes.

Run `NightSim.validateContent()` after editing. It rejects missing or duplicate IDs, unsupported types, absent/unsorted schedules, invalid bounds, bad rival rules, blocked entrances, impossible footprints and disconnected full-swarm Focus navigation. `node tools/test.mjs` is the complete quiet verification command; the simulation group includes normal-input campaign runs for solo and co-op.

# Simulation and deterministic order

The native engine calls `NightSim.step(world, actions, 1/120)` at its fixed cadence. Creation and snapshots have no DOM/audio/transport dependencies. `create({seed,players,stage,tuning})` constructs the authority; `snapshot()` and `restore()` are JSON-safe. Event IDs remain monotonic across encounter transitions, and restoration removes stale audiovisual events.

Actions are `{x,y,focus,ray}`. Axes are finite, clamped and diagonal-normalized. `focus` is held. `ray` is a monotonically increasing press counter: an already observed press is never applied again, and a repeated empty press produces a dry sound without movement interruption. Transport ownership/sequence checks are outside the simulation.

Every 120 Hz tick uses this fixed order:

1. Validate actions and spend ray charges; a ray destroys eligible rival swarms anywhere along its row, including warning cells.
2. Move friendly swarms using the authoritative formation and surviving-bee radius.
3. Move quarry and rivals; mature rivals and advance the boss routine.
4. Apply a single shared per-player damage grace, then sustained sting contact and delayed recovery.
5. Resolve target deaths by stable entity ID, award points once, establish fixed husk collision, then allocate at most one nonstacking charge per death.
6. Process scheduled arrivals and bounded rival entrances.
7. Resolve all-player defeat or encounter completion, survivor bonus and perfect streak exactly once.

A same-tick input spends its old charge before a kill refills it. Contributors are measured since the quarry last recovered fully. An empty living contributor with greatest damage receives the refill, ties use stable player ID; otherwise the living teammate empty longest receives it. A fully charged team discards the refill.

Husks normally retain the kill position. The authority tests the complete Focus navigation grid first; a choke-threatening shell settles at a deterministic adjacent location. In congestion it searches the nearest safe adjacent footprint and emits a settle event; every prior shell remains solid for the rest of the encounter. Players overlapping a newly settled shell receive a deterministic shortest legal nudge with brief grace; unattended quarry can visibly nudge after hesitation. Required quarry never silently teleports during an active sting.

The `result` phase awaits `next(world)`. The last encounter enters `won` directly. `retry(world)` restores the encounter checkpoint and permanently marks the run assisted. Developer tuning, including Reset, also marks assistance; a new campaign is the way to create a new clean run. Couch joining occurs at an opening or encounter boundary. A departed player becomes an inert observer and does not block the surviving player's completion.

# Tuning and inspection

`NightSim.tuningDefs` supplies labels, units, min/max/step and defaults for the native Developer sliders: movement, Focus speed, sting strength, quarry health, Focus concentration, recovery delay/rate, bee-loss grace, ray width, entrance warning, hunter speed, maturation and rival interval. `setTuning` rejects non-finite values and clamps every exposed range. A health edit affects newly spawned quarry; existing health stays coherent.

The pause Developer screen also provides stage selection/restart, seed regeneration, single-step/time scale, invulnerability, charge refill, rival spawn and collision/state inspection. Network gameplay modification belongs to the host and must be disabled by the Hub adapter during a Hub round. A developer snapshot is a complete JSON authority suitable for reproduction.

`NightSim.bot(world,id)` returns ordinary validated actions. It uses nearby threat rows, charge economy, target wounds and grid navigation; it cannot mutate health, positions, score, charge or encounter completion. Attract may separately grant presentation-only assistance. The principal simulation proof keeps every default and runs the same bot through all six stages without cheats.
