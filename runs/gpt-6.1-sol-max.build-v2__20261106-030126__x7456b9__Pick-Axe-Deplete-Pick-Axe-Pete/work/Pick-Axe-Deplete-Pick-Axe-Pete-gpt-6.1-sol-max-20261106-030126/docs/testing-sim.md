# Deterministic simulation verification

`tests/sim.test.mjs` exports `async runSimulationTests() -> {count, failures}`. It emits no successful output; the aggregate `node tools/verify.mjs` command owns the final count and failure reporting. Assertion messages include the scenario, seed/route or relevant native state.

Coverage comprises 67 deterministic cases:

- Authored map ID validation, top-first row conversion, native foot contact, acceleration, valid falls and bottom safety recovery.
- Native coyote acceptance and expiry, canonical jump buffering across landing, held/tapped jump height, crouch clearance, ladder ascent, jump dismount, contextual descent, changing ladder facing, expiry grace and floor restoration, and the complete temporary ladder state cycle.
- Every tier of every chamber reachable using native canonical movement while all temporary ladders are unavailable.
- Swing misses, per-swing deduplication, three-contact heavy ore, high/low redirects, contact grace, recovery-phase rejection and the final tool hit breaking exactly once.
- Documented collision order: action before damage; rock pairs before damage; damage before pickups; and identical break/collision/pickup events from the same restored initial state.
- Damage invulnerability, one award per pair/entity/evade, no idle evade farming, shared resource contention, one progression key, carrier departure and deterministic key recovery.
- Seeded reward-deck and RNG reproducibility, bounded key/pick recovery at default and minimum/maximum live tuning values, ignored/expired resources, three minutes unarmed, and supply recovery while an armed partner camps.
- Door walking versus explicit keyless interaction, escapable jam, bounded pressure, transition protection and calm chamber entry.
- Failure/retry checkpoint score/defaults, duplicate reward rejection, terminal wipe, local join ownership/window, duplicate-seat rejection, sustained rescue and its live timing slider, and paid doorway revival.
- Strict snapshot equality with one miner mid-jump and another mid-ladder, subsequent events and twenty subsequent random draws.
- All tuning range validation/reset, immediate native movement application, and next-action/supply/cycle scheduling.
- Fifteen complete normal-input solo expeditions: routes 0/1/2 crossed with seeds 73082, 73083, 73084, 1 and 12345.
- Three complete simultaneous co-op expeditions, one per route.

Full expeditions use only `P.Pilot.intent()` into `P.Mine.step()`: no state writes, developer flag, invulnerability cheat, attract flag, teleports, resource grants or test completion switch. Assertions require movement vocabulary, keyless jam, ordered `break → pick → key → door`, both redirect arcs, collisions, three caught keys, three selected doors, all three extraction waves and a terminal victory with deadline margin. Baseline seed 73082 additionally requires at least one collision involving a deliberately redirected rock on every route. The varied-seed runs require real collisions but do not require a particular random collision trajectory.

Unit cases may establish initial positions, contacts, health or inventory to isolate a rule. Only the extended negative fairness scenarios use `god=true`, allowing resource starvation/expiry to be observed for minutes without unrelated damage ending the fixture. These are separate from the normal expedition evidence.

## Defects found by these checks

1. **Checkpoint retry charged the doorway revive fee.** A solo failure at checkpoint score 100 with 30 unbanked points retried at 85 instead of 100. `retry()` reused `loadRoom()` while the miner was down, so it applied the 15-point partner-hauling fee intended for a successful doorway transition. Fixed by calling `loadRoom(cp.chamber, true)` during retry, preserving checkpoint defaults without the doorway fee. The strict regression now passes.
2. **Joining could duplicate an existing seat ID.** The public join boundary accepted an already active player ID, creating ambiguous entity ownership. Fixed by rejecting an ID already in the active roster. The regression proves rejection without changing the existing miner.

Neither assertion was relaxed. Incorrect early fixture assumptions (walking the dismounting miner into the next gap; running past the heavy rock) were corrected as test setup, and are not counted as game defects. The extra-seed collision requirement was narrowed to what it actually proves: all 15 complete, while baseline all-route scripts also prove deliberate collision rewards.

Final native result after both fixes: **67/67 cases passed**, as rerun by the root agent with zero failures. No game-code changes followed this result during this test investigation. Native state checks cannot establish rendered hitbox alignment, TV legibility, touch/controller hardware feel or listening quality; browser/audio/harness evidence remains separate.
