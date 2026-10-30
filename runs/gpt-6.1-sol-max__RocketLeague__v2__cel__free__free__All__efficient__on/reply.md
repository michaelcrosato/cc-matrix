Built [**Throttle League**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__RocketLeague__v2__cel__free__free__All__efficient__on/work/Throttle-League-RocketLeague-gpt-6.1-sol-max-20261028-2218.html).

Single HTML, 214 KB. Includes four-player split screen and online rooms, three match modes, seven training activities, garage customization, replays, overtime, and the 10-second attract demo. Requires WebGPU and internet for CDN dependencies.

**Source information**

- **Date / source:** 2026-10-28 22:18 America/Vancouver, session start. Inspired by Rocket League.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, PeerJS 1.5.5/WebRTC, Web Audio, Gamepad API, HTML/CSS/JavaScript.
- **Art / animation:** Original procedural cel-shaded geometry; rigid-body physics, procedural animation, camera interpolation, recorded replays.
- **Audio:** Original synthesized music and effects; no recorded voices.
- **Online:** Four-player host-authoritative rooms using WebRTC/STUN; no TURN relay.
- **Environment / model:** Codex CLI, headless Linux/WSL2. End-user browser unknown. OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** Approximately one hour. API cost in USD, token total, and breakdown: unknown.

**Testing feedback:** All **46 lightweight checks passed**, including four real WebRTC peers on one machine. Four game issues were caught and fixed; one was critical: incorrect split-screen player assignment. Physics/contact tests and four-view screenshots were most helpful. Static build checking found no gameplay problems. Tests used headless Chromium 141 with software Vulkan WebGPU; physical PS5 controllers and cross-network NAT behavior remain unknown.

**Engine feedback:** Toon materials and Rapier’s API worked well. I initially assumed the wrong viewport origin and had to disable Three’s [automatic graphics fallback](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPURenderer.js). The most important custom system was the car controller. Wall/ceiling adhesion and network/replay coordination were hardest. I would overhaul implicit fallback behavior and add an explicit WebGPU-only initialization option.

**Prompt feedback:** The concrete versions, controller philosophy, and attract requirement were useful. “All modes that make sense” was open-ended. Combining polished physics, split screen, and networking in one file was hardest. The additional test I would run is four physical PS5 controllers across separate home networks.

These details are also in **About / Credits** and the HTML’s top comment.