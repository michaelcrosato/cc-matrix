# Pitfall-ish — The Understory

A side-view, 2.5D exploration platform adventure inspired by Pitfall II: Lost Caverns (1984). Rescue three companions in a connected cavern and return to camp. Optional gold, ladders, swimming, frogs, bats, eels, balloons, checkpoints, and an unlocked return bridge support an uninterrupted expedition. No combat or lives: a mishap returns the explorer to the latest lantern and costs loose gold points.

The route descends through the Fern Gallery to the underground river, crosses to the balloon chimney, climbs to the mentor's gallery, then returns over a lowered rope bridge. Swimming has unlimited breath; touch assist automatically rises and grabs nearby balloons. All pickups and rescues persist across mishaps. The field map charts the connected route; lanterns are restart points. An AI attract tour demonstrates the complete route.

Three.js r180 WebGPURenderer with MeshToonNodeMaterial, geometric ink outlines, native AnimationMixer clips; Rapier 0.19.3 kinematic character collision; Web Audio music/effects/gibberish; Gamepad API. Entire runtime and embedded WASM are bundled into a single HTML, with no runtime downloads. Two explorers share rescues and score in authoritative-host co-op, via AI Hub, same-browser tabs, or manual WebRTC pairing. Controller, keyboard and touch use the same screens.

## Verification

`npm test` runs the browser/state/audio/controller/touch/online checks and reports only failures and a final count. Includes a complete scripted expedition through physics, restart, checkpoints, hazards, rescue, swimming, ballooning and win. Screenshot inspection is used for composition only. `npm run build` creates the root deliverable.
