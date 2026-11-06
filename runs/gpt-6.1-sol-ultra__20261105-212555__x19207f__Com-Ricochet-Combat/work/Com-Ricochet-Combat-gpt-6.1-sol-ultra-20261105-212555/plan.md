# Com-Ricochet
Original arcade vehicle duelling inspired by Combat (Atari, 1977).
Selected with Node crypto.randomInt from 50 privately brainstormed titles: draw 11.

- Genre: arcade vehicle shooter, versus / solo circuit.
- Camera: tilted orthographic top-down shared arena.
- Five rounds: straight tanks, bank-shot tanks, guided shells, invisible bank-shot tanks, wraparound jets with cloud cover.
- 55-second rounds or first to 4; cumulative circuit medal and per-round results. Quick Duel offers all five rules.
- Input: standard gamepad dual sticks, R2/Cross fire, L2/Circle dash or reveal; WASD + mouse and Space/Shift; local second player arrows + Enter/right Shift; touch invisible sticks and assisted fire.
- Native Three.js AnimationMixer clips for recoil, hit wobble and aircraft banking. Rapier dynamic vehicles, walls and rebounding projectiles.
- Procedural toon geometry, ink outlines, diorama terrain and cartographic detail. All audio synthesized; music 10%.
- Pause settings, live developer sliders, round selection, bots, invulnerability and physics debug.
- Online shared world via AI Hub protocol v1, standalone direct WebRTC and same-browser room. 1–4 hub seats, 1–2 couch.
- Attract starts after 10s on title and cycles through every rule; input returns to title.
- Automated tests: boot, physics, combat, complete circuit, pause/settings/developer controls, virtual gamepad, mobile input, audio signal, multiplayer and official AI Hub scenarios.
