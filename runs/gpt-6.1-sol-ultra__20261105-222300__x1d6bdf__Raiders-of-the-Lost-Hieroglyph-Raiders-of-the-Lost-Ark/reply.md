[Play Raiders of the Lost Hieroglyph](./Raiders-of-the-Lost-Hieroglyph-Raiders-of-the-Lost-Ark-gpt-6.1-sol-ultra-20261105-222300.html) · [Exit interview](./exit-interview.json)

Complete four-chapter adventure with co-op, controller/touch controls, attract mode, and developer tools. **135 full-suite checks and 12 targeted co-op checks passed.** CDN dependencies require internet on first load.

**Source Information**

- Date: 2026-11-05 22:23:00. Source: *Raiders of the Lost Ark*, Atari 2600, 1982. Plan: none.
- Genre/perspective: action adventure and inventory puzzles; tilted orthographic 3D.
- Tech: Three.js r180, WebGPU with WebGL2 fallback, Rapier 0.19.3, Gamepad/Web Audio APIs, AI Hub protocol v1/client 1.4.0, PeerJS 1.5.5.
- Art/animation: procedural cel shading and ink edges; native AnimationMixer clips with environmental animation.
- Audio: synthesized original music, effects, and gibberish voices. Music defaults to 10%.
- Online: shared-world co-op through AI Hub, standalone WebRTC/BroadcastChannel, and local second-controller play.
- Testing: complete playthrough, software WebGPU, file loading, emulated controller/touch, offline audio, and impaired-network scenarios. Physical hardware and listening quality: unknown.
- Research: [original manual](https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html), [rendering/audio notes](https://github.com/halkuncode/Raiders2600), and official engine/integration documentation.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Usage: added on import.

**Testing Feedback**

1. Testing caught five issues; all corrected. Review corrected additional gameplay/control defects.
2. One testing issue blocked Hub acceptance; review also found two progression blockers.
3. Most helpful: full expedition and official Hub harness.
4. Least helpful: syntax-only checks.

**Engine Feedback**

1. Best: toon materials and native animation.
2. Corrections involved collider origins, menu focus, and guest snapshots; headless WebGPU screenshots were blank.
3. Built the adventure systems, controls, co-op replication, and audio.
4. Hardest: synchronizing physics, animation, and networking.
5. Engine changes: none.
6. Desired improvement: integrated controller focus and physics movement.

**Prompt Feedback**

1. Liked the source research and controller-first direction.
2. The 1982 reference needed interpretation; I used the Atari game.
3. Hardest: completing the expedition and network lifecycle in one HTML.
4. Suggested change: specify target playtime and multiplayer matchmaking expectations.

All information and feedback are also included in-game under About/Credits.