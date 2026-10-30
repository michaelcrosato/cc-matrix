Created [**Boulevard Brawler Alpha — single HTML game**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Boulevard-Brawler-Alpha-Street-Fighter-Alpha-2-gpt-6.1-sol-xhigh-20261029-0841.html).

Includes three fighters, arcade circuit, eleven training drills, local versus, online rooms, AI Hub multiplayer, and attract mode. Serve over localhost or HTTPS; WebGPU and internet are required.

**Source Information:** Date: 2026-10-29 08:41. Source: Street Fighter Alpha 2. Tech: Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1/client 1.3.0. Art: original procedural cel-shaded 3D. Animation: procedural joint poses and attack curves. Audio: code-written music, effects, and gibberish voices. Online: local two-player, PeerJS 2–4, AI Hub 1–4. Environment: Codex CLI headless, Linux; tested with Chrome 154; player browser unknown. Model: OpenAI gpt-6.1-sol, xhigh. Usage: API cost and tokens unknown; session approximately 40 minutes.

**Testing Feedback:** Passed 15 combat/round checks, emulated controller and inversion checks, attract mode, six hub scenarios, and standalone online hit exchange. Hub tests used 150 ms latency, 50 ms jitter, and 5% loss. Testing caught three game issues, two critical, all fixed; one additional headless compositor issue required GPU texture readback. Most helpful: the official hub harness. Least helpful: initial headless swapchain screenshots.

**Engine Feedback:** Best: scene composition and TSL shading. Trouble: automatic backend fallback and headless capture. Most important custom system: buffered fighting states and combat resolution. Hardest: prediction and independent simulation scheduling. Overhaul: WebGPU diagnostics. Desired addition: native WebGPU toon lighting.

**Prompt Feedback:** Best: clear inspiration and controller focus. Confusing: the boundary of “feature-complete.” Hardest: combining combat depth, original art, and networking in one file. Additional desired test: physical DualSense controllers on two remote machines.

This information is also embedded in the opening HTML comment and in-game credits.