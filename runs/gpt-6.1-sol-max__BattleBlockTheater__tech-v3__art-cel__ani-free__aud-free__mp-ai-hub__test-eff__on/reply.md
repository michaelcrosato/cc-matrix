Completed [**RattleBlock Revue — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__BattleBlockTheater__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/RattleBlockRevue-BattleBlockTheater-gpt-6.1-sol-max-20261029-1441.html).

The 3.3 MB release includes three acts, a boss finale, physics puzzles, couch and online co-op, costumes, a stage editor, and the ten-second AI attract mode. Open it in a WebGPU-capable browser.

**Source Information**

- **Date / source:** 2026-10-29 14:41; BattleBlock Theater.
- **Tech:** Three.js r180 / 0.180.0, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS.
- **Art:** Original cel-shaded scenery with ink outlines.
- **Animation:** Procedural puppet rigs, squash and stretch, particles, scripted replay.
- **Audio:** Original synthesized music and effects; optional system narration, exact voice unknown.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) client 1.3.0 / Protocol v1; 1–4-player shared co-op.
- **Environment:** Codex CLI (headless); Linux; browser unknown at authoring.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token count unknown; approximately 47 minutes.

**Testing Feedback**

Eight issues were caught, including two critical defects; all were corrected. Gameplay, controller, editor, completion, and all five hub scenarios passed. Lightweight Playwright checks covered six viewport configurations, Chromium WebGPU, and WebKit’s requirement/settings UI. Linux WebKit lacked WebGPU; real Safari and physical DualSense testing were unavailable.

Most helpful: the controller/physics playthrough with stage reloads. Least helpful: static markup inspection.

**Engine Feedback**

- **Liked most:** Scene composition and Rapier’s movement queries.
- **Wrong assumptions:** WASM callback borrowing and input edges surviving between physics ticks.
- **Most important custom work:** Movement, stage progression, editor, and co-op systems.
- **Hardest part:** Combining local prediction with shared physics.
- **Overhaul:** Implicit renderer fallback.
- **One change:** A supported WebGPU-only initialization flag.

**Prompt Feedback**

- **Liked most:** Clear creative direction with implementation freedom.
- **Confusing:** “All features” has no finite inventory.
- **Hardest:** Completing the polished slice alongside shared-world networking.
- **Additional test:** Four people using real DualSense controllers across different devices and internet connections.

These details are also embedded in About/Credits and the HTML’s opening comment.