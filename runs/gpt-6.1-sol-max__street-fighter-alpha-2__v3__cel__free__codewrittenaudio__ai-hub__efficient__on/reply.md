[**Download Street Fighter: Neon Nerves**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Street-Fighter-Neon-Nerves-Street-Fighter-Alpha-2-gpt-6.1-sol-max-20261029-0625.html) — **3.27 MiB**, fully self-contained. WebGPU required.

Includes four fighters, two arenas, arcade story, ten training lessons, local versus, online rooms, and a looping attract mode. Source information and feedback also appear in About/Credits and the opening HTML comment.

**Source Information**

- **Date:** 2026-10-29 07:20 PDT.
- **Source:** Street Fighter Alpha 2.
- **Tech:** Three.js r180, WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio API; PeerJS 1.5.5; AI Hub Protocol v1.
- **Art:** Original procedural 3D art with three-tone cel shading and ink outlines.
- **Animation:** Articulated procedural rigs, combat poses, locomotion, reactions, and afterimages.
- **Audio:** Code-written synth music, effects, and formant-generated gibberish voices.
- **Online:** Two-player WebRTC rooms and 1–4-player [AI Hub sessions](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Testing:** Lightweight validation: **21 combat assertions and 49 hub checks passed**, plus browser acceptance and real WebRTC movement checks.
- **Environment:** Codex CLI (headless), Linux/WSL2; user browser unknown. Tested with Chrome for Testing 156.0.8078.4 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token totals/breakdown unknown; estimated session time approximately 55 minutes.

**Testing Feedback**

- **Issues caught:** Seven implementation issues and one browser-configuration issue; all fixed.
- **Critical:** One potentially game-breaking multiplayer departure/seat-ownership issue, fixed.
- **Most helpful:** Dedicated-server hub conformance with simulated latency, jitter, packet loss, and controller input.
- **Least helpful:** Syntax-only checking.

**Engine Feedback**

- **Liked most:** Cel-shading materials and reliable Rapier contacts.
- **Got stuck:** Headless WebGPU adapter setup and r180’s [implicit WebGL fallback](https://raw.githubusercontent.com/mrdoob/three.js/r180/src/renderers/webgpu/WebGPURenderer.js).
- **Built myself:** Combat timing, cancels, guarding, AI, and network reconciliation.
- **Hardest:** Coordinating physics, animation, and online authority.
- **Would overhaul:** Implicit fallback behavior.
- **Would change:** Add an explicit WebGPU-only constructor option with actionable errors.

**Prompt Feedback**

- **Liked most:** The controller, art, audio, and attract-mode constraints.
- **Confusing:** Filename `SOURCE` substitution and the extent of “feature-complete.”
- **Hardest:** Combining fighting mechanics, original presentation, and two multiplayer transports in one file.
- **Extra test desired:** Physical DualSense play across separate networks under 250 ms latency and packet loss; those conditions remain unverified.