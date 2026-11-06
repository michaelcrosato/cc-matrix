Built [**Turtley Booked**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-033015__xf7ddb3/work/Turtley-Booked-Turtles-gpt-6.1-sol-max-20261106-033015.html): five floors, 26 rescues, solo, local co-op, and synchronized AI Hub co-op. Open the HTML directly to play.

[Metadata](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-033015__xf7ddb3/work/exit-interview.json) · [Progress](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-033015__xf7ddb3/work/PROGRESS.md)

Verification: **273 full-suite checks passed**, followed by **92 final validation/export checks** with no failures.

**Source Information**

| Field | Details |
|---|---|
| Date | 2026-11-06 03:30:15 |
| Source | Turtles, 1983 US Odyssey² release |
| Plan | PLAN.md |
| Genre | Rescue-maze arcade action |
| Perspective | Fixed overhead 2D |
| Tech | HTML/JavaScript; my-3D2dge 0.89.1; Hub protocol 1/client 1.4.0 |
| Art Direction | Original shaded native pixel art |
| Animation | Native continuous rigs, timers, easing and particles |
| Audio | Code-generated music, effects and gibberish; music defaults to 10% |
| Online | Authoritative 1–2 player co-op, including dedicated hosting |
| Testing | Full campaigns, Hub harness, emulated pads/touch/WebKit, generated audio analysis; no physical hardware or listening test |
| Research | Inspected [manual illustrations](https://odyssey2.info/library/manuals/us_turtles/Turtles%20(USA).pdf) and [documented screenshots](https://odyssey2.info/db/game/turtles-47); original video/audio uninspected |
| Environment | Codex CLI, headless Linux/WSL2 |
| Model | OpenAI gpt-6.1-sol, reasoning effort max |
| Usage | added on import |

**Testing Feedback**

1. Twelve product issues found and fixed.
2. Three were critical: boot syntax, namespace initialization, and Hub presentation.
3. Most helpful: complete campaign through the actual Hub harness.
4. Least informative alone: page-load smoke checks.

**Engine Feedback**

1. Best feature: integrated fixed-step loop, navigation, pixel rendering and rigs.
2. Wrong turns: TV scaling configuration and contextual touch-button creation.
3. Main custom system: deterministic cooperative rescue simulation and replication.
4. Hardest integration: devices, menus and online host lifetime.
5. Engine changes: none; game code extends native facilities.
6. Suggested improvement: a simultaneous shared-world starter kit.

**Prompt Feedback**

1. Best part: concrete rescue relationships and completion gates.
2. Ambiguity: the year identifies multiple ports.
3. Hardest task: validating complete cooperative play in one HTML.
4. Suggested change: distinguish mandatory acceptance checks from tuning suggestions and provide a minimal engine/Hub example.

All source information and feedback are also embedded in About/Credits and the JSON.