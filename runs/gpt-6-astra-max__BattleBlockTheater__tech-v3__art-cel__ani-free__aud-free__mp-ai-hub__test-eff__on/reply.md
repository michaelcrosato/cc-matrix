[**Download PrattleBlock Playhouse**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__BattleBlockTheater__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/PrattleBlock-Playhouse-BattleBlockTheater-gpt-6-astra-max-20261029-0952.html)

Complete single-file demo: three acts, physics puzzles, enemies, boss encounter, costume unlocks, controller menus, couch/online co-op, and ten-second attract mode. Requires WebGPU; dependencies load from CDNs.

[Development files and authoring instructions](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__BattleBlockTheater__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/PrattleBlock-Playhouse-BattleBlockTheater-gpt-6-astra-max-20261029-0952/README.md)

| Source Information | Details |
|---|---|
| Date | 2026-10-29 10:58 |
| Source | BattleBlock Theater |
| Tech | Three.js r180, WebGPU only, Rapier 2D 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript |
| Art direction | Cel-shaded paper puppets and theatrical scenery |
| Animation | Procedural articulation, squash/stretch, fixed-step physics |
| Audio | Original synthesized music, effects, and nonverbal narrator mumbling |
| Online | 1–4-player co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0; two-player couch co-op |
| Testing | Lightweight Playwright checks; phone, tablet, landscape, ultrawide, and WebKit layouts |
| Environment | Codex CLI (headless); Linux; browser unknown |
| Model | OpenAI, gpt-6-astra, reasoning effort max |
| Usage | API cost and tokens unknown; approximately 65 minutes |

**Testing Feedback:** 45 focused checks and five hub scenarios passed. Testing and review caught **10 issues**, including **one potential results-menu softlock**; all were corrected. The most helpful test exercised individual gameplay mechanics. The least helpful was the initial headless launch without usable WebGPU. Physical controllers and real iOS Safari remain untested; WebKit checks covered compatibility and settings.

**Engine Feedback:**

- **Liked most:** Toon materials alongside Rapier’s character queries.
- **Wrong turns:** Headless GPU configuration, transparent outlines, and spring/jump interactions.
- **Built myself:** Platforming controls, stage loading, controller navigation, and shared-world synchronization.
- **Hardest:** Immediate local movement with host-owned puzzle state.
- **Overhaul:** Make automatic renderer fallback opt-in.
- **Change:** Provide a documented character/controller/UI starter.

**Prompt Feedback:**

- **Liked most:** Clear theatrical identity, controller priorities, and packaging constraints.
- **Confusing:** Standalone lobby expectations and exact demo length were unspecified.
- **Hardest:** Integrating the complete solo/co-op experience into one HTML.
- **Additional test:** A live AI Hub session across two physical devices using real DualSense controllers.

These notes are also included in the in-game credits and opening HTML comment.