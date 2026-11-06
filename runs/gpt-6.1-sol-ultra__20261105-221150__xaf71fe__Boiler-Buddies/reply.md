Built **Boiler Buddies** with six shifts, local/online co-op, controller and touch controls, attract mode, and live dev tools.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-221150__xaf71fe/work/Boiler-Buddies-Mario-Bros-1983-gpt-6.1-sol-ultra-20261105-221150.html) · [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-221150__xaf71fe/work/exit-interview.json)

**218 checks passed.** Run `npm run -s test` from the development folder.

**Source Information:** Date: 2026-11-05 22:11:50. Source: [Mario Bros., Nintendo, 1983](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-download-software/Arcade-Archives-Mario-Bros-1276808.html). Plan: none. Genre: arcade/co-op platformer. Perspective: fixed side-view, orthographic 2.5D.

Tech: Three.js r180, WebGPU with automatic WebGL2 recovery, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub Session client 1.4.0, PeerJS 1.5.5/WebRTC. Art: procedural cel shading and ink contours. Animation: native Three.js clips/mixers plus secondary motion. Audio: original synthesized music, effects and gibberish voices; music defaults to 10%.

Online: local co-op, Hub sessions, standalone rooms and connected rematches. Testing: full campaign, controllers, touch, audio waveforms, two-page co-op, WebRTC, Hub latency/loss and visual captures. Hardware WebGPU, physical controllers, real iOS and human listening: unknown. Research: Nintendo/HAMSTER references, contemporary manual and Hub documentation. Environment: Codex CLI, headless Linux. Model: OpenAI, gpt-6.1-sol, reasoning effort ultra. Usage: added on import.

**Testing Feedback**

1. 25 findings addressed through fixes or recovery.
2. Two blocking failure modes: corrupted inline JavaScript and graphics device loss.
3. Most helpful: full-campaign and two-page co-op playthroughs.
4. Least helpful: syntax-only checks.

**Engine Feedback**

1. Native toon materials and animation mixers worked well.
2. Raw WebGPU also failed in this software environment; automatic graphics recovery handles it.
3. Built the arcade rules, progression, controller UI and multiplayer systems.
4. Hardest: underside collisions, traversal and graphics recovery.
5. Engine changes: none.
6. Desired improvement: built-in device-loss recovery across rendering backends.

**Prompt Feedback**

1. The source, controller-first design and complete-slice requirement gave clear direction.
2. Standalone signaling and software WebGPU fallback expectations were unclear.
3. Hardest: integrating gameplay, inputs, audio and co-op into one portable file.
4. Specify the preferred signaling service and expected graphics fallback.

All four sections are also available in the game’s Credits screen.