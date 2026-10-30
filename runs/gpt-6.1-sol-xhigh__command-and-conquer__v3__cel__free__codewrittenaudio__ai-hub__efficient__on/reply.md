[**Play Command & Conjure**](./Command-and-Conjure-Command-and-Conquer-gpt-6.1-sol-xhigh-20261029-0821.html)

Completed single HTML demo with base building, harvesting, production, squad combat, relay capture, upgrades, abilities, enemy escalation, attract mode, and co-op. Requires WebGPU and Internet access for CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 09:22, America/Vancouver.
- **Source:** Command & Conquer.
- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1.
- **Art:** Procedural cel-shaded industrial fantasy.
- **Animation:** Procedural troops, turrets, machinery, projectiles, and physics debris.
- **Audio:** Original synthesized music, effects, and gibberish radio voices.
- **Online:** 1–4 player shared-command co-op through ai-hub and standalone room codes.
- **Testing allowed:** Efficient, lightweight checks; no FPS benchmark.
- **Environment:** Codex CLI, headless Linux; player browser unknown. Tested with Chrome 154 and Xvfb.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** API cost and tokens unknown; approximately 60 minutes.

**Testing Feedback**

32 simulation assertions, five transport checks, 21 controller/menu checks, five hub scenarios, standalone WebRTC, and a reference mission victory passed.

- **Issues caught:** Six, all fixed.
- **Critical/game-breaking:** Two initialization/runtime blockers.
- **Most helpful:** The official multiplayer harness.
- **Least helpful:** Syntax-only checks, which missed runtime integration failures.

**Engine Feedback**

- **Liked most:** Toon materials and reusable geometry.
- **Wrong guesses:** Rapier descriptor methods and canvas initialization; corrected through testing.
- **Built myself:** RTS systems, controller commands, networking, procedural assets, and audio.
- **Hardest part:** Coordinating WebGPU initialization across browser contexts.
- **Would overhaul:** Automatic renderer fallback.
- **Would change:** Add a public strict-WebGPU option.

**Prompt Feedback**

- **Liked most:** The clear controller, art, audio, and attract-mode requirements.
- **Confusing:** “Feature-complete” has an open-ended boundary; this delivers one complete operation with reusable systems.
- **Hardest:** Combining controller-friendly RTS depth and two co-op transports.
- **Additional test:** Four physical DualSense controllers across separate Internet connections.

These details are also included in Credits and the HTML’s opening comment.