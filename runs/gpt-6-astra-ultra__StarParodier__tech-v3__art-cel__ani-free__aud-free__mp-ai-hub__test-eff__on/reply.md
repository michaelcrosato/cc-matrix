[**Play Star Jellyrider**](./Star-Jellyrider-Star-Parodier-gpt-6-astra-ultra-20261029-0952.html) — a **4.23 MB, fully self-contained HTML game**. Requires WebGPU.

Includes three ships, three regions, upgrades, a miniboss, three-phase boss, two-minute score attack, AI attract mode, and AI Hub co-op.

**Source Information**

- Date: **2026-10-29 09:52**, America/Vancouver.
- Source: **Star Parodier**. Title randomly selected from 50 candidates.
- Tech: Three.js **r180**, WebGPU only, Rapier **0.19.3**, Gamepad API, Web Audio API; esbuild **0.25.11**.
- Art: original cel-shaded procedural 3D with ink outlines.
- Animation: procedural banking, squash, formations and particles.
- Audio: original synthesized chiptune music and effects; no voices.
- Online: **1–4-player co-op** through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), protocol v1/client 1.3.0.
- Testing: lightweight functional, browser and viewport checks.
- Environment: Codex CLI (headless); Linux; browser unknown.
- Model: OpenAI, **gpt-6-astra**, reasoning effort **ultra**.
- Usage: cost unknown; tokens unknown; session approximately **24 minutes**.

**Testing Feedback**

Eight integration issues were fixed; **zero game-breaking issues** observed. Multiplayer passed **121/121 checks**. Complete campaign, score attack, attract mode, axis inversion, offline launch and responsive layouts passed. Most helpful: multiplayer lifecycle testing and actual WebGPU screenshots. Least helpful: headless WebGPU screenshots, which required headed Chromium to capture correctly. Physical DualSense and real iOS Safari remain untested.

**Engine Feedback**

Best: toon materials and geometry tools. Wrong assumption: WebGPURenderer enables automatic fallback; this was explicitly disabled. Custom work: combat, stage direction, controller menus, networking and audio. Hardest: synchronizing shared combat with immediate local movement. I would overhaul implicit fallback behavior and add clearer strict-WebGPU initialization diagnostics.

**Prompt Feedback**

Best: the playful source and controller-first direction. Confusing: the multiplayer URL describes a session protocol rather than matchmaking. Hardest: delivering the complete gameplay and multiplayer lifecycle together. Additional test: physical DualSense co-op across two devices.

These details are also included in **About/Credits** and the HTML’s opening comment.