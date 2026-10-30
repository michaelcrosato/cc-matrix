Created [Bardur’s Fate — single HTML demo](./Bardurs-Fate-Baldurs-Gate-gpt-6.1-sol-max-20261029-0327.html).

Includes four companions, tactical pause, queued abilities, branching quests, equipment, talents, saves, two endings, couch co-op, AI Hub online co-op, and attract mode. Serve over HTTPS or localhost; CDN dependencies load online.

**Source information:**

- **Date:** 2026-10-29 04:12 America/Vancouver.
- **Source:** Baldur’s Gate; original setting, characters, and assets.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript.
- **Art:** Cel shading, faceted procedural models, ink outlines.
- **Animation:** Procedural articulated rigs, locomotion, attacks, environmental motion, particles.
- **Audio:** Code-written music, synthesized effects, Animalese-style gibberish voices.
- **Online:** AI Hub co-op; standalone multiplayer uses couch controllers.
- **Environment:** Codex CLI (headless), Linux; player browser unknown.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** Approximately 45 minutes at packaging; API cost and token counts unknown.

**Testing feedback:** All 23 chapter checks, 24 player-hosted hub checks, and 25 dedicated-server checks passed. Eight application issues were caught and fixed; one was game breaking: disposing shared geometry invalidated GPU buffers. The quest-to-ending test was most helpful; syntax checking was least informative.

Testing used Chromium 153 under Xvfb/software Vulkan, emulated controllers, and shortened encounter fixtures. Hub conditions were 60 ms latency, 20 ms jitter, and no packet loss. No FPS testing was performed. Touch-only messaging, settings access, controller scrolling, and feedback screens also passed.

**Engine feedback:**

- **Liked most:** Toon materials and procedural geometry.
- **Wrong assumption:** Expiring spell effects owned geometry that scenery also shared.
- **Most important custom work:** Party combat, quests, progression, saves, and network authority.
- **Hardest part:** GPU resource lifetimes alongside responsive input and simulation.
- **Would overhaul:** Implicit graphics-backend fallback.
- **Would change:** Add a public strict-WebGPU option and clearer resource-disposal diagnostics.

**Prompt feedback:**

- **Liked most:** Concrete art, controller, attract-mode, and packaging requirements.
- **Confusing:** “All features” leaves the full RPG scope unbounded.
- **Hardest:** Completing a coherent chapter and synchronized multiplayer in one file.
- **Further test wanted:** Four physical DualSense clients on separate machines with 250 ms latency and packet loss.

All source information and feedback are also embedded in About/Credits and the HTML’s opening comment.