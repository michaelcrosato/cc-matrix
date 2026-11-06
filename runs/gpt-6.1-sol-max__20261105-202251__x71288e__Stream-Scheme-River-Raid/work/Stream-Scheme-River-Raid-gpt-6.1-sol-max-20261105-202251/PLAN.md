# Stream Scheme

An original cel-ink river shooter inspired by River Raid (1982), using only native model knowledge. Three tilted-overhead chapters, shared fuel, flowing river navigation, destructible patrol boats, helicopters, fuel docks, bridge checkpoints, a rolling dodge, a limited screen-clearing burst, and a multi-pattern flagship finale. A complete sortie lasts about three minutes.

Three.js r180 WebGPURenderer (with its native WebGL2 compatibility backend), TSL stepped directional shading, ink silhouette shells and edges, native AnimationMixer clips; Rapier 0.19.3 sensor collisions; procedural Web Audio music, SFX, and gibberish radio. No external art/audio assets.

Controller-first title, pause, settings, controls, debrief, credits and live developer tools. Keyboard, mouse and touch share the same screens. Attract flight starts at ten seconds. Solo, couch wing, direct WebRTC co-op and AI Hub Session Protocol v1 shared-world co-op, one to four seats. Host owns the simulation; clients send input and render snapshots.

Build with `npm run build`. Run the complete headless regression suite with `npm test`; it starts its own loopback ephemeral server and closes only its own processes. It tests the real browser, physics, inputs, audio, a complete mission, multiplayer, and the supplied Hub harness.
