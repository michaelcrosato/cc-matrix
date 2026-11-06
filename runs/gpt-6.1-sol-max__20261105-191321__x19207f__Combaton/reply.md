[**Play Combaton — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191321__x19207f/work/Combaton-Combat-1977-gpt-6.1-sol-max-20261105-191321.html)

Five fields, solo rivals, local/WebRTC/AI Hub multiplayer, attract mode, and live developer tools. **37/37 checks passed**, followed by passing final visual and package checks.

[Development files and instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191321__x19207f/work/Combaton-Combat-1977-gpt-6.1-sol-max-20261105-191321/README.md) · [exit-interview.json](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191321__x19207f/work/exit-interview.json)

**Source Information:** Date: 2026-11-05 19:13:21. Source: [Combat, Atari, 1977](https://atari.com/pages/combat). Plan: none. Genre: arcade vehicle shooter. Perspective: orthographic top-down tanks/jets and side-view biplanes.

Tech: Three.js r180, WebGPU with WebGL 2 compatibility, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, and AI Hub protocol v1. Art: procedural cel shading and ink outlines. Animation: native AnimationMixer clips. Audio: synthesized music, effects, and gibberish voices; music defaults to 10%.

Online: two-player shared worlds through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), plus direct WebRTC. Research covered manuals, presentation, sound descriptions, and official technical documentation. Testing used headless browsers, a full playthrough, virtual controllers, touch profiles, offline audio, and networking harnesses. Physical controller, listening quality, real TV/iOS behavior, and restrictive-network connectivity: unknown.

Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort max. Usage: **added on import**.

**Testing Feedback:** Eight issues were found and fixed; two were critical. The full five-round playthrough was most helpful, exposing a non-scoring jet stalemate. Software-headless WebGPU capture/readback was least helpful; state checks and WebGL captures supplied usable evidence.

**Engine Feedback:** Procedural geometry, TSL, and native animation worked well. Aircraft contacts and texture lifecycles required corrections. I built the rules, AI, input, audio, and replication systems. Resource cleanup during field changes was hardest. Engine changes: none. An integrated input/multiplayer toolkit would help.

**Prompt Feedback:** The source and controller/audio constraints gave clear creative direction. The boundary between a vertical slice and all 27 original variants was unclear. Unifying vehicle modes, touch, and both multiplayer paths was hardest. I would specify standalone signalling and target demo duration.

All required information and feedback are also included in **About / Credits**.