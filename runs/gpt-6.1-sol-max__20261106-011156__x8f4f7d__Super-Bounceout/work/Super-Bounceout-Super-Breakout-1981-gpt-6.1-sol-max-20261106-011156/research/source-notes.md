# Research notes

Primary source: [Atari Super Breakout instruction manual](https://atariage.com/2600/manuals_old/super_breakout.html). The 1981 home release is the interpretation used here; the original arcade game dates to 1978.

The manual frames the player as a shuttle pilot confronting a mysterious layered force field. Play uses a horizontal paddle and angle-dependent rebounds. The wall has eight rows, with increasing point values higher up. Players get five serves, and reaching the ceiling reduces the paddle. Double adds two balls and stacked paddles. Cavity encloses two extra balls and multiplies scoring as they escape. Progressive advances bands of bricks toward the player. The obstacles are walls, with no character enemies. The manual describes eight programmed sound variations; this game instead synthesizes its own collision palette, musical loop and gibberish voices.

The original variants become a four-sector campaign. POP timing, adjacent-brick damage, co-op paddles, private online score races and the illustrated paper/ink presentation are original additions.

Technical references checked before implementation:

- [Three.js r180 WebGPURenderer source](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPURenderer.js)
- [Rapier JavaScript documentation](https://rapier.rs/docs/user_guides/javascript/getting_started_js/) and the pinned 0.19.3 TypeScript definitions
- [PeerJS documentation](https://peerjs.com/client/getting-started)
- [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), including its unmodified session client and official harness

