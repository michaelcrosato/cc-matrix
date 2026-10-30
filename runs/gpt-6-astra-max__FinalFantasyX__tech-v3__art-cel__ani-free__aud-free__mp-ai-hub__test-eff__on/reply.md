Built **[Fantasy at Last — single HTML game](</home/micha/dev/cc-matrix/runs/gpt-6-astra-max__FinalFantasyX__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Fantasy at Last-Final Fantasy X-gpt-6-astra-max-20261029-0952.html>)**.

Includes the complete island chapter, tactical party combat, progression, shrine puzzle, summon, tideball, ending, saves, attract mode, and AI Hub trial. Open through HTTPS or localhost with WebGPU enabled. CDN access and a controller or keyboard are required.

[Development and testing notes](</home/micha/dev/cc-matrix/runs/gpt-6-astra-max__FinalFantasyX__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Fantasy at Last-Final Fantasy X-gpt-6-astra-max-20261029-0952/README.md>)

**Source Information**

- **Date:** 2026-10-29 09:52, America/Vancouver.
- **Source:** Final Fantasy X. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, JavaScript/HTML/CSS, AI Hub client 1.3.0.
- **Art:** Original procedural, cel-shaded 3D.
- **Animation:** Hierarchical rigs, procedural movement and cloth, combat tweens and particles.
- **Audio:** Original synthesized music/effects; optional browser speech. Installed voice unknown.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) parallel trial for 1–4 players.
- **Testing:** Lightweight functional, controller, viewport and hub checks; no performance targets.
- **Environment:** Codex CLI headless; Linux; user browser unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** Cost and tokens unknown; approximately 70 minutes.

**Testing Feedback:** Testing and review found **12 issues, including 2 blockers**; all were fixed. Chapter, recovery, controller and packaging checks passed. Hub runs passed **24/24** for one player, two players, and player departure. Most helpful: the chapter playthrough through ending and save/continue. Least helpful: adapter detection alone—it missed an initial rendering failure. WebKit checks covered requirements/settings because this machine’s WebKit lacked WebGPU.

**Engine Feedback**

- **Liked:** Scene composition and Rapier collision.
- **Stuck:** Implicit renderer fallback, a legacy material option, and headless GPU configuration.
- **Built:** Turn scheduler, party systems, progression, saves and controller navigation.
- **Hardest:** Coordinating animation, state transitions and focus.
- **Overhaul:** Make renderer fallback explicitly opt-in.
- **Change:** Add built-in controller focus management.

**Prompt Feedback**

- **Liked:** Clear source, art direction and controller priorities.
- **Confusing:** “All features” versus a bounded vertical slice.
- **Hardest:** Making the interconnected systems feel like one complete chapter.
- **Additional test:** Four remote players using physical DualSense controllers and televisions.

Required source information and feedback are also embedded in About/Credits and the opening HTML comment.