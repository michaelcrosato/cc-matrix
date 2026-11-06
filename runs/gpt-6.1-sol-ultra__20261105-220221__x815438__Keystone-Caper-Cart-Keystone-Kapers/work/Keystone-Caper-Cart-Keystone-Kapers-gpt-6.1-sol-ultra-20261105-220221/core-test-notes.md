# Deterministic gameplay validation

Run `node core-test.mjs` for failures plus one total, or `node core-test.mjs --json` for `{checks, failures}` consumed by `test.py`. Tests load the exact Rapier 0.19.3 official npm compatibility build from `test-deps/rapier/rapier.mjs` and the actual `core.js`; no physics mocks are used. One browser is not needed.

31 checks pass. Coverage includes two independent officer bodies, world-floor collision, jump arc and landing, held-input latch, crouch collider resize and restore, physical radio/plane intersections, jumping and ducking clearances, time/badge penalties and invulnerability, all upward routes including the roof, open/closed lift boarding and arrival, loot uniqueness, cuff scoring, case transitions, timeout retry/loss, rooftop escape retry, attract protections, and a complete default-tuning three-case playthrough.

The whole-game script uses the normal hazard-avoidance AI and deliberately takes the centre lift on the finale's first floor, a strategic shortcut that the default chase AI does not select. It completes all three cases without cheats, with three badges remaining, 11 jumps, eight ducks, one lift ride, five escalators, six hazard hits, 19 recovered loot items, and three captures. It reaches the rooftop finale before winning.

Testing caught one critical issue: Rapier rigid-body descriptor methods were incorrectly named `setEnabledRotations` and `setEnabledTranslations`, preventing a game from starting. Root corrected these to `enabledRotations` and `enabledTranslations`. The complete suite passes after that fix. A first-frame test assertion for a manually moved kinematic plane was corrected to allow two physics steps for the sensor broadphase; that was a test setup issue, not another game bug.
