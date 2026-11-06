# Decision log
- Native 2D full engine 0.89.1; no vendor engine patches. Artillery kit supplied the fixed-step, trajectory evaluation and native shell/terrain patterns. Walking, free aim, turns, rockets, inventory and auto-fire were replaced.
- World coordinates: x across the lane, z up; engine y is decorative depth. Terrain's height coordinate is mapped only in its native draw boundary. Cosmetic chunks never own castle collision.
- A 960-unit arena, 50° elevation, 530 u/s full launch speed and 260 u/s² gravity make full charge overshoot; useful charge is roughly two-thirds. All tensions share the range. Per-projectile gravity is captured at launch.
- Predict/live use the same swept ballistic integrator. AI searches that integrator and submits legal begin/release/stone commands. Seeded combat randomness never depends on decorative rig/blink randomness.
- Hub packets contain full compact health strings, so losing any unreliable snapshot is repaired by the next. Reliable baselines start/resync and require passive ACKs. 140 ms snapshots; a local 14 msg/s token budget leaves headroom below the Hub's aggregate 20/s budget.
- Hold-duration reconciliation is bounded to authoritative elapsed begin time ±0.32 seconds, then the legal 0–1 power curve. Commands are monotonic and authenticated by sender ID. Local charge feedback starts immediately; clients never report damage or score.
- Developer gravity affects new projectiles/predictions, timing affects the next action, health scaling preserves existing fractions. All local mutations mark the run; Hub diagnostics expose no mutation route.
- The original source label is retained verbatim. European archive dates it 1981; US manual copyright is 1982. No invented reconciliation.
