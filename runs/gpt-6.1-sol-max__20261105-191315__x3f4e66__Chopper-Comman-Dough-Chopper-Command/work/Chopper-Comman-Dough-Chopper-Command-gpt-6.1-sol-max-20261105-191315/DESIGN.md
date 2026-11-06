# Chopper Comman-Dough

An original convoy-defense arcade shooter inspired by Chopper Command (Activision, Bob Whitehead, 1982). Side-scrolling, orthographic 2.5D. Four escalating dispatches, twelve flour trucks, enemy rotorcraft and jets, splitting missiles, a carrier finale, radar, score bonuses and three reserve helicopters. New tools: boost, flares, repair hover, overdrive pickups and shared-world cooperative play.

Palette: paper cream, engine orange, ink navy, mint glass, raspberry opposition. Procedural cel-shaded aircraft, illustrated mesas, directional sun, physical debris, comic typography. Three.js r180 WebGPURenderer and native AnimationMixer clips; Rapier 0.19.3 runs aircraft/projectile sensors and debris. All sound is synthesized using Web Audio, music at 10% by default.

Inputs: standard pad left stick flight, right stick aim, R2/Cross fire, L2 boost, Circle flare, Options pause. WASD/arrows flight, mouse aim/fire or Space fire, Shift boost, E/right click flare. Touch: invisible left stick, automatic aim/fire, contextual flare.

Multiplayer: AI Hub Session Protocol v1, authoritative shared world, 1–4 seats including dedicated server. Standalone: local co-op, same-origin radio rooms with BroadcastChannel, and manual WebRTC offer/answer pairing for two devices. No server or matchmaking dependency.

Testing: one `npm test` command; scripted simulation through the complete campaign, physics collisions and split missiles, failure/restart, live balance settings, keyboard/controller/touch, synthesized audio, standalone network and hub harness standard/adverse/host-leave/server scenarios. Screenshots only for appearance.

No plan was supplied by the user; this file records implementation decisions.
