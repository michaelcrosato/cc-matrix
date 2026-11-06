# Simulation and event order

The world is always x=0..960, y=0..540. Native overhead projection fits this rectangle into the local screen and its inverse maps pointer aim. Device dimensions never set gates, speeds, collision or authority bounds. Diagonals are normalized; steering eases toward a direct target velocity. z is presentation only.

One `E.Game` clock calls the same `World.step` at 1/120 second in browser and Node. Fast/slow lab speeds accumulate fixed steps instead of enlarging collision steps. Gameplay RNG is the engine's seeded `E.rng`; art and sound never consume it. Draw calls are a read-only projection. Local camera shake/flash never freezes simulation, including Hub.

Each step resolves:

1. Launch/extraction choreography or timers, then sanitized pilot intent, clockwise bead, accepted fire, movement and bounds.
2. Authored encounter timeline, enemy motion/arming and boss timelines.
3. Projectile sweeps against relative moving circles. The nearest hit wins; ties use stable IDs. Hostile shots can break drifters. Covered boss bodies/emitters block cannon shots.
4. Captured blast list. Descendants wait at least chainDelay before resolving; a chain has one owner, stable ID and victim set. Death, score and removal happen once. Each victim earns base × min(8,depth+1). All scores feed the team; a pilot-owned cascade also contributes to that pilot. Environmental chains are owned by **team** and give no individual contribution. Friendly blasts never damage pilots.
5. Pilot body contacts, in stable player/entity order. A ready shield handles **one** overlap, then starts a 0.12-second contact grace. This prevents the same batch immediately spending hull. Exposed hull damage instead starts 1.1-second immunity and physically separates the ship. Boss body impact consumes shield but never kills the boss; only an open emitter receives the defined ram hit.
6. Rescue, after hostile contact. A shield already spent this batch cannot also revive. Ready shield + wreck contact restores one hull, consumes the rescuer's ring and grants ordinary damage immunity. No currency. Both active pilots wrecked for 1.5 seconds ends the run.
7. Fusion eligibility/windup. Two living eligible drifters create one armed hunter. Destroyed or missing partners cancel. Fusion consumes both without awarding kills. Cleanup removes dead entities and expired/out-of-bounds projectiles/effects.

Accepted shots restart the whole 1.6-second shield timer, even while exposed. Blocked cooldowns cost nothing. Protection returns only at zero; incomplete gray beads never mean safety. Recovery flight speed is exactly half normal. The requested aim is independent of the actual clockwise-moving firing bead; shots always use the actual bearing. A smaller cross shows the requested bearing while they differ.

Gunships declare a locked three-ray fan, then fire that fan. Boss warnings lock the same target their actual volley uses. Emitters open only during the recovery window. Each phase requires all three emitters, and an explicit phase break repairs one hull on living ships (maximum three) and restores shields. Sector changes also repair one hull. Enemy families, formations, attack timings, health, base values and defaults live in src/data/content.js.

Debug commands mark the run unranked. Attract has its own seed, defaults and state, may grant invulnerability, lasts 82 seconds, and loops through every threat family. It writes no progress or records. Standalone records/settings use separate versioned adapters and continue in memory if local storage is denied. Hub uses its protocol-owned storage isolation and never enters local initials/records.
