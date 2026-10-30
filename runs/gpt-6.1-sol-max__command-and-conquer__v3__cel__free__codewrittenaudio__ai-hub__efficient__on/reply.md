[**Play / download Command & Squander**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command-and-Squander-Command-and-Conquer-gpt-6.1-sol-max-20261029-0408.html)

Complete single-file RTS demo with construction, harvesting, combined arms, engineers, orbital strikes, saves, controller menus, looping attract mode, and 1–4-player co-op. **Requires WebGPU and internet access for CDN dependencies.**

[Development files and instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command-and-Squander-Command-and-Conquer-gpt-6.1-sol-max-20261029-0408/README.md)

**Source information**

- **Date:** 2026-10-29 05:03, America/Vancouver.
- **Source:** Command & Conquer. Title randomly selected from 50 candidates.
- **Tech:** Three.js R180; WebGPU exclusively; Rapier 0.19.3; Gamepad API; Web Audio; HTML/CSS/JavaScript; PeerJS 1.5.5; ai-hub client 1.3.0; esbuild 0.25.12.
- **Art:** Procedural cel-shaded models, ink edges and directional shadows.
- **Animation:** Procedural movement, infantry gait, machinery, projectiles and particles.
- **Audio:** Code-written music, effects and synthesized gibberish voices.
- **Online:** [ai-hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op and standalone WebRTC rooms.
- **Testing:** Lightweight functional checks; simulated 150 ms latency, 50 ms jitter and 5% packet loss. No FPS benchmarks.
- **Environment:** Codex CLI, headless Linux; Chrome 154.0.8037.57. Visual checks used Xvfb. Player browser: unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token counts unknown; session approximately 55 minutes.

**Testing feedback**

Five implementation issues corrected; zero confirmed critical/game-breaking issues. Final results: **9 simulation tests, 24 browser feature checks, 8 real WebRTC checks, and five ai-hub scenarios passed**. Additional checks verified vertical inversion, audio activation and every credits page.

Most helpful: the multiplayer conformance harness. Least helpful: syntax-only checks.

**Engine feedback**

- **Liked:** Toon materials, scene composition and Rapier collisions.
- **Got stuck:** Headless captures appeared blank; Xvfb verified the rendering.
- **Built myself:** RTS simulation, navigation, economy, controller interface and networking.
- **Hardest:** Separating shared simulation from responsive local controls.
- **Would overhaul:** Implicit rendering-backend fallback.
- **Would add:** A public strict-WebGPU option with clearer presentation diagnostics.

**Prompt feedback**

- **Liked:** The controller-first direction and complete vertical-slice requirement.
- **Confusing:** Whether “SOURCE” was literal filename text, and which engine the feedback concerned.
- **Hardest:** Delivering complete RTS systems and two multiplayer paths in one HTML.
- **Additional test:** Four people using physical DualSense controllers across browsers and home networks.

All requested information and feedback also appear in **About / Credits** and the HTML’s opening comment.