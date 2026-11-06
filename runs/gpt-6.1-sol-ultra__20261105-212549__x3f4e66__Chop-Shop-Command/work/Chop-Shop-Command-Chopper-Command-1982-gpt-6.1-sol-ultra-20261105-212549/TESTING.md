# Verification

78 automated checks pass across the current suites:

- 19 simulation checks: Rapier 0.19.3, real projectile contacts, wrapped flight, altitude limits, split missiles, convoy damage, timed shield protection, reserve milestones, repair pickups, loss conditions, co-op controls, surviving-pilot targeting and shared camera bounds. A full AI campaign clears all three sorties and the airship with real laser collisions, collects eight pickups, uses nine shield pulses, and reaches victory.
- 7 AI Hub adapter checks: synchronized start, reporting, time-up, departure and end blocking.
- 15 Web Audio checks: 10% music default, procedural notes/effects/gibberish, audible analyser levels, independent RNG, volumes and stop/resume.
- 22 browser checks: portable file:// WebGPU boot, Three.js r180, keyboard/mouse, standard-mapping controller stubs, two controllers, pause/dev/settings, credits, ten-second attract and interruption, touch assistance, invisible flight controls, shield activation, portrait and landscape phones, and runtime errors.
- 15 official AI Hub harness checks: two-player standard sessions, four players with 150 ms latency / 50 ms jitter / 5% loss, and host departure. Every official window.__hubCheck.pass is true. Copies stop input, simulation and sound at round end.

One command: `npm test --silent`. The runner starts a localhost server on an OS-selected port and stops that process when done. Output contains failures and one count line. Browser tests use the workstation's installed Python Playwright environment and close their browsers.

The last browser rerun passed all 22 checks after replacing an overly tight fixed delay in the attract test with a wait for the rendered state. The other 56 checks passed in the final aggregate run. Simulation was also rechecked after improving the AI to collect supplies. All current cases pass.

Appearance was checked separately at 1920×1080, 1600×900, 844×390 and 390×844. WebGPU initialized and rendered frames, but headless WebGPU captures omitted the 3D scene, so visual inspection used the renderer's WebGL 2 fallback. Actual TV, physical controller and real mobile hardware behavior are unknown.

Ten product issues were found and fixed during testing, visual checks and integration review; one blocked the first touch launch. See Credits or the root exit-interview.json for the required feedback.
