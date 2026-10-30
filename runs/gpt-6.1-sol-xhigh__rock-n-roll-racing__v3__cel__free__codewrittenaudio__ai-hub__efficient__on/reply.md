[**Wreck n’ Rocket Racing — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Wreck-n-Rocket-Racing-Rock-n-Roll-Racing-gpt-6.1-sol-xhigh-20261029-0821.html)

Includes three circuits, three chassis, championship progression, upgrades, combat, attract mode, controller settings, and multiplayer. Serve over localhost or HTTPS with WebGPU and internet access.

**Source Information:** Date: 2026-10-29 08:21 PDT. Inspiration: Rock n’ Roll Racing. Title randomly selected from 50 candidates. Tech: Three.js r180/0.180.0, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0. Art: procedural cel shading and ink outlines. Animation: procedural vehicles, suspension, particles and camera. Audio: original synthesized music, effects and gibberish voices. Online: standalone WebRTC rooms and [ai-hub shared-course racing](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub). Environment: Codex CLI headless, Linux; player browser unknown, tested with Chrome 154. Model: OpenAI gpt-6.1-sol, xhigh. Cost/tokens: unknown. Session: approximately 41 minutes.

**Testing Feedback:** Six issues fixed, including two potentially game-breaking problems involving readiness and exhibition results. Eighty checks passed across gameplay, UI, protocol, transport and packaging. Most helpful: complete three-lap simulations. Least helpful: misconfigured initial browser fixtures. Protocol fixtures disable rendering; native WebGPU visuals were checked separately. Software-GPU startup exceeded the hub’s 20-second budget. Four physical controllers remain untested.

**Engine Feedback:** Best: toon materials and scene composition. Stuck on: strict WebGPU and headless setup. Main custom work: arcade handling, combat, progression and networking. Hardest: forgiving physics with remote interpolation. Overhaul: implicit fallback behavior. Desired change: a documented strict-WebGPU constructor option.

**Prompt Feedback:** Best: explicit controller, attract-mode and audio requirements. Unclear: the boundary of “feature-complete.” Hardest: polished multiplayer within one HTML file. Further test: four physical DualSense players over a high-latency connection.

These details are also included in About/Credits and the HTML’s opening comment.