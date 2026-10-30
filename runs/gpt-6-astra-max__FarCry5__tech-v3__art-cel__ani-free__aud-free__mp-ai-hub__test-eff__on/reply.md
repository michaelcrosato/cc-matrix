Built **Rough Cry**: [single-file HTML game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Rough-Cry-FarCry5-gpt-6-astra-max-20261029-0952.html).

Includes combat, stealth, companion rescue, liberation missions, crafting, a pickup, zipline, checkpoints, finale, and attract replay. Serve through localhost or HTTPS; WebGPU and CDN access are required.

**Source Information**

- Date: 2026-10-29 10:46, America/Vancouver.
- Source: Far Cry 5; original setting and assets. Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API.
- Art/animation: procedural cel-shaded world, articulated characters, physics effects, scripted replay.
- Audio: synthesized music/effects and optional browser-synthesized dialogue; installed voice unknown.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), 1–4-player parallel score attack with separate worlds.
- Environment: Codex CLI headless, Linux; supplied browser unknown. Tested using Playwright 1.63, Chromium and WebKit.
- Model: OpenAI, gpt-6-astra, reasoning effort max.
- Usage: approximately 53 minutes at packaging; cost and token count unknown.

**Testing Feedback**

43/43 gameplay/system checks passed. Hub checks passed for 1, 2, and 4 players, departure handling, and legacy readiness. Responsive checks found no overflow or JavaScript exceptions.

Testing and review caught eight implementation issues, including two conditional blockers; all were fixed. One headless capture issue required GPU readback. The mission-route test was most helpful; initial compositor screenshots were least helpful. Physical DualSense and real Safari gameplay remain untested.

**Engine Feedback**

The scene graph, toon materials, and Rapier controller worked well. I initially guessed incorrectly about a material property. The largest custom system was mission and encounter coordination; physics/render synchronization and headless capture were hardest. I would overhaul implicit renderer fallback and add a documented strict-WebGPU initialization/capture path.

**Prompt Feedback**

The controller-first direction and attract-mode requirement were especially useful. “ALL features” was ambiguous for a commercial open-world source; the Field Guide defines this slice’s implemented scope. Integrating its systems was hardest. The most valuable additional test would be a complete television playthrough using a physical DualSense.

These reports are also included in **About/Credits** and the HTML’s opening comment.