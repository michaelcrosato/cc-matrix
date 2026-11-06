# Deterministic simulation verification

Run `node tests/sim.test.mjs` from the development directory. It prints failures and one passing count only. The release runner imports `runSimTests()` and includes the same checks.

The suite loads the vendored full engine into a Node VM, then the actual content, simulation and canonical-input pilot. It does not replace native traversal or combat. It contains 30 substantive cases:

- A fourth authored room, configurable finale conditions and data-driven expedition end need no core changes.
- Unique room/ladder/door IDs; explicit top-first ASCII versus bottom-first cell conversion; every gap; safe ladder endpoints. SUN preserves authored gaps, MOON mirrors them, STAR staggers them; route palettes and bounce/heavy weightings differ. Real gold and collision events verify MOON’s richer gold and STAR’s larger collision score.
- Native coyote time, jump buffering, variable jump height, crouch height/stand recovery, safe drops and bottom safety-net recovery.
- Both permanent routes reach every tier in each chamber and each route; ladder jump dismount; occupied temporary ladder expiry grace.
- Native attack timing; one contact per swing; missed swings preserve tools; three-contact heavy ore; reinforced ore surviving unredirected collisions; final tool-break deduplication; high/low redirect arcs and grace.
- The exact same-tick order of final wear, rock-pair collision and fresh-pick collection.
- Pair/reward deduplication; deterministic reward deck; bounded replacement opportunity; complete unarmed recovery using ordinary canonical input and normal damage.
- Expired-key replacement, one active key, simultaneous collection scoring once, explicit door input, keyless jam and escape.
- Damage invulnerability, wipe, standalone checkpoint defaults, forfeited unbanked score, and rejected Hub retry.
- Separate local ownership, join limit, online join refusal, rescue, key recovery after carrier departure.
- Snapshot round trip with one miner mid-jump and the other mid-ladder, subsequent simulation/RNG/event identity, and every tuning clamp/default.
- Solo normal-input completion of each of three door routes, including a deliberate redirected-rock collision on every route; two simultaneous normal-input miners complete all three shared route variants. A regression case checks held evasive jumps and prioritizing a falling replacement over a rising key while unarmed.

The whole-expedition cases never set invulnerability, tool grants, keys, positions, director progress or completion. They begin in a fresh Sim with seed 99 and feed only the same canonical intents used by human adapters. They assert ordered chamber → chop → key → unlock → next chamber events, both escalation waves, the final key/door/victory, and an armed → broken → renewed tool circuit. A finish flag alone cannot pass. Fast-repeat successful times with the final distinct route layouts/patterns and improved normal pilot were 139.99 s (SUN, score 298, 1 helmet), 121.20 s (MOON, score 241, 3 helmets), and 182.67 s (STAR, score 463, 3 helmets). Solo SUN/MOON/STAR runs produced 11/6/6 genuine redirects, 3/1/3 tool breaks, 6/3/4 replacement collections and 4/1/1 deliberate ricochet collisions. All three two-player seed99 routes completed with active miners at extraction; the final suite includes the reinforced-heavy collision rule. Intermediate co-op timing figures are not used as final release measurements. These are skilled automated routes, not measured first-player pacing. The 15-minute Hub limit therefore has substantial simulation-time margin. Wall-clock Hub deadlines are checked separately by network/browser tests.

## Product defects caught and fixed

1. Native Platformer construction reset private coyote/jump-release fields during snapshot restoration. Preserving the serialized runtime fields after construction fixes midair continuation and deterministic state restoration. Critical: mandatory shared-world state could diverge after restore.
2. Reconstructing temporary ladders during restoration emitted fresh warning events and advanced event IDs. Silent reconstruction fixes repeated events and divergent subsequent event identities. Critical: canonical snapshot state and event identity were not reproducible.
3. Several temporary ladder tops ended inside authored gaps. Choosing clear endpoints fixes missing upper landings. Major, not critical: permanent routes already preserved progression.
4. The normal pilot released Jump one tick after takeoff, cutting its evasive and gap jumps. Sustaining `jumpHeld` while rising fixes competent native traversal without changing physics or granting assistance. Major, not critical: human input was already correct. The same review improved pick priority, safe unarmed waiting and timed high/low heavy/collision redirects. All ordinary pilot changes remain canonical input only; the separate kiosk staging is unchanged.

Two early test assertions were corrected rather than treated as product defects: the jam escape check allowed too little physical movement time, and feature ordering originally required all tool-recovery events before the first key although recovery can occur in a later chamber.

Normal-damage pilot runs can lose on some seeds/routes, as expected; there is no claim that the demonstration bot is unbeatable. No physical gamepad, phone, television or human listening test was possible. Rendering/input/Hub/audio integration require the browser suite in addition to this simulation proof.
