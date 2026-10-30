[**Play Silly Skippers — single HTML, 3.29 MiB**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v2__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Silly-Skippers-Goof-Troop-gpt-6.1-sol-max-20261029-0201.html)

Includes five rooms, physical puzzles, a boss, solo companion, couch/online co-op, checkpoints, and the looping attract demo. Runtime dependencies are embedded. Requires WebGPU.

**Source Information**

- **Date:** 2026-10-29 02:55 America/Vancouver.
- **Source:** Goof Troop. Title selected randomly from 50 candidates.
- **Tech:** Three.js r180, Rapier 0.19.3, WebGPU only, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1/client 1.3.0; esbuild 0.25.11.
- **Art/animation:** Original cel-shaded procedural 3D; hierarchical rigs, procedural movement, squash and particles.
- **Audio:** Original synthesized music, effects and gibberish voices.
- **Online:** Shared-world ai-hub and standalone WebRTC co-op; 2–4 couch players.
- **Environment:** Codex CLI, headless Linux/WSL2; player browser unknown. Tested with Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** USD cost and tokens unknown; session approximately 53 minutes.

**Testing Feedback**

129 assertions passed across mechanics, controller UX, standalone networking and hub scenarios. Network checks used 150 ms latency, 50 ms jitter and 5% loss. Six issues were caught and fixed; three were blockers. The mechanics traversal was most helpful; syntax-only checks were least helpful. Real controller hardware and cross-network NAT coverage remain untested.

**Engine Feedback**

- **Best:** Toon materials and Rapier’s kinematic movement.
- **Stuck:** A collider callback caused a WASM borrow failure; built-in filtering fixed it.
- **Main custom system:** Gameplay, companion AI and shared-world networking.
- **Hardest:** Coordinating physics lifetimes, prediction and rendering.
- **Overhaul:** Callback errors should leave physics worlds usable.
- **One change:** A documented strict-WebGPU constructor option.

**Prompt Feedback**

The source, controller philosophy and delivery format gave clear direction. “Complete engine” scope and standalone transport required interpretation. Combining puzzles, companion behavior and co-op was hardest. The ideal additional test is a complete four-person DualSense playthrough across different networks.

This information and feedback also appear in About/Credits and the HTML’s opening comment.