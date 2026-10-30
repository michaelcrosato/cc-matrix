Built [**The Hourglass House — single-file game**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__ClockTower__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/The-Hourglass-House-ClockTower-gpt-6-astra-ultra-20261029-0952.html).

Includes five rooms, pursuit, hiding, distractions, traps, two puzzles, two endings, checkpoints, controller settings, and a looping attract demo. Requires WebGPU and internet for CDN dependencies.

[Launch instructions and development files](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__ClockTower__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/The-Hourglass-House-ClockTower-gpt-6-astra-ultra-20261029-0952/README.md)

**Source Information**

- **Date:** 2026-10-29 09:52, America/Vancouver.
- **Source:** ClockTower. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, esbuild 0.28.2.
- **Art:** Original cel-shaded gothic dioramas.
- **Animation:** Procedural articulated characters and environmental animation.
- **Audio:** Original synthesized music and effects; no voice.
- **Online:** AI Hub client 1.3.0; synchronized 1–4-player parallel escape sessions.
- **Testing:** Lightweight functional and visual checks using Playwright 1.63; phones, tablet, desktop, ultrawide, and WebKit.
- **Environment:** Codex CLI, headless Linux; player browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** API cost and token count unknown; approximately 30 minutes.

**Testing Feedback**

Eight tested product issues were fixed; one was game-breaking. Both endings, survival mechanics, saves, controller inversion, and the complete attract loop passed. AI Hub passed **24/24 solo** and **24/24 two-player host-disconnect** checks.

Most helpful: the complete WebGPU playthrough. Least helpful: an adapter-only probe that missed a rendering configuration problem. WebKit’s unsupported-WebGPU screen and settings passed; physical PS5 and real iOS Safari remain untested.

**Engine Feedback**

TSL’s custom shading was the strongest feature. Incorrect Rapier entry-point and controller-method assumptions needed correction. The main custom work was pursuit, story state, checkpoints, and controller focus. Coordinating rendering startup and session lifecycle was hardest. I would overhaul automatic renderer fallback and add a public strict-WebGPU option.

**Prompt Feedback**

The source inspiration and creative freedom worked well. The multiplayer link was ambiguous until its embedded-session protocol was examined. The hardest part was completing the survival loop and presentation within one HTML deliverable. The next useful test would be an extended physical DualSense playthrough on hardware WebGPU.

All feedback is also embedded in **About & Credits** and the HTML’s opening comment.