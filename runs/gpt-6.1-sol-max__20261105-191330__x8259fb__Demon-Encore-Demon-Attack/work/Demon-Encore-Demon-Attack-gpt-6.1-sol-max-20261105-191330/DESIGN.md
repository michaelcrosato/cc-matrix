# Demon Encore

Original fixed-screen arcade shooter inspired by Demon Attack (1982). Source research uses native model knowledge only. Title selected with Node's cryptographic random number generator from 50 candidates.

## Playable slice

Seven encounters: First Contact, Split Decision, Crossfire Choir, Dive Bar, Double Trouble, Curtain Call, and The Headliner. Adult demons split into independently moving hatchlings. Artillery demons and divers introduce aimed fans and diving attacks. The boss alternates radial fans, aimed volleys and summoned demons, with an enraged final phase.

Move horizontally, hold fire, phase dash through danger, graze bolts to charge Encore, collect repair/rapid/prism drops, build a timed score multiplier. Three difficulties. Shared co-op for 1–4 AI Hub seats; 2-player couch and WebRTC direct-link standalone. Defeated co-op pilots return next encounter while a teammate survives.

## Presentation

Orthographic 3D diorama, cel shading in Three.js TSL, thick ink silhouettes, procedural layered demons, native AnimationMixer wing and thruster clips, geometric particles and starfield, coral/cyan/cream over midnight navy. Large TV-readable menus with identical pad, keyboard, mouse and touch navigation. Procedural Web Audio score at 10% default, synthesized effects and gibberish voice.

## Architecture and delivery

Pinned Three.js 0.180.0 WebGPURenderer (WebGPU preferred, WebGL2 fallback), Rapier 0.19.3 sensor collisions and projectile dynamics, fixed-step simulation, Gamepad API. Host-authoritative snapshots through unmodified AI Hub session 1.4.0 client or a direct WebRTC channel. Bundle engine, physics including WASM, hub client, art, audio, code and UI into one offline-capable HTML. Development files stay in this directory; finished HTML and exit-interview.json go in the parent workspace.

## Verification

One command, npm test: deterministic gameplay and whole-slice playthrough, real rendering initialization, UI and input, pause/live sliders, attract loop/exit, persistence, touch, emulated standard gamepads, offline audio levels, two-page direct co-op, AI Hub standard/degraded/host-leave/server harness checks. Print failures plus one count line. Screenshots assess visual composition only. Physical controller, real mobile hardware, WAN NAT traversal and human listening remain unknown.
