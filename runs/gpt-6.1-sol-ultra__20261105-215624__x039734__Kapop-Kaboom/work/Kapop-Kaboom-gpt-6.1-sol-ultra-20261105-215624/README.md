# Kapop

One crook. Three buckets. A sky full of trouble.

Open the single HTML file in the parent folder in a modern browser. Solo and couch play are self-contained, including Three.js, Rapier and its WASM. The default rendering path is WebGPU; the renderer falls back to WebGL2 where needed. `?webgl` forces the built-in WebGL backend for visual capture. Standalone online play loads PeerJS 1.5.5 from jsDelivr and uses its public signaling broker; connections depend on network/firewall conditions.

Move with the mouse, A/D, arrows, left stick or D-pad. Catching is automatic. Space, click, Cross/A or R2 splashes nearby bombs once charged. Escape or Options pauses. Couch P1 uses A/D or mouse; P2 uses arrows, Enter/right Shift, or a second controller. On touch, drag anywhere and use a second finger to splash. The touch mode assists with rescue splashes.

Five rounds introduce gold bombs, splitting bombs, crosswinds and faster final patterns. Catch ten in a row for a higher score multiplier. Every cleared round restores a bucket. Three misses without restoration end the run. The title starts an invincible AI demo after ten seconds; any input exits it.

Pause → Developer tools exposes bomb speed, drop frequency, movement speed, catching width and recharge rate, plus invincibility, AI catching, round skip and bucket refill. Reset balance restores the defaults. Settings offer separate music/SFX volume, PlayStation/Xbox prompts and screen shake.

AI Hub shared-world sessions support 1–4 players, including a dedicated host. Standalone room codes support two players. Couch co-op supports two. Players share lives and a splash meter.

## Build and verify

Run `npm run build --silent` in this directory to regenerate the single-file deliverable and exit-interview.json in the parent folder. Run `npm test --silent` to execute simulation, controller/keyboard/mouse/touch, offline audio, online room and AI Hub harness checks. This prints failures and a single count. Tests use the installed Python Playwright environment and owned OS-assigned loopback servers. Screenshots are separate visual artifacts; they are not required by the test command.

Implementation modules are ordinary ES modules; balance is centralized in sim.js. Native Three.js AnimationMixer clips animate characters, catches and flags. All art, music, SFX and gibberish are generated in code. No web research was used; AI Hub's explicitly linked source files were read for integration.
