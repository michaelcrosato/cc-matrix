Built [**Splinter Cell: Night Deposit**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-high__SplinterCellConviction__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Splinter-Cell-Night-Deposit-SplinterCellConviction-gpt-6.1-sol-high-20261029-1540.html).

Single HTML with stealth, mark-and-execute, gadgets, checkpoints, a looping attract demo, and 1–4-player AI Hub co-op. Serve over **HTTPS or localhost**; WebGPU is required.

**Source Information**

- **Date:** 2026-10-29 15:40 — requested build stamp.
- **Source:** Splinter Cell: Conviction.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API.
- **Art:** Procedural cel-shaded environments and characters.
- **Animation:** Procedural joints, gait cycles, takedowns, vaults and execution sequences.
- **Audio:** Original synthesized music/effects; optional browser-generated speech.
- **Online:** AI Hub Protocol v1, client 1.3.0; shared co-op.
- **Environment:** Codex CLI, headless Linux; initial browser unknown.
- **Model:** OpenAI gpt-6.1-sol, high reasoning effort.
- **Usage:** Cost, tokens and session duration unknown.

**Testing Feedback:** Fixed three UI issues; zero critical game defects found. Passed 22 scripted gameplay checks, nine final smoke checks, and 97 checks across four multiplayer scenarios. Phone, tablet and ultrawide screenshots were inspected. WebKit menus passed, but this machine’s WebKit lacks WebGPU, so Safari gameplay remains unverified. Most helpful: gameplay inputs and impaired-network co-op tests. Least helpful: repeated static title screenshots.

**Engine Feedback:** Three’s scene graph and toon materials worked well. Headless GPU configuration caused the main blockage. The largest custom systems were stealth perception, navigation and combat. Coordinating physics, occlusion and replicated state was hardest. I would overhaul automatic renderer fallback and add clearer WebGPU-only diagnostics.

**Prompt Feedback:** The complete-slice scope and controller-first requirements were useful. Online mode and practical device coverage needed interpretation. Combining polished stealth and co-op in one file was hardest. The additional test I’d choose is four physical DualSense controllers across real devices, including Safari.

These details are also included in About / Credits and the HTML’s opening comment.