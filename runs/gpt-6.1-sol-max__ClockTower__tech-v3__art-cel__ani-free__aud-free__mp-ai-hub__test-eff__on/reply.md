Created [**Deadtime Stories — single HTML game**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__ClockTower__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Deadtime-Stories-ClockTower-gpt-6.1-sol-max-20261029-1423.html).

Includes five rooms, pursuit, hiding, distractions, puzzles, two endings, checkpoints, controller settings, and a looping attract demo. Serve through localhost or HTTPS; dependencies load from CDN. [Development guide](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__ClockTower__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Deadtime-Stories-ClockTower-gpt-6.1-sol-max-20261029-1423/README.md).

**Source Information:** Date: **2026-10-29 14:23**, America/Vancouver. Source: **ClockTower**. Title selected randomly from 50 candidates.

- **Tech:** Three.js r180, WebGPU exclusively, TSL, Rapier 0.19.3, Gamepad API, HTML/CSS/JavaScript.
- **Art direction:** Procedural cel-shaded Gothic dollhouse.
- **Animation:** Articulated rigs, blended movement, animated machinery, physical props.
- **Audio:** Original procedural Web Audio music and effects; voice: none.
- **Online:** AI Hub client 1.3.0, Protocol v1; 1–4-player parallel sessions.
- **Testing:** Lightweight Playwright checks, Chromium WebGPU, and WebKit viewport checks.
- **Environment:** Codex CLI headless; Linux; delivery browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token count unknown; approximately 70 minutes.

**Testing Feedback:** Fourteen issue groups were corrected, including two startup blockers. Final results: **24 gameplay checks, 35 systems/UX checks, three Hub scenarios with 24 checks each, and 14 clean viewport layouts**. The full browser route was most helpful: it caught mouse-hover focus theft. The initial CommonJS syntax check was least helpful because it missed an ES-module naming collision. Real iOS Safari and physical controllers remain untested.

**Engine Feedback:**

- **Liked most:** Three.js scene graphs and TSL flexibility.
- **Got stuck:** Module scope, menu focus, and GPU initialization timing.
- **Most important custom system:** Pursuer perception, navigation, hiding memory, and persistent room state.
- **Hardest part:** Coordinating physics, room transitions, and input.
- **Would overhaul:** Implicit graphics-backend fallback.
- **Would change:** Add a public WebGPU-only option and clearer initialization readiness signals.

**Prompt Feedback:**

- **Liked most:** Controller-first UX and attract mode.
- **Confusing:** Multiplayer mode was unspecified; parallel sessions preserve solo horror.
- **Hardest requirement:** A complete, polished story and engine in one HTML file.
- **Additional test:** Four physical DualSense controllers across four WebGPU-capable devices.

This information is also included in the in-game credits and the HTML’s top comment.