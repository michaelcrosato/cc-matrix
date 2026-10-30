Built [**High Cry — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-high__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/High-Cry-FarCry5-gpt-6-astra-high-20261029-1023.html).

Serve over localhost or HTTPS. Requires WebGPU and internet access for dependencies. Includes three strongholds, stealth/combat, driving, Juniper, fishing, upgrades, saves, and automatic attract mode.

**Source Information:** Date: 2026-10-29 10:23, America/Vancouver. Inspiration: Far Cry 5. Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, AI Hub 1.3.0. Art: procedural cel shading. Animation: procedural joints, recoil and physics. Audio: generated music/effects and optional browser voices. Online: synchronized, separate-world score competition for 1–4 players. Environment: Codex CLI (headless), Linux; authoring browser unknown. Model: OpenAI gpt-6-astra, high reasoning. Cost/tokens: unknown; session approximately 46 minutes.

**Testing Feedback:** Seven issues fixed, including one game-breaking vehicle collision. Passed 72 hub checks, 25 gameplay checks, and 14 controller/layout checks. Most helpful: scripted mission/physics traversal plus screenshot inspection. Least helpful: initial headless screenshots before correcting WebGPU capture settings. WebKit verified compatibility screens; physical DualSense, real iOS Safari and remote multiplayer remain untested.

**Engine Feedback:** Best: Three.js toon composition and Rapier physics. Wrong turns: implicit renderer fallback and driver collisions. Most important custom work: mission/save systems and controller input routing. Hardest: coordinating physics, AI, menus and replay. Suggested overhaul: explicit backend fallback policy. Desired addition: built-in controller UI focus.

**Prompt Feedback:** Strongest: clear art, deployment and controller requirements. Ambiguous: “all features” for an open-world source. Hardest: completing interacting systems and a coherent mission in one file. Additional test: physical DualSense with two remote WebGPU players.

These details are also embedded in the HTML comment and in-game About screen. [Full QA report](/home/micha/dev/cc-matrix/runs/gpt-6-astra-high__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/High-Cry-FarCry5-gpt-6-astra-high-20261029-1023/QA.md).