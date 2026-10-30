Built **[Orbital Soldier](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Orbital-Soldier-Alien-Soldier-gpt-6.1-sol-max-20261029-0651.html>)** — a single HTML demo with three bosses, four weapons, ceiling running, counter-healing, solar dash, co-op, and looping attract mode.

[Development files and build guide](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Orbital-Soldier-Alien-Soldier-gpt-6.1-sol-max-20261029-0651/README.md>).

**Source Information**

- **Date:** 2026-10-29 07:58, America/Vancouver.
- **Source:** Alien Soldier. Title randomly selected from 50 candidates using `crypto.randomInt`.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS.
- **Art:** Original procedural 3D geometry with cel shading and ink outlines.
- **Animation:** Procedural articulated rigs, tentacles, movement poses, and physics-driven debris.
- **Audio:** Code-written synth music, sound effects, and gibberish voices.
- **Online:** 1–4 player online co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub); standalone supports 1–4 local players.
- **Testing:** Lightweight browser checks, autoplay, survival scenarios, and multiplayer tests with 150 ms latency, ±50 ms jitter, and 5% packet loss. No FPS benchmark.
- **Environment:** Codex CLI (headless), Linux/WSL2; Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token counts unknown; session approximately 66 minutes.

**Testing Feedback**

- **Issues caught:** Six game issues fixed, plus one browser/GPU configuration issue.
- **Critical issues:** Two affected multiplayer startup and simulation timing.
- **Most helpful:** The official four-player AI Hub harness.
- **Least helpful:** Syntax-only checks could not reveal interaction problems.
- **Final result:** **99 checks passed**, including victory, rebuilding, revival, attract looping, axis inversion, direct-file loading, touch-device settings, and WebGPU-only failure handling.

**Engine Feedback**

- **Liked most:** TSL cel materials and Rapier’s character controller.
- **Got stuck:** Automatic WebGL fallback and headless GPU capture needed investigation.
- **Most important custom system:** Combat simulation, boss patterns, controller menus, and authoritative co-op.
- **Hardest part:** Coordinating startup, reversible gravity, controller events, and networking.
- **Would overhaul:** Automatic backend fallback.
- **Would change:** Add a supported public WebGPU-only option.

**Prompt Feedback**

- **Liked most:** Concrete controller, attract-mode, and multiplayer requirements.
- **Confusing:** Whether standalone multiplayer required its own internet lobby; this build provides local squads and AI Hub online squads.
- **Hardest:** Completing the combat, presentation, and multiplayer lifecycle in one deployable file.
- **Additional test:** Four physical DualSense controllers across four devices in a real AI Hub session.

The same information and feedback are included in the credits and top HTML comment.