Built [**The Incurable Wizard**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022835__x545a92/work/The-Incurable-Wizard-The-Incredible-Wizard-1982-gpt-6.1-sol-max-20261106-022835.html). Open the HTML locally to play.

**71 checks passed, zero failures.** Includes six chambers, solo/couch/Hub co-op, the complete finale, developer tools, attract mode, and all input methods. [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022835__x545a92/work/exit-interview.json) and [PROGRESS.md](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022835__x545a92/work/PROGRESS.md) are complete.

**Source Information:** Date: 2026-11-06 02:28:35. Source: *The Incredible Wizard* (1982). Plan: PLAN.md. Genre: arcade maze shooter. Perspective: fixed topdown. Tech: my-3D2dge 0.89.1, JavaScript, Canvas 2D, Web Audio, Hub client 1.4.0. Art: original volumetric pixel art. Animation: native rigs and custom procedural animation. Audio: coded music, effects and gibberish; music defaults to 10%. Online: Hub shared-world co-op; standalone couch co-op.

Testing: unlimited headless testing, no FPS gate. Research: [manual](https://ballyalley.com/cart_manuals/text_manuals/incredible_wizard.txt), [scan](https://ballyalley.com/cart_manuals/pdf_manuals/Incredible_Wizard,_The.pdf), [1982 article](https://vgpavilion.com/mags/1982/12/vi/conquering-the-incredible-wizard/), and [hardware footage](https://archive.org/details/IncredibleWizardBallyArcadeAstrocade1982). Exact historical AI/synthesis: unknown. Environment: Codex CLI, headless Linux. Model: OpenAI, gpt-6.1-sol, reasoning effort max. Usage: **added on import**.

**Testing Feedback**

1. Fixed 13 distinct implementation issues.
2. Two were critical: broken packaged JavaScript and blocked familiar routes.
3. Most helpful: complete command-driven campaigns and two-peer combat verification.
4. Least helpful: the initial title-only smoke test.

Physical-device performance, human listening and human first-run pacing remain unknown. The automated Normal campaign took 9:54.

**Engine Feedback**

1. Best feature: coherent native rigs, materials and rendering.
2. Initially misread `TileMap.center`’s return shape; verified and corrected it.
3. Main custom system: deterministic campaign simulation and network authority.
4. Hardest integration: coordinates and input ownership across devices.
5. No engine source edits; added native assets and game adapters.
6. Suggested improvement: a serializable, simultaneous-seat arcade simulation.

**Prompt Feedback**

1. The one-bolt/radar pillars gave clear direction.
2. Naming precedence and human pacing targets needed interpretation.
3. Hardest task: integrating the campaign, devices and multiplayer into one HTML.
4. Suggested change: separate mandatory acceptance criteria from tuning targets and human validation.