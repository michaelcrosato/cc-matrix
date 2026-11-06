# Simulation verification

Actual run: `node tests/simulation.mjs` → **52 passed, 0 failed**. Details: `reports/simulation-tests.json`.

The complete expedition is exercised through sequenced production commands inside the real engine’s headless `E.Game.advance()` fixed-step lifecycle. No warps, tool grants, enemy kills, state loads, tuned stats, immortal flags or external ammunition are used. The director obtains all three tools, rings the mandatory bank gong, hits and evades the indestructible ooze, explores the optional caches, defeats the entire damageable roster, exploits the first guardian's flank, waits for each second-guardian recovery cycle, obtains both Crown halves and takes the real ladder to victory.

Perfect-knowledge sprint clear: **141.2667 simulation seconds**, 48 shots, 30 hits, 13 banks, 4 optional treasures, 3 recovered shafts, 0 deaths, 0 restarts, 0 damage, assisted false. This is a deterministic speedrun, not first-time human pacing evidence. Physical controller, human audio listening, mobile hardware, WAN/NAT and 18–25 minute first-play timing remain unverified by this subsystem.

## Defects actually found and fixed

- **SIM-001 · critical**: the authored Root Hollow entry corridor ended four cells before the vertical path, making the rest of the section unreachable. Content reachability validation caught this. Extended the explicit corridor through the junction.
- **SIM-002 · moderate**: room/reward and cross-wing prop IDs collided. Global stable-ID validation caught this. Renamed the conflicting room IDs and namespaced every compiled prop ID by section.
- **SIM-003 · moderate**: after adding physical low-bank collision, direct movement steering could aim through the diagonal bank and stall despite a valid route around it. The complete action replay exposed this. Added radius-aware move-clear queries and made navigation use passable cell centers around bank geometry; steering now routes around blockers.

- **SIM-004 · moderate**: final live-slider inspection found that supply yield was exposed but unused. Added remaining-base-unit scaling for authored supplies, live adjustment and reset, new-section/restart application, and separate recovered-shaft accounting in mixed spider stashes. Two regression cases verify real collection changes and ensure missed shafts never multiply.

- **SIM-005 · moderate**: final-artifact co-op play exposed a fractional start beside a thin bank whose cell center lay on the bevel. Grid pathfinding could route its first edge across the bank, while the reverse route could not reach the safe fractional goal. Added virtual start/goal anchors, radius-aware clearance on every edge and cached endpoint revalidation. Creature steering uses its actual collision radius and the first safe node. Regression covers exact reported positions in both directions, same-cell cache reuse across opposite bank sides, and a spider physically walking the route.

Two test-only driver defects were also fixed: center-point firing clearance at a wall corner, and one undefined test constant. These are not counted as shipped gameplay defects. The most helpful test was the complete command expedition plus authored graph validation: it exposed actual progression blockers. The least helpful exploratory run was a long replay allowed to continue after a repeated stuck position; the focused reproduction gave the same result much faster.

## Known practical bounds

Snapshot JSON measured under the Hub's 16KB cap in the complete replay; checkpoint/history is never sent with each dynamic snapshot. Engine lifecycle supplies the one fixed simulation clock. Gameplay drawing consumes no simulation randomness or state. Authority/source transport checks are performed by the application/network owners in separate suites.
