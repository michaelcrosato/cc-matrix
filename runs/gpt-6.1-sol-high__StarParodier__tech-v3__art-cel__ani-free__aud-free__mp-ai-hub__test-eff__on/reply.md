Built [**Star Buffoon — single-file game**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-high__StarParodier__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Star-Buffoon-Star-Parodier-gpt-6.1-sol-high-20261029-1541.html).

Includes three pilots, upgradeable weapons, three sectors, two bosses, score attack, synthesized audio, controller menus, and looping attract mode. Serve over HTTPS or localhost; WebGPU and internet access for CDN dependencies are required.

**Source Information**

- Date: 2026-10-29 15:41, America/Vancouver.
- Inspiration: Star Parodier. Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, HTML/CSS/JavaScript.
- Art: procedural cel-shaded 3D with ink outlines.
- Animation: procedural banking, wobble, enemy paths, and particles.
- Audio: original synthesized music and effects; no voice.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) 1.3.0, parallel score competition for 1–4 players.
- Environment: Codex CLI (headless); Linux; development browser unknown.
- Model: OpenAI, gpt-6.1-sol, reasoning effort high.
- Usage: cost and token count unknown; session approximately 19 minutes.

**Testing Feedback**

Lightweight testing caught **7 issues, including 2 critical faults; all fixed**. Full-tour, restart, controller, inversion, and two-player Hub checks passed. Phone, tablet, and ultrawide layouts were inspected without overflow. WebKit verified the capability notice and settings; its automated build lacked WebGPU.

Most helpful: full-tour/restart integration testing. Least helpful: syntax-only checking, which missed a runtime error.

**Engine Feedback**

Liked most: expressive procedural scene graphs. Wrong assumptions involved automatic renderer fallback and physics cleanup. The largest custom systems were stage sequencing, weapons, patterns, and controller navigation. Coordinating GPU initialization and physics was hardest. I would overhaul implicit fallback and add stable WebGPU toon/outline tooling.

**Prompt Feedback**

Liked most: the arcade reference and controller-first direction. Multiplayer format was unspecified; I chose parallel competition. The hardest part was fitting complete progression and polish into one portable file. The additional test I would run is a four-player session using physical DualSense controllers across real WebGPU devices.

These details are also included in About and the HTML’s opening comment.