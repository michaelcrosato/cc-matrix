[Download **The Timelord Runs Late** — single HTML file](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__AttackoftheTimelord__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/The-Timelord-Runs-Late-Attack-of-the-Timelord-gpt-6-astra-ultra-20261029-0952.html)

Includes six waves, four threat families, a three-phase boss, endless mode, controller menus, upgrades, synthesized audio, attract mode, and multiplayer score racing. Requires WebGPU and internet for CDN dependencies; serve over localhost or HTTPS.

**Source Information**

- Date: 2026-10-29 09:52 PDT.
- Source: [Attack of the Timelord!](https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20(USA).pdf)
- Tech: Three.js r180, WebGPU only, Rapier 2D 0.19.3, Gamepad API, HTML/CSS/JavaScript.
- Art: original cel-shaded geometry with ink outlines.
- Animation: procedural motion, particles, fixed-step physics.
- Audio: original synthesized music/effects; optional browser-synthesized voice, exact voice unknown.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), protocol v1/client 1.3.0; 1–4-player synchronized score race.
- Testing: lightweight simulation, browser/controller, viewport, and protocol checks.
- Environment: Codex CLI (headless); Linux; browser unknown. Validation used Chromium and WebKit.
- Model: OpenAI, gpt-6-astra, reasoning effort ultra.
- Usage: API cost/tokens unknown; approximately 32 minutes.

**Testing Feedback**

Eight implementation issues caught and fixed; **one critical** Rapier crash. AI Hub passed **72/72 checks**. Most helpful: complete-campaign simulation. Least helpful: initial blank headless GPU captures, resolved by correcting the testing configuration. Physical DualSense and real iOS Safari remain untested.

**Engine Feedback**

- Best: flexible procedural geometry and deterministic physics.
- Stuck: Rapier object recycling and Linux WebGPU capture.
- Built myself: gameplay framework, menus, attract AI, audio, and progression.
- Hardest: graphics startup and physics object lifetime.
- Overhaul: automatic backend fallback.
- Change: add a public strict-WebGPU mode with clearer diagnostics.

**Prompt Feedback**

- Best: clear arcade lineage and controller-first requirements.
- Confusing: multiplayer mode was unspecified; the linked protocol clarified suitable options.
- Hardest: integrating the complete campaign and presentation into one file.
- Additional test: physical DualSense on a television with remote AI Hub players.

All requested feedback is also included in the in-game credits and top HTML comment.