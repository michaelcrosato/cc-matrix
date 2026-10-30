Created **[Far Wilder — single HTML](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-high__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Far-Wilder-FarCry5-gpt-6.1-sol-high-20261029-1530.html>)**.

Includes a complete rescue-to-broadcast mission, three weapons, stealth, alarms, explosives, dog companion, pickup driving, swimming, progression, checkpoints, map, victory screen, and looping attract mode.

Requires WebGPU and internet access for CDN dependencies. Controller or keyboard/mouse required.

**Source Information**

- Date: 2026-10-29 15:30.
- Inspiration: Far Cry 5; original world, characters, writing, and assets.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API.
- Art/animation: cel shading, faceted geometry, procedural rigs, recoil, gaits, wind.
- Audio: original synthesized music/SFX; optional browser speech, voice unknown.
- Online: AI Hub Protocol v1, client 1.3.0; 1–4-player parallel score challenge.
- Environment: Codex CLI (headless), Linux; authoring browser unknown.
- Model: OpenAI gpt-6.1-sol, high reasoning.
- Usage: cost/tokens unknown; approximately 28 minutes.

**Testing Feedback**

55 automated checks passed, plus targeted phone, tablet, compact desktop, and ultrawide checks. Testing/review found **9 issues, including 1 game-breaking shooting bug; all fixed**. Most helpful: integrated combat-to-victory testing. Least helpful: syntax-only checking.

Chromium rendered actual WebGPU gameplay. WebKit and Firefox verified menus and capability messages; their runners lacked WebGPU. Physical controllers and real iOS Safari remain untested.

**Engine Feedback**

Liked Three.js composition and Rapier collision queries most. Initially guessed incorrectly about a toon-material shading option. The largest custom work was mission state, AI, and controller UI; the hardest integration was asynchronous rendering with physics/input. I’d overhaul implicit renderer fallback and add built-in cel-outline helpers.

**Prompt Feedback**

The controller-first direction and complete mission requirement were strongest. “All features” was ambiguous for such a large source game. The hardest task was combining systemic gameplay into one portable file. The additional test I’d choose: two physical DualSense controllers on separate GPU devices in a live Hub session.

Full feedback is also embedded in Credits and the HTML comment. [Detailed test report](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-high__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Far-Wilder-FarCry5-gpt-6.1-sol-high-20261029-1530/TEST-REPORT.md>).