Built **Splinter Cell: Repossession**, randomly selected from 50 titles.

[Download the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-high__SplinterCellConviction__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Splinter-Cell-Repossession-SplinterCellConviction-gpt-6-astra-high-20261029-1025.html)

Includes the complete infiltration mission, stealth/search AI, cover/vaulting, takedowns, mark-and-execute, gadgets, checkpoints, extraction, controller menus, and looping attract mode. Serve through **localhost or HTTPS**; CDN dependencies require internet.

**Source information**

- **Date:** 2026-10-29 10:25
- **Source:** Splinter Cell: Conviction; original unofficial tribute.
- **Tech:** Three.js R180, WebGPU exclusively, Rapier 0.19.3, Gamepad API.
- **Art:** Procedural cel shading and ink outlines.
- **Animation:** Articulated procedural characters and state-driven actions.
- **Audio:** Original synthesized music/effects; optional browser-generated speech.
- **Online:** AI Hub Protocol v1, client 1.3.0; 1–4-player parallel score challenges.
- **Environment:** Codex CLI (headless), Linux; target browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort high.
- **Usage:** Cost and tokens unknown; approximately 31 minutes.

**Testing feedback**

32 gameplay/UI checks passed, plus AI Hub checks for one player, two players, and player departure. Three noncritical product issues were found and fixed; zero game-breaking product defects found. Most helpful: mission/controller smoke testing. Least helpful: initially corrupt headless WebGPU captures; rendering was verified in windowed Chromium. WebKit covered menus and the unsupported-WebGPU screen. Physical DualSense and real iOS testing remain unverified.

**Engine feedback**

Three.js scene composition and Rapier movement worked well. Difficulties involved implicit renderer fallback and headless capture. The main custom work was stealth AI, mission logic, and controller UX; coordinating camera, physics, aiming, and HUD was hardest. I would overhaul implicit fallback and add an integrated character/camera system.

**Prompt feedback**

The artistic direction, controller philosophy, and portable deliverable were clear. “All features” left the scope undefined. The hardest part was making the complete mission and systems feel cohesive in one file. The most useful additional test would be a physical DualSense playthrough in a live four-device session.

These details are also embedded in the game’s **Dossier** and top HTML comment.