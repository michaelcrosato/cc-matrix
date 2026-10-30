Built **Destruction Detour**.

[Single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Destruction-Detour-Destruction-Derby-2-gpt-6-astra-max-20261029-0944.html) · [Local preview](http://localhost:18783) · [Build notes](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Destruction-Detour-Destruction-Derby-2-gpt-6-astra-max-20261029-0944/README.md)

Includes three championship events, garage customization, practice challenges, damage and scoring systems, controller menus, attract mode, and online derby.

**Source Information**

- **Date:** 2026-10-29 10:59, America/Vancouver.
- **Source:** Destruction Derby 2.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Procedural cel-shaded vehicles and desert speedway.
- **Animation:** Physics-driven movement, animated wheels/suspension, deformation and particles.
- **Audio:** Code-written music, synthesized effects and gibberish announcer.
- **Online:** AI Hub versus sessions and standalone WebRTC rooms; 1–4 players plus AI.
- **Environment:** Codex CLI, headless Linux/WSL2; tested Chrome 154. Deployment browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 76 minutes. API cost and token counts unknown.

**Testing Feedback**

Five test-discovered issues were fixed, including two gameplay-blocking issues. All **73 hub checks passed**, alongside standalone connection, controller, attract-mode, physics, build and rendering checks.

Most helpful: deterministic physics tests. Least helpful: initial headless screenshots, which omitted the WebGPU canvas; direct canvas readback worked. Testing remained focused and used an emulated controller. Physical DualSense and four-device WAN play remain untested.

**Engine Feedback**

Best: native toon materials and Rapier contacts. Corrections: ground-contact damage and AI cornering. Main custom work: driving, damage, AI and network prediction. Hardest: immediate local control with authoritative shared scoring. Overhaul: the renderer’s implicit fallback. Desired addition: built-in vehicle replication and reconciliation.

**Prompt Feedback**

Best: the clear reference and controller-first direction. Ambiguity: unlimited performance alongside lightweight testing. Hardest: integrating the gameplay, presentation and two multiplayer transports. Additional test: four people using physical DualSense controllers across separate networks.

These reports are also included in **About/Credits** and the HTML’s top comment.