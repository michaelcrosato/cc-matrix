[**Play / download Revenge of the Clocklord**](./Revenge-of-the-Clocklord-SOURCE-gpt-6.1-sol-high-20261029-1534.html)

Complete six-rift campaign with upgrades, a final boss, solo play, two-player local co-op, AI Hub co-op, and looping attract mode. Serve over HTTPS or localhost; CDN access and WebGPU are required.

**Source information**

- Date: **2026-10-29 15:34**, America/Vancouver.
- Source: [Attack of the Timelord!](https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20%28USA%29.pdf). Title randomly selected from 50 candidates.
- Tech: Three.js **r180**, strict WebGPU, Rapier **0.19.3**, Gamepad API, JavaScript/HTML/CSS.
- Art: procedural cel-shaded 3D, ink outlines, clockwork city.
- Animation: procedural motion, fixed-step physics, particles, rigid-body debris, network interpolation.
- Audio: original synthesized music/effects; optional browser speech. Exact voice: **unknown**.
- Online: **1–4 player AI Hub co-op**, Session Protocol v1/client 1.3.0.
- Environment: Codex CLI (headless), Linux; authoring browser **unknown**.
- Model: OpenAI, **gpt-6.1-sol**, high reasoning.
- Usage: API cost and tokens **unknown**; approximately **18 minutes**.

**Testing feedback**

Efficient functional checks covered Chromium WebGPU, phone/tablet/desktop/ultrawide layouts, and WebKit’s compatibility screen. Validation and code inspection caught **8 issues, including 3 game-breaking issues; all were fixed**. Final checks reported no uncaught JavaScript errors.

The most helpful test completed the campaign through actual physics collisions and upgrade transitions. The least helpful was the ultrawide title screenshot. AI Hub passed four-player network, dedicated-server, host-departure, and all **24 controller conformance checks**. Real iOS Safari was unavailable.

**Engine feedback**

- Most liked: scene graphs and toon materials.
- Wrong turn: Three.js enables automatic WebGL fallback by default.
- Most important custom system: host-authoritative co-op combat.
- Hardest part: shared physics with immediate local movement.
- Overhaul: implicit backend fallback.
- Desired change: a documented strict-WebGPU constructor option.

**Prompt feedback**

- Most liked: clear source mechanics and controller-first scope.
- Confusing: the filename timestamp lacked a timezone.
- Hardest: integrating campaign, multiplayer, attract mode, and controller UX coherently.
- Additional test: four people using physical DualSense controllers across real consumer networks.

These reports are also embedded in the opening HTML comment and the in-game About archive.