Built **[Crashtravaganza — single HTML demo](./Crashtravaganza-Destruction-Derby-2-gpt-6.1-sol-max-20261029-0514.html)**.

Includes a three-event championship, twelve-car fields, directional damage, combos, garage, procedural audio, attract mode, local split screen, and AI Hub multiplayer. Serve over HTTPS or localhost; WebGPU and CDN access are required.

**Source information.** Date: **2026-10-29 06:15**, America/Vancouver. Inspiration: **Destruction Derby 2**. Title selected randomly from fifty candidates using `crypto.randomInt`.

- **Tech:** Three.js R180 / 0.180.0, WebGPU only, Rapier 0.19.3, Gamepad API, JavaScript/HTML/CSS.
- **Art:** Procedural cel-shaded geometry with ink edges.
- **Animation:** Physics, wheel/suspension motion, deformation, debris and particles.
- **Audio:** Code-written Web Audio music, effects and synthesized gibberish voices.
- **Online:** [AI Hub protocol](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md), 1–4-player shared derby. Standalone multiplayer uses two-player split screen.
- **Environment:** Codex CLI, headless Linux; target browser unknown. Tested with Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token totals/breakdown unknown; approximately **61 minutes**.

**Testing feedback.** Passed **30 functional checks** and **121 official harness checks** across five multiplayer scenarios. Network simulation used 150 ms latency, 50 ms jitter and 5% loss. Testing caught **9 issues, including 2 critical issues**, all corrected. The most helpful test was the complete AI-driven championship; syntax-only checking was least helpful. Testing stayed lightweight, with no FPS target. Physical controllers, real WAN play and speaker listening remain untested.

**Engine feedback.** TSL materials and Rapier contacts worked well. Shared sprite disposal and chassis friction caused the main difficulties. I built the driving model, AI, damage/scoring, menus, audio and networking. Balancing steering with collision spins was hardest. I’d remove implicit backend fallback and add clearer ownership of shared GPU resources.

**Prompt feedback.** The arcade reference and controller-first requirements gave clear direction. Standalone multiplayer topology was ambiguous; I chose couch multiplayer plus online AI Hub sessions. Combining every system into one file was hardest. The additional test I’d run is four real DualSense controllers across devices at 250 ms latency, including a disconnect during a collision.

These details are also embedded in **About/Credits** and the opening HTML comment.