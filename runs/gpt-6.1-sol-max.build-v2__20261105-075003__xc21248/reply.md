Built **Fare Cry — Every debt leaves a mark.**

[Play Fare Cry](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-075003__xc21248/work/Fare-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-075003.html) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-075003__xc21248/work/exit-interview.json) · [Source guide](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-075003__xc21248/work/Fare-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-075003/docs/DESIGNER.md) · [Progress](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-075003__xc21248/work/PROGRESS.md)

Open the HTML directly. Dependencies, fonts and audio generation are embedded.

**Verification:** 42 checks passed, zero failed; 66/66 features exercised, 86% attract coverage, and 24 viewport/browser combinations checked.

**Source Information**

| Field | Details |
|---|---|
| Date | 2026-11-05 07:50:03 |
| Source / Plan | Far Cry 2 / PLAN.md |
| Genre | Open-world shooter, stealth and survival |
| Perspective | First-person, with scripted attract views |
| Tech | Three.js 0.180.0, WebGPU/TSL, WebGL2 fallback, Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2 |
| Art | Procedural cel shading, ink outlines, cross-hatching and paper grain |
| Animation | AnimationMixer, authored skeletal clips and procedural motion |
| Audio | Original synthesized music, effects and gibberish voices; music defaults to 10% |
| Online | AI Hub shared-world co-op for 1–4; same-computer BroadcastChannel co-op |
| Testing | Full campaign and endings, virtual controller, touch profiles, offline audio, Chromium, WebKit, Firefox and official Hub harness. Physical controllers and real iOS hardware were unavailable. |
| Research | Provided plan/task, [AI Hub protocol](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md), local engine/toolkit sources and published licence notices |
| Environment | Codex CLI, headless Linux |
| Model | OpenAI gpt-6.1-sol, reasoning effort max |
| Usage | added on import |

**Testing Feedback**

1. Found and corrected 24 gameplay or presentation issues. Environmental memory/capture failures were tracked separately.
2. Seven could block gameplay or sessions: opening movement, unrelated cargo failure, session deadlines, held-map texture initialization, client input forwarding, windshield visibility and convoy escape recovery.
3. Most useful: the input-driven campaign covering twists, errands, retries and all three endings.
4. Least informative: the title-only smoke check, which missed interaction and mission bugs.

**Engine Feedback**

1. Best feature: one TSL treatment across WebGPU and WebGL2.
2. Difficulties: canvas initialization and software frames delaying network messages.
3. Largest custom system: the deterministic simulation connecting fire, survival, combat, vehicles, story consequences and co-op.
4. Hardest part: keeping graphics work from blocking session traffic.
5. Engine changes: none; packages remain unmodified.
6. Desired improvement: lighter startup and clearer canvas/MRT diagnostics.

**Prompt Feedback**

1. Strongest part: the original setting, interacting systems and verified rendering recipes.
2. Unclear boundary: the vertical slice encompassed a full campaign.
3. Hardest requirement: connecting all systems through campaign and multiplayer play.
4. Suggested improvement: one machine-readable acceptance list shared by the plan, task and tests.

These records are also included in the game’s About screen and the exit interview.