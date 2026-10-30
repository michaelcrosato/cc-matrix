[**Play Shells in the Fast Lane**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Shells-in-the-Fast-Lane-Turtles-in-Time-gpt-6.1-sol-max-20261029-0541.html)

Complete single-file demo: four heroes, three eras, a two-phase boss, local/online co-op, and looping attract mode. Serve through **HTTPS or localhost**; WebGPU is required. CDN dependencies need internet.

**Source Information:** Created 2026-10-29 05:42, America/Vancouver. Reference: *Turtles in Time*.

- **Tech:** Three.js r180/0.180.0, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1/client 1.3.0.
- **Art:** Original procedural cel-shaded 3D with ink outlines.
- **Animation:** Hierarchical procedural rigs, pose blending, squash/stretch, launches, hit-stop, and particles.
- **Audio:** Code-written electro-funk music, synthesized effects, and gibberish voices.
- **Online:** Up to four players through AI Hub or standalone PeerJS rooms; local controller drop-in.
- **Environment:** Codex CLI, headless Linux. User browser unknown; tested in headless Chromium 153 using Vulkan/SwiftShader WebGPU.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token totals unknown; session approximately 45 minutes.

**Testing Feedback:** Lightweight functional and visual checks passed: complete campaign, combat mechanics, controller menus, inversion toggles, local drop-in, real PeerJS play, and four hub scenarios under 150 ms latency, 50 ms jitter, and 5% loss. No FPS or optimization testing.

Testing and review found **five issues, including one critical departure bug; all were fixed**. The most helpful test was the full campaign simulation. Syntax-only checks were least helpful because they missed visual and gameplay faults.

**Engine Feedback:**

- **Liked most:** The scene graph, procedural geometry, and toon materials.
- **Got stuck:** Initial headless GPU flags produced blank captures; corrected.
- **Built myself:** Combat, animation, encounters, controller UI, attract AI, and co-op networking.
- **Hardest part:** Coordinating WebGPU compilation with multiplayer readiness.
- **Would overhaul:** Implicit renderer fallback behavior.
- **Would add:** A documented strict-WebGPU option with clearer diagnostics.

**Prompt Feedback:**

- **Liked most:** The arcade reference and controller-first direction.
- **Unclear:** Exact demo length and standalone networking backend.
- **Hardest:** Integrating the complete campaign and both online transports into one polished HTML file.
- **Additional test:** Four people using physical DualSense controllers across different home networks.

Source information and feedback are also included in the **About screen** and **top HTML comment**.