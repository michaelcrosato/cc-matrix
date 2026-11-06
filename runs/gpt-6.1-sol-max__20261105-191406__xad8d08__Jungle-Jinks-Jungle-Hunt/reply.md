[Jungle Jinks — play/download](./Jungle-Jinks-Jungle-Hunt-gpt-6.1-sol-max-20261105-191406.html)

Complete, self-contained HTML with four acts, synthesized audio, developer tools, attract mode, and multiplayer. **28/28 full-suite checks passed**, followed by **8/8 camera and portability rechecks**.

[Exit interview](./exit-interview.json) · [Development and testing instructions](./Jungle-Jinks-Jungle-Hunt-gpt-6.1-sol-max-20261105-191406/README.md)

**Source Information:** Date: 2026-11-05 19:14:06. Source: Jungle Hunt (1983). Plan: none. Genre: arcade action-adventure/platformer. Perspective: side-scrolling 2.5D. Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub client 1.4.0. Art: procedural cel shading and ink outlines. Animation: native AnimationMixer/keyframe clips plus procedural motion. Audio: code-generated music, effects, and gibberish voices; music defaults to 10%. Online: 1–4 Hub ghost races, two-player direct invitation/reply races, and local split-screen. Testing: headless scripts, GPU readback, screenshots, emulated controls, audio measurements, and multiplayer harnesses. Research: native knowledge; supplied Hub files and dependencies downloaded. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, max reasoning. Usage: **added on import**.

**Testing Feedback:** Eight product issues fixed, including four critical cases. Most helpful: the complete normal-rules playthrough. Least helpful: blank headless WebGPU screenshots; GPU readback and WebGL captures supplied verification.

**Engine Feedback:** Liked native toon materials, WebGPU, and AnimationMixer. Got stuck on headless graphics configuration. Built the gameplay, UI, audio, and networking layers. Hardest: coordinating physics and animation across four acts. Engine changes: none. Desired improvement: controller-first game primitives.

**Prompt Feedback:** The source, controller direction, and testing tools provided clear scope. Standalone signaling was unspecified. Hardest: combining four mechanics with coherent presentation and multiplayer. Suggested change: specify a signaling service or direct invitation flow.