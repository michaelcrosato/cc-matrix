[Open **Raiders of the Lost Fortune**](./Raiders-of-the-Lost-Fortune-Raiders-of-the-Lost-Ark-gpt-6.1-sol-ultra-20261105-222101.html) · [Exit interview](./exit-interview.json)

Complete single-file demo. **135/135 checks passed.** Internet is needed for CDN dependencies.

**Source Information**

- **Date:** 2026-11-05 22:21:01. **Source:** Raiders of the Lost Ark (1982). **Plan:** none.
- **Genre:** action-adventure, combat and environmental puzzles. **Perspective:** cinematic overhead third-person.
- **Tech:** Three.js r180, WebGPU, TSL, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.4.0, PeerJS 1.5.5.
- **Art Direction:** procedural cel shading and ink outlines. **Animation:** native AnimationMixer clips plus procedural whip, roll, grapple and boulder movement.
- **Audio:** code-generated music, effects and gibberish voices; music defaults to 10%.
- **Online:** 1–2 player co-op through AI Hub, standalone WebRTC and same-origin BroadcastChannel.
- **Testing:** full scripted expedition, keyboard, emulated controller/touch, physics, audio, multiplayer and AI Hub harness.
- **Research:** none; only specified integration files and dependencies downloaded.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort ultra. **Usage:** added on import.

**Testing Feedback**

1. Testing caught two issues: a missing import-map entry and incorrect snake facing.
2. One was critical: the import failure prevented loading. Both are fixed.
3. Most helpful: the actual AI Hub browser harness.
4. Least helpful: blank headless WebGPU screenshots; fallback screenshots enabled visual inspection. Physical-controller feel, real-device listening and cross-network WebRTC traversal remain **unknown**.

**Engine Feedback**

1. Native animation clips, procedural geometry and TSL materials worked well together.
2. The transitive `three/webgpu` import required an additional mapping.
3. The largest custom system was the complete adventure framework and shared-world authority.
4. Coordinating controls, physics, animation and networking was hardest.
5. Engine changes: none.
6. Most desired improvement: reliable headless WebGPU image capture.

**Prompt Feedback**

1. The complete vertical-slice requirements and concrete testing stand-ins were helpful.
2. The boundary between prohibited research and required integration downloads needed interpretation.
3. Combining co-op, controller UX, touch assistance, attract mode and developer tools was hardest.
4. Explicitly permit implementation documentation downloads and distinguish dated game adaptations from films.

All requested information and feedback also appear in the in-game About/Credits screen.