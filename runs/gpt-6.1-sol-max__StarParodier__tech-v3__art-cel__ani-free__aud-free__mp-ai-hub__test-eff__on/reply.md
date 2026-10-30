Built **Star Paro-Tea**: a complete four-minute arcade slice with three pilots, upgradeable weapons, two bosses, score attack, practice, looping attract mode, and hub co-op.

[Open the single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__StarParodier__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Star-Paro-Tea-Star-Parodier-gpt-6.1-sol-max-20261029-1423.html) · [Development notes](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__StarParodier__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Star-Paro-Tea-Star-Parodier-gpt-6.1-sol-max-20261029-1423/README.md)

Requires WebGPU and internet access for CDN dependencies. Direct-file launch passed in Chromium.

**Source Information**

- Date: 2026-10-29 14:23, America/Vancouver.
- Source: Star Parodier.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, esbuild 0.28.2.
- Art: original cel-shaded geometry and ink outlines.
- Animation: procedural motion, fixed-step physics, physical debris.
- Audio: original synthesized music and effects; no voice.
- Online: 1–4 player co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0.
- Testing: lightweight functional, controller, viewport, and network checks; no FPS targets.
- Environment: Codex CLI (headless); Linux; browser unknown.
- Model: OpenAI, gpt-6.1-sol, reasoning effort max.
- Usage: API cost unknown; tokens unknown; approximately 45 minutes.

**Testing Feedback:** Seven issues fixed, including two game-breaking issues. Passed 23 gameplay checks, 73 hub checks, four-player boss synchronization, and responsive checks. Most helpful: the lossy-network hub harness. Least helpful: initial headless screenshots with blank WebGPU presentation. WebKit verified capability messaging; real Safari and physical DualSense hardware remain untested.

**Engine Feedback:** Best: scene composition and toon materials. Got stuck on fallback behavior and sprite texture bindings. Built the stage director and co-op authority. Hardest: immediate controls alongside shared simulation. Overhaul: texture-binding diagnostics. Desired change: a public WebGPU-only option.

**Prompt Feedback:** Best: clear creative constraints and controller philosophy. Confusing: the hub’s fallback guidance conflicted with WebGPU-only. Hardest: completing and validating the whole slice in one HTML. Additional test: a full television session using physical DualSense controllers and four remote players.

These details are also embedded in About/Credits and the opening HTML comment.