[**Play Command & Carnival**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command-and-Carnival-SOURCE-gpt-6.1-sol-ultra-20261029-0753.html) — complete single-file RTS demo, approximately 3 MB. WebGPU required.

Includes construction, harvesting, production, combined arms, territory capture, support powers, fog, enemy waves, controller menus, attract mode, and co-op.

**Source information:** Date: 2026-10-29 07:53, America/Vancouver. Inspiration: Command & Conquer. Stack: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.3.0, PeerJS 1.5.5. Art: procedural cel-shaded desert diorama. Animation: procedural model transforms and particles. Audio: code-written synth music, effects, and gibberish voices. Online: shared-army co-op for 1–4 through AI Hub or standalone WebRTC rooms.

Environment: Codex CLI, headless Linux; target browser unknown, tested with Chrome. Model: OpenAI gpt-6.1-sol, ultra reasoning. API cost and token usage: unknown. Session: approximately 38 minutes.

**Testing feedback:** Found and fixed 9 issues, including 2 critical issues involving hub cursor IDs and controller sampling. Passed 10 simulation checks, a complete normal-economy mission, WebGPU/controller smoke tests, real WebRTC exchange, and **24/24 official hub checks**. Most helpful: hub conformance testing. Least helpful: syntax-only checks. Physical PS5-controller testing was not performed.

**Engine feedback:** Best feature: scene composition and node materials. Got stuck on headless Vulkan launch flags; corrected them for WebGPU verification. Most important custom work: the RTS simulation and controller command system. Hardest integration: graphics startup with responsive controls. I would overhaul automatic WebGL fallback and add clearer WebGPU readiness/material diagnostics.

**Prompt feedback:** The controller, audio, and packaging constraints gave clear direction. “Feature-complete demo” left campaign size open; this delivers one complete replayable operation. Controller command depth was hardest. The additional test I’d choose: four people using physical controllers on a television.

All requested information and feedback are also in the in-game About screen and the HTML’s opening comment.