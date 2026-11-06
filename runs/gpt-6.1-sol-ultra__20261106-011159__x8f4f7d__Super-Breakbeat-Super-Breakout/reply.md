[Play Super Breakbeat](./Super-Breakbeat-Super-Breakout-gpt-6.1-sol-ultra-20261106-011159.html) · [Exit interview](./exit-interview.json)

Complete four-stage demo with co-op, controller/touch controls, procedural audio, attract mode, and live developer tools. Verification passed: **114/114 combined checks**, then **44/44 affected checks** after adding controller scrolling.

**Source Information**

- **Date:** 2026-11-06 01:11:59. **Source:** Super Breakout, 1981. **Plan:** none.
- **Genre:** arcade action / brick breaker. **Perspective:** orthographic 2.5D.
- **Tech:** Three.js r180, WebGPU with WebGL2 fallback, Rapier 2D 0.19.3, Gamepad API, Web Audio, AI Hub session client 1.4.0.
- **Art:** cel shading, ink outlines, rainbow force fields. **Animation:** native AnimationMixer plus procedural effects.
- **Audio:** synthesized music at 10% default, effects, and gibberish voices; no audio files.
- **Online:** AI Hub co-op, browser rooms, manual WebRTC LAN/VPN links; couch co-op included.
- **Testing:** scripted campaign, emulated gamepads/touch, audio analysis, two-page multiplayer, official Hub harness.
- **Research:** [Atari’s manual](https://atariage.com/2600/manuals_old/super_breakout.html), scanned manual, Three.js source, and Hub protocol.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, ultra. **Usage:** added on import.

**Testing Feedback**

1. Testing and review caught nine issues; all fixed or removed.
2. Four were game-breaking in affected modes.
3. Most helpful: the complete campaign through all 272 bricks and both rescues.
4. Least helpful: syntax-only checks.

**Engine Feedback**

1. Best: native toon materials, AnimationMixer, and continuous physics collisions.
2. Sticking points: collider disabling and software WebGPU capture.
3. Largest custom system: campaign, input, UI, and multiplayer lifecycle.
4. Hardest part: combining precise arcade aiming with physical collisions.
5. Engine changes: none.
6. Desired improvement: clearer WebGPU device-loss and capture diagnostics.

**Prompt Feedback**

1. Best: the distinctive source and complete-demo requirement.
2. Confusing: the 1981 release versus the 1978 arcade original.
3. Hardest: consistent controls and behavior across every play mode.
4. Suggested change: specify campaign length and standalone Internet/LAN expectations.

All feedback is also included in-game and in the validated exit interview.