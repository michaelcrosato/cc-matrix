Built **Strange Soldier**, randomly selected from 50 titles.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Strange-Soldier-Alien-Soldier-gpt-6-astra-max-20261029-0951.html) · [Development notes](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Strange-Soldier-Alien-Soldier-gpt-6-astra-max-20261029-0951/README.md)

The **2.96 MiB HTML works offline** and requires WebGPU. Includes three phased bosses, four weapons, counters, gravity reversal, Sunbreak, checkpoints, practice, local co-op, and looping attract mode.

**Source Information**

- **Date:** 2026-10-29 10:50, America/Vancouver.
- **Source:** [Alien Soldier](https://www.sega.jp/genesismini2/assets/manual/pdf/US_Alien-Soldier.pdf); original assets and music.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio; esbuild 0.25.11.
- **Art:** Procedural cel shading, ink outlines, layered orbital scenery.
- **Animation:** Articulated procedural rigs, boss state animations, particles and physics debris.
- **Audio:** Code-written music, synthesized effects and gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) parallel competition for 1–4 players; standalone two-player local co-op.
- **Testing:** Lightweight checks; **37 functional/device checks and 72 hub assertions passed**. No performance benchmarks.
- **Environment:** Codex CLI, headless Linux/WSL2; tested Chrome 154. Player browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** API cost and tokens unknown; approximately 60 minutes.

**Testing Feedback**

Six findings resolved, including two blockers—one involving the test environment’s WebGPU presentation. Most helpful: the official hub harness. Least helpful: syntax-only checks, which missed visible rendering problems. Physical controllers remain untested.

**Engine Feedback**

- **Liked:** Toon materials and articulated scene graphs.
- **Got stuck:** Headless graphics configuration and automatic WebGL fallback.
- **Built myself:** Combat, encounters, progression, controller navigation and audio.
- **Hardest:** Coordinating physics, inverted poses and input timing.
- **Would overhaul:** Implicit renderer fallback.
- **Would change:** Add a public strict-WebGPU option and clearer device-loss recovery.

**Prompt Feedback**

- **Liked:** Clear controller, packaging and attract-mode requirements.
- **Confusing:** Multiplayer topology; implemented hub competition and couch co-op.
- **Hardest:** Completing all mechanics and presentation as one coherent slice.
- **Additional test:** Two physical DualSense controllers on a television, including reconnects.

All required information and feedback also appear in-game and in the HTML’s opening comment.