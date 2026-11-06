[**Play Son of a Sun**](./Son-of-a-Sun-Superman-1979-gpt-6.1-sol-ultra-20261106-011205.html)

Complete single-file demo. **212 checks passed, zero failures.** Open in current Chromium with internet access for CDN dependencies.

[Exit interview](./exit-interview.json) · [Development and testing instructions](./Son-of-a-Sun-Superman-1979-gpt-6.1-sol-ultra-20261106-011205/README.md)

All information below is also embedded in About & Credits.

**Source Information**

- **Date:** 2026-11-06 01:12:05. **Source:** Superman - 1979. **Plan:** none.
- **Genre:** superhero action-adventure, flight and rescue. **Perspective:** third-person chase camera.
- **Tech:** Three.js r180, WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub Session Protocol v1/client 1.4.0.
- **Art Direction:** procedural cel shading, ink outlines and an art deco city. **Animation:** native AnimationMixer and keyframe clips.
- **Audio:** code-generated music, effects and gibberish voices; music defaults to 10%.
- **Online:** AI Hub co-op for 1–4, direct WebRTC for two, browser-tab rooms and couch co-op.
- **Testing:** scripted campaign, bonus objectives, physics, menus, simulated controllers/touch, audio rendering, file launch and multiplayer harnesses. Physical controller, listening and separate-device NAT behavior: unknown.
- **Research:** none; only requested integration code and dependencies downloaded.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, ultra reasoning. **Usage:** added on import.

**Testing Feedback**

1. Seven implementation issues caught; all fixed.
2. Three affected startup or co-op functionality.
3. Most helpful: complete campaign playthrough and stressed four-player Hub sessions.
4. Least helpful: early blank WebGPU screenshots; compatibility rendering enabled visual review.

**Engine Feedback**

1. Best: TSL cel shading and native animation.
2. Wrong guesses: bundled helper scopes and waiting for shader warmup.
3. Built myself: flight, missions, interactions, menus and multiplayer synchronization.
4. Hardest: coordinating GPU startup with network authority.
5. Engine changes: none.
6. Desired improvement: reliable automated first-frame readiness and GPU diagnostics.

**Prompt Feedback**

1. Best: source-driven freedom and controller-first requirements.
2. Confusing: the exact intended 1979 edition was unknown.
3. Hardest: combining the complete campaign and multiple co-op paths into one file.
4. Suggested change: specify the source edition and available signaling/TURN infrastructure.