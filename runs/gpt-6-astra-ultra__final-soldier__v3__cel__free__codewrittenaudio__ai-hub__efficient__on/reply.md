Created [**Soldier Overtime — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v12__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Soldier-Overtime-Final-Soldier-gpt-6-astra-ultra-20261029-1044.html) — **2.96 MiB**, verified opening directly from disk.

Includes three sectors, eight weapon configurations, satellite attacks, a three-phase boss, 2/5-minute score attacks, looping attract mode, and local/online co-op.

**Source Information**

- **Date:** 2026-10-29 10:44, America/Vancouver; session start.
- **Source:** [Final Soldier](https://shmups.wiki/library/Final_Soldier).
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API; esbuild 0.28.2.
- **Art:** Original procedural cel-shaded geometry and ink outlines.
- **Animation:** Procedural ship banking, thrusters, scenery, boss parts and particles.
- **Audio:** Original synthesized music, effects and gibberish radio voices.
- **Online:** Two-player WebRTC via PeerJS 1.5.5; ai-hub co-op for 1–4 players, client 1.3.0. Local two-player co-op included.
- **Testing:** Lightweight simulation, browser and networking checks; no FPS targets.
- **Environment:** Codex CLI, headless Linux/WSL2; Chrome 154 tested under Xvfb. End-user browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** Cost and token count unknown; approximately 45 minutes.

**Testing Feedback**

Four issues caught and fixed, including one critical readability issue where outlines obscured enemy bullets. Gameplay screenshots were most helpful; syntax checks were least informative. Passed 121 ai-hub checks, 20 simulation/regression checks, browser smoke tests and eight full-game online checks.

**Engine Feedback**

The strongest parts were Three.js cel materials and Rapier’s collision events. The unsupported `flatShading` option and Chromium compositor required corrections. I built the arcade systems, controller interface and multiplayer replication. Synchronizing readable combat with physics and networking was hardest. I would overhaul automatic renderer fallback and add an explicit strict-WebGPU option.

**Prompt Feedback**

The concrete deliverable and controller-first requirements were especially useful. “Engine” was ambiguous; I treated Three.js as the rendering engine. Completing the polished single-file slice across both multiplayer transports was hardest. The most valuable additional test would use physical DualSense controllers on two consumer devices.

These details are also included in **About** and the HTML’s opening comment.