Created [Axe of Fortune](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Axe of Fortune-Golden Axe II-gpt-6.1-terra-ultra-20261029-0926.html>). The demo includes three chapters, combat and magic, local co-op, online room support, controller settings, and an attract mode. It requires WebGPU and an internet connection for its CDN dependencies.

**Verification is incomplete:** headless Chrome reached the title, settings, gameplay HUD, and attract mode, but its software WebGPU device could not display the scene. Online sessions and physical controllers have not been tested.

**Source information**

- Date: 2026-10-29 09:26; source: Golden Axe II.
- Tech: Three.js r180 with WebGPU, Rapier 0.19.3, Gamepad API, Web Audio API, AI Hub Session 1.3.0, and PeerJS 1.5.5.
- Art and animation: procedural cel-shaded low-poly 3D, with procedural character posing and effects.
- Audio: code-generated music and effects; no voiced dialogue.
- Online: AI Hub co-op and standalone peer-to-peer rooms.
- Testing: lightweight simulation and headless Chrome 154 checks.
- Environment: Codex CLI, headless Linux; browser unknown for deployment.
- Model: OpenAI gpt-6.1-terra, reasoning effort ultra. Usage and cost: unknown.

**Testing feedback:** Testing caught one critical issue—a Rapier body-removal crash—which was fixed. The most helpful test ran the attract simulation through all three chapters to victory five times. Syntax checks were least helpful for judging gameplay.

**Engine feedback:** Three.js made procedural scene construction approachable. WebGPU initialization and material compatibility required the most investigation; combat, animation, and multiplayer synchronization had to be built for the game. I would make WebGPU-only initialization more explicit and overhaul the implicit fallback behavior.

**Prompt feedback:** The arcade inspiration and controller-first direction gave the work a clear identity. The boundary of a “complete demo” was subjective, and the breadth of the vertical slice plus online integration was the hardest part. The most valuable additional test would be a multiplayer controller playthrough on real WebGPU hardware.