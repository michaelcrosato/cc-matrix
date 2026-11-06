# Pitfall: The Lost Lunch

Original expedition platform adventure inspired by Pitfall II: Lost Caverns (1984).
Side-on 3D cutaway, cel-shaded geometry, heavy ink, warm paper UI and luminous cave flora.

Route: camp → Moss Gallery (Mox rescue) → Below River (Dr. Crumb rescue, swimming) → Bat Belfry (climbing and optional treasure) → Balloon Well (ride and steer) → Suncrumb Shrine (lunchbox) → return trolley → camp bell.

No finite lives or oxygen. A hazard returns an explorer to the latest discovered pennant and subtracts 100 points, retaining every discovery. Twelve optional golden crumbs reward exploring shelves and the river bed. Three required discoveries unlock the return trolley. A camp bell finishes the expedition.

Inputs: left stick / A-D moves, Cross / Space jumps or swims up, up-down / W-S climbs and swims, Square / E interacts, Triangle / M opens the map, Options / Escape pauses. Player two uses a second pad or I-J-K-L, Right Shift and O. Touch has invisible left thumb movement and contextual right-side jump / interact.

Native Three.js AnimationMixer clips drive adventurer limbs, creature wings and companion idles. Rapier 0.19.3 runs fixed-step capsule physics, terrain collision and platform grounding. Three.js r180 WebGPURenderer uses native toon materials and geometric ink outlines. Entirely synthesized Web Audio; music starts at 10%.

Co-op uses one authoritative world: AI Hub Session Protocol 1 (unmodified client 1.4.0), 1–4 seats; standalone couch 1–2 and direct manually signaled WebRTC 1–2. Inputs go to host at 15 Hz and snapshots at 10 Hz. Session start, time-up, end, server-only host and leave are handled explicitly.

One build command produces the root single-file HTML, including Three.js, Rapier's embedded WASM and the Hub client. One test command covers deterministic physics, a complete playable route, input and menus, audio synthesis, save persistence, touch, standalone peers and all four Hub harness scenarios.
