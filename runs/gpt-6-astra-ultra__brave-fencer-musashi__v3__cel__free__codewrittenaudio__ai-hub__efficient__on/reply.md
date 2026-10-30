[**Play Bramble Fencer Mochi**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v19__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Bramble-Fencer-Mochi-Brave-Fencer-Musashi-gpt-6-astra-ultra-20261029-1053.html)

Completed single-file adventure with skill borrowing, elemental puzzles, village services, rescues, boss fight, saving, co-op, and a 10-second attract mode. Requires WebGPU and internet for CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 10:53, America/Vancouver.
- **Inspiration:** Brave Fencer Musashi. Original characters, world, dialogue, and audio.
- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Session Protocol v1.
- **Art:** Procedural cel-shaded storybook scenery and characters.
- **Animation:** Articulated procedural rigs and environmental animation.
- **Audio:** Code-written adaptive music, synthesized effects, and gibberish voices.
- **Online:** 1–4-player AI Hub/standalone co-op; two-controller local co-op.
- **Environment:** Codex CLI, headless Linux. Player browser unknown; tested in Chrome 154.0.8037.57.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** Approximately 35 minutes. API cost and token counts unknown.

**Testing Feedback**

- Testing and review found **21 issues**, including **6 game-breaking or integration-blocking issues**; all addressed.
- Passed **28 gameplay checks**, **10 traversal waypoints**, **49 hub checks**, **8 real WebRTC checks**, and **3 navigation regressions**. Final HTML also passed direct-file startup and credits checks.
- Most helpful: accelerated complete-quest testing and actual two-browser co-op.
- Least helpful: CPU-only geometry checks, which missed rendering problems.
- Testing remained lightweight; no performance benchmarking.

**Engine Feedback**

- **Best:** Three.js’s procedural flexibility and Rapier’s reliable character collision.
- **Unexpected:** Toon-material cloning lost colors; WebGPU rejected `LineLoop`. Both were corrected.
- **Largest custom system:** Combat, progression, persistence, controller UI, and shared-world synchronization.
- **Hardest:** Synchronizing guest combat, respawns, and boss warnings.
- **Overhaul:** Implicit rendering-backend fallback.
- **Desired change:** A stable, documented WebGPU-only configuration.

**Prompt Feedback**

- **Best:** Clear inspiration, controller-first UX, and portable delivery requirements.
- **Confusing:** “All features” has an open-ended scope; this implements one complete chapter.
- **Hardest:** Making the broad gameplay and multiplayer systems feel cohesive.
- **Additional test:** A full four-person playthrough using physical DualSense controllers across separate networks.

These details are also included in **Settings → About** and the HTML’s opening comment.