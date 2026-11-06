[Play Air-Sea Kerfuffle](Air-Sea-Kerfuffle-Air-Sea-Battle-gpt-6.1-sol-ultra-20261105-212537.html) · [Exit interview](exit-interview.json)

**163 checks passed, zero failures**, including direct `file://` launch. First load needs internet for CDN dependencies.

**Source Information**

Date: 2026-11-05 21:25:37. Source: *Air-Sea Battle* (Atari, 1977); plan: none. Genre: arcade artillery shooter. Perspective: fixed side view of a 3D diorama.

Tech: Three.js r180, WebGPU/TSL with WebGL2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub Session v1/client 1.4.0, PeerJS 1.5.5. Art: procedural cel shading and ink outlines. Animation: native AnimationMixer clips plus procedural movement. Audio: synthesized music at 10%, effects, and gibberish radio; no audio files. Online: 1–2 player co-op, standalone rooms and AI Hub; local co-op included.

Research: [original manual](https://www.atariage.com/2600/manuals_old/air_sea_battle.html), Atari catalogue/scans, and [Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub). Exact original audio waveforms: unknown. Testing covered complete patrols, virtual controllers, touch, audio, multiplayer, and packaging. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Usage: added on import.

**Testing Feedback**

1. Three product issues caught and fixed.
2. One game-breaking physics crash, resolved with body pooling.
3. Most helpful: the complete patrol simulation.
4. Least helpful: blank headless WebGPU screenshots.

**Engine Feedback**

1. Liked TSL materials and native AnimationMixer clips.
2. Got stuck on Rapier’s collider lifecycle crash.
3. Built combat, wave direction, controller menus, and multiplayer replication.
4. Hardest: synchronizing physics, remote actions, and results.
5. Engine changes: none.
6. Desired improvement: clearer Rapier WASM diagnostics.

**Prompt Feedback**

1. Clear creative and delivery requirements.
2. Coverage of the source’s 27 variations required interpretation.
3. Hardest: polished single-file WebGPU gameplay with reliable co-op.
4. Suggested change: specify preferred demo length and variant coverage.

All required information and feedback are also included in the in-game About screen.