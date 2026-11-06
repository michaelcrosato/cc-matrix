[**Play The Empire Strikes a Pose**](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261106-011138__xdc36f6/work/The-Empire-Strikes-a-Pose-Star-Wars-The-Empire-Strikes-Back-1982-gpt-6.1-sol-max-20261106-011138.html>)

Self-contained HTML with three mission chapters, cable takedowns, an evacuation finale, multiplayer wing echoes, and looping attract mode. Developer tools are under **Pause → Developer tools**.

**71 checks passed, zero failures.** [Exit interview JSON](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261106-011138__xdc36f6/work/exit-interview.json>) is saved and embedded in About/Credits.

**Source Information**

- **Date:** 2026-11-06 01:11:38.
- **Source:** Star Wars: The Empire Strikes Back — 1982 game, with film-inspired tone. **Plan:** none.
- **Genre / perspective:** Arcade flight combat; third-person chase, widened tow camera, optional tactical overhead view.
- **Tech:** Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, BroadcastChannel, AI Hub client 1.4.0.
- **Art / animation:** Procedural cel shading and ink outlines; native Three.js AnimationMixer and custom keyframe clips.
- **Audio:** Code-generated music, effects and gibberish voices; music defaults to 10%.
- **Online:** 1–4 AI Hub ghost rivals; standalone local-room echoes and two-player direct WebRTC. Internet NAT traversal: unknown.
- **Testing:** Headless mission/replay simulations, emulated controller, multitouch, phone/tablet layouts, audio signals, multiplayer and official Hub harness scenarios.
- **Research:** No internet search or source research; fetched the requested Hub contract and dependencies.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Testing caught **8 issues**, all fixed, covering packaging, geometry, aiming, attract input, restart state, camera framing and UI.
2. **2 were critical:** startup failure and unreliable cannon convergence.
3. Most helpful: complete mission and independent attract-loop playthroughs.
4. Least helpful: blank headless WebGPU screenshots. Visual review used WebGL captures. Physical-device and listening review: unknown.

**Engine Feedback**

1. Best: procedural geometry, toon materials and native animation work well together.
2. Wrong assumptions: mesh winding and twin-gun aiming; both corrected.
3. Built: flight, tow mechanics, mission progression, input focus, audio and networking.
4. Hardest: coordinating rendering, physics, input and network lifecycles.
5. Engine changes: none.
6. Desired improvement: a reliable documented headless WebGPU capture path.

**Prompt Feedback**

1. Best: clear source, visual direction and concrete acceptance criteria.
2. Confusing: the title identifies the film while 1982 identifies the game.
3. Hardest: readable cable flight across controller, mouse and touch.
4. Suggested change: specify standalone NAT requirements and whether WebGL fallback is desired.