Created [**Bumper Derby Riot — Playable HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Bumper-Derby-Riot-Destruction-Derby-2-gpt-6.1-sol-xhigh-20261029-0831.html).

Includes three cars, three disciplines, championship, damage and spin scoring, repairs, boost, replay, split-screen, and AI attract mode. Serve through localhost or HTTPS; WebGPU is required. Dependencies load from CDNs.

**Source Information**

- Date: **2026-10-29 09:04**, America/Vancouver.
- Inspiration: **Destruction Derby 2**. Title randomly selected from 50 candidates.
- Tech: Three.js **r180**, WebGPU only, Rapier **0.19.3**, Gamepad API, Web Audio, AI Hub client **1.3.0**.
- Art: procedural cel-shaded cars and stadium with ink edges.
- Animation: physics-driven vehicles/debris, procedural wheels and panels, buffered replay.
- Audio: original synthesized music, effects, engines, and gibberish announcer.
- Multiplayer: **1–4 online through ai-hub**; **two-player local split-screen** standalone.
- Environment: Codex CLI, headless Linux; target browser unknown. Tested with Chrome for Testing **156.0.8078.4**.
- Model: OpenAI **gpt-6.1-sol**, reasoning effort **xhigh**.
- Usage: API cost and tokens **unknown**; session approximately **33 minutes**.

**Testing Feedback**

65 gameplay/protocol checks passed, plus touch-only notice/settings checks. Testing caught **5 issues, including 2 game-breaking issues**, all fixed. Most helpful: ai-hub’s controller conformance harness. Least helpful: syntax-only checks, which missed runtime failures. Physical DualSense and cross-GPU matches remain untested.

**Engine Feedback**

Toon materials and Rapier bodies worked well. Texture binding required explicit TSL nodes; headless capture needed Vulkan configuration. The main custom systems were driving, damage, scoring, and event progression. Network prediction with host-owned collisions was hardest. I would overhaul automatic renderer fallback and add an integrated vehicle/networking example.

**Prompt Feedback**

The controller-first rules, attract mode, and single-file requirement gave clear direction. Standalone online expectations were ambiguous; online uses ai-hub, while standalone multiplayer uses split-screen. Completing the whole game loop was hardest. The additional test I would run is a four-person DualSense match across GPUs with 250 ms latency and disconnects.

These details are also embedded in the opening HTML comment and in-game About screen.