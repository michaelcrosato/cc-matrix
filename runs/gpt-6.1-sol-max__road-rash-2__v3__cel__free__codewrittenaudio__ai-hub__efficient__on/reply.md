[**Play Tarmac Tantrum**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v17__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Tarmac-Tantrum-Road-Rash-II-gpt-6.1-sol-max-20261029-0616.html)

Complete single-file demo with three championship stages, garage upgrades, melee combat, police, jumps, crash recovery, attract mode, split screen, and AI Hub racing. The title was randomly selected from 50 candidates. Requires WebGPU and internet for CDN dependencies; direct-file launch was verified.

**Source Information**

- **Date:** 2026-10-29 07:16, America/Vancouver.
- **Source:** Road Rash II.
- **Tech:** Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad and Web Audio APIs; AI Hub client 1.3.0; esbuild 0.25.11.
- **Art:** Original procedural cel-shaded 3D with ink outlines.
- **Animation:** Procedural rider poses, wheel rotation, suspension, melee and Rapier ragdolls.
- **Audio:** Original code-written music, synthesized effects and gibberish voices.
- **Online:** 1–4-player AI Hub racing. Standalone multiplayer uses two-player split screen.
- **Environment:** Codex CLI, headless Linux/WSL2; tested in Chrome 154.0.8037.57. Player browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost in USD unknown; token total and breakdown unknown; approximately 59 minutes.

**Testing Feedback**

- **Results:** 64 checks passed: 33 gameplay/device, 24 four-player hub conformance, seven network mechanics checks.
- **Issues:** 13 fixed across testing and integration review; one critical method collision. A separate headless graphics setup issue was resolved.
- **Most helpful:** Two-client combat and pickup tests exposed stale remote protection state.
- **Least helpful:** Syntax checks could not assess appearance or handling.
- **Parameters:** Lightweight headless checks with emulated gamepads, 80 ms network latency, jitter and 5% packet loss. No FPS benchmark.

**Engine Feedback**

- **Liked most:** Scene graphs, toon materials and Rapier collision events.
- **Got stuck:** Material cloning lost color; headless WebGPU required Vulkan configuration.
- **Built myself:** Arcade bike handling, combat, race flow and network ownership.
- **Hardest part:** Immediate steering combined with physical contact and recovery.
- **Overhaul:** Implicit renderer fallback.
- **One change:** A first-party arcade vehicle controller.

**Prompt Feedback**

- **Liked most:** Clear source, visual, audio and controller constraints.
- **Confusing:** “Feature-complete” left the demo boundary open.
- **Hardest:** Combining polished standalone play and multiplayer in one HTML.
- **Further test:** Four physical DualSense controllers across mixed hardware and real networks.

This information is also included in **About/Credits** and the HTML’s opening comment.