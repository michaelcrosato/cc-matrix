[**Download Populoria**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__Populous__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Populoria-Populous-gpt-6.1-sol-max-20261029-1425.html) — single HTML, **2.90 MB**, WebGPU required.

Includes sculptable terrain, growing settlements, six miracles, rival AI, shrine capture, the Reckoning, creative mode, saves, controller support, and looping attract mode.

**Source Information**

- **Date:** 2026-10-29 14:57, America/Vancouver.
- **Source:** Populous. “Populoria” was randomly selected from 50 brainstormed titles.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub Session 1.3.0; esbuild 0.25.12.
- **Art:** Procedural cel-shaded miniature islands.
- **Animation:** Procedural characters, foliage, banners, birds, particles, and physics debris.
- **Audio:** Original synthesized ambient music and effects; no voice.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), 1–4 player parallel competition with independent worlds.
- **Environment:** Codex CLI, headless Linux; Chromium 153.0.8010.12 and WebKit 26.6.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** Approximately 32 minutes; API cost and token usage unknown.

**Testing Feedback**

59 automated checks passed, plus lightweight phone, tablet, foldable, desktop, ultrawide, and WebKit checks. Testing caught **10 issues, including two startup blockers; all were fixed**.

Most helpful: exercising the complete gameplay loop through saves and victory. Least helpful: the initial blank-output GPU screenshot configuration. WebKit validation covered compatibility and UI; real iOS Safari and physical controller haptics remain unverified.

**Engine Feedback**

Liked most: scene graphs and toon materials. Initial mistakes involved mesh winding and software Vulkan configuration. The main custom system connects terrain, navigation, settlements, and devotion. Keeping rendering and physics coherent was hardest. I would overhaul automatic renderer fallback and add shared editable-heightfield tools.

**Prompt Feedback**

Liked most: the complete slice and controller-first requirements. Multiplayer mode was unspecified, so I chose parallel competition. Making indirect control understandable was hardest. The additional test I’d choose is a full session across four devices with physical DualSense controllers.

These reports are also embedded in Credits and the opening HTML comment.