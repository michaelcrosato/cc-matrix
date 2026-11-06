[Play Drainio Bros.](./Drainio-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200707.html) · [Exit interview](./exit-interview.json)

Complete: eight shifts, 1–4 player co-op, attract mode, procedural audio, and a pause-menu developer workshop. **46/46 checks passed.** Engine dependencies load from CDNs.

**Source Information**

- Date: 2026-11-05 20:07:07. Source: [Mario Bros. (1983)](https://www.nintendo.com/us/store/products/arcade-archives-mario-bros-switch/). Plan: none.
- Genre: arcade action platformer. Perspective: fixed side-on 2.5D.
- Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 2D 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.4.0.
- Art: cel-shaded ink waterworks. Animation: native Three.js mixers and clips.
- Audio: original synthesized music, effects, and gibberish voices; music defaults to 10%.
- Online: couch co-op, standalone WebRTC rooms, and AI Hub shared-world co-op.
- Testing: full campaign simulation, virtual controllers, touch profiles, audio measurements, WebRTC, and four Hub harness scenarios. Physical hardware and external NAT traversal: unknown.
- Research: Nintendo screenshots, the [1983 manual](https://atarionline.org/wp-content/uploads/2021/11/mario-bros-1983-atari-2600-game-instructions-manual.pdf), mechanics/music references, and engine/protocol documentation.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort max. Usage: added on import.

**Testing Feedback**

1. Six gameplay/UI issues fixed.
2. One critical menu-layering issue; fixed.
3. Most helpful: 1920×1080 visual review caught dialog overlap.
4. Least helpful: blank software WebGPU screenshots.

**Engine Feedback**

1. Liked procedural 3D and native animation clips.
2. Incorrect grounding and focus assumptions were corrected.
3. Built the arcade simulation and shared co-op world.
4. Hardest: coordinating physics, animation, and network snapshots.
5. Engine changes: none.
6. Desired improvement: dependable headless WebGPU captures.

**Prompt Feedback**

1. The source, controller philosophy, and testing stand-ins provided clear direction.
2. Filename punctuation and standalone signaling needed interpretation.
3. Hardest: delivering the complete campaign and both online paths in one HTML.
4. Suggested change: specify campaign length and preferred signaling service.