Built **[The Bell Does Not Sleep](</home/micha/dev/cc-matrix/runs/gpt-6-astra-high__ClockTower__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/The-Bell-Does-Not-Sleep-ClockTower-gpt-6-astra-high-20261029-1033.html>)** — a single-file demo with six rooms, stalking and hiding, puzzles, saves, two endings, controller support, and attract mode.

Serve over HTTPS or localhost. WebGPU and internet access for CDN dependencies are required.

**Source Information**

- **Date:** 2026-10-29 10:33, America/Vancouver.
- **Source:** ClockTower. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript.
- **Art:** Original procedural, cel-shaded gothic environments and characters.
- **Animation:** Procedural character articulation, vaults, pendulums, particles, and camera easing.
- **Audio:** Synthesized ambient music and effects; no voice acting.
- **Online:** AI Hub Protocol v1, client 1.3.0; 1–4-player side-by-side sessions.
- **Testing:** Lightweight gameplay, controller, viewport, and protocol checks.
- **Environment:** Codex CLI (headless); Linux; player browser unknown.
- **Model:** OpenAI, gpt-6-astra, high reasoning effort.
- **Usage:** Approximately 28 minutes. API cost and token totals unknown.

**Testing Feedback:** Found and fixed **3 product issues, including 1 game-breaking ending-navigation issue**. Both endings, puzzles, survival mechanics, saves, attract mode, and synthetic controller checks passed. AI Hub passed one-player, two-player, and player-leaving scenarios. Phone, tablet, desktop, and ultrawide screenshots were inspected. WebKit passed the unsupported-WebGPU screen and Settings checks; gameplay ran in Chromium WebGPU. Most helpful: the complete rescue-and-escape route with screenshot review. Least helpful: the initial headless render using an unsuitable GPU backend. Physical DualSense and real iOS Safari remain untested.

**Engine Feedback:** Three.js’s scene graph and toon materials worked well. The initial headless GPU configuration caused trouble, and its [automatic renderer fallback](https://threejs.org/docs/pages/WebGPURenderer.html) needed explicit disabling. The most important custom system was pursuit, hiding, and narrative progression. Coordinating physics, cameras, and controller focus was hardest. I would overhaul implicit fallback and add a documented strict-WebGPU option.

**Prompt Feedback:** The source identity and controller-first requirements provided clear direction. Multiplayer mode was unspecified; parallel sessions preserve solitary horror. Complete horror pacing and puzzle progression were hardest. The additional test I would choose is a full physical-DualSense playthrough.

These details are also embedded in the HTML’s opening comment and in-game About screen.