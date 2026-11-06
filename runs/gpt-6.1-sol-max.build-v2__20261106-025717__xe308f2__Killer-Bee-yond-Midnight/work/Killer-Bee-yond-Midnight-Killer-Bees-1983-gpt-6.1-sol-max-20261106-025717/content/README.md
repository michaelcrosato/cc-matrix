# Authoring a garden bed

`stages.js` is the complete content source. There are six fixed 384 × 240 world-unit arenas (24 × 15 engine tiles). World x/y is ground, z is height; the view is exact `overhead`.

Each encounter supplies a unique `id`, display `name`, one of three `garden` palettes, short `lesson`/`hint`, bounds, rectangular solid obstacles, six entrance positions/directions, a timed target `schedule`, optional `coOpExtra` entries, rival rules and a finish condition. All target schedules are in seconds from encounter entry. Archetypes are `left` (copper Leftenant), `right` (jade Righto), and final-only `bell` (the Bellwether). The left and right families prefer opposite turns. Arrival warnings always precede contact.

Rival `first` and `interval` set spawn timing; `cap`, `guard`, `hunter`, and `speed` set pressure and maturation. `coOpInterval` and `coOpCap` explicitly scale two-player pressure; absent overrides use the interval and cap + 1. Co-op adds a few targets and modest shell health rather than doubling every number. Dead observers still belong to their team until the next checkpoint.

The concluding encounter adds a `boss` block with a fixed circuit, travel/exposure/pulse durations and health. The normal sting, recovery, ray, scoring and shell rules remain in use. The pulse pushes instead of damaging.

Run `node tools/test.mjs --group=sim` after content edits. Validation rejects blocked floor topology, invalid footprints, unknown archetypes, absent schedules and missing concluding targets. The 8-unit clearance lattice must remain connected. Gaps may reject Roam but must admit Focus. Shell placement tests decreasing footprints and visibly pushes an overlapping friendly swarm to a legal edge; targets hesitate before nudging out of congestion. Add scenery outside the authoritative collision footprints.

Pause → Developer tools provides stage selection and explicit restart, seed selection/regeneration, live tuning pages, single stepping, live preview, invulnerability, ray refill, rival spawning, collision/contact outlines, state labels and snapshot export. Seed/stage changes apply on restart. Gameplay modifications permanently mark that run assisted. Closing the workbench clears held input and restores time scale 1. Hub rounds expose read-only diagnostics; a standalone peer guest cannot modify authority.

Tune `TUNING_SPECS` for defaults, valid ranges, units and slider increments. `DEFAULT_TUNING` is derived from it. Do not put rule changes in the renderer. Art rigs react to simulation state and one-shot events; they never decide a hit, score or stage transition.
