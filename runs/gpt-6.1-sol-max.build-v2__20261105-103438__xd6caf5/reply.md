Built [Diabellum](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-103438__xd6caf5/work/Diabellum-Diablo 3-gpt-6.1-sol-max-20261105-103438.html>). Open the HTML directly to play.

[Development files](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-103438__xd6caf5/work/Diabellum-Diablo 3-gpt-6.1-sol-max-20261105-103438/README.md>) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-103438__xd6caf5/work/exit-interview.json) · [Progress](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-103438__xd6caf5/work/PROGRESS.md)

Four heroes, three chapters and ending, loot, couch/Hub co-op, and the Long Vigil are included. Campaign areas are condensed; optional mocap and WebGPU lighting are omitted.

The full test command passed **3,097 checks**. Final browser regressions passed **45/45**.

**Source information:** Date: 2026-11-05 10:34:38. Source: Diablo 3. Plan: PLAN.md. Genre/perspective: action RPG with loot and co-op, fixed isometric. Tech: JavaScript, my-3D2dge 0.89.1, AI Hub client 1.4.0. Art: procedural gothic pixel art in bronze, wax, bone and stained glass. Animation: native rigs and moves plus procedural additions. Audio: synthesized music, effects and gibberish voices; music defaults to 10%.

Online: AI Hub shared world and standalone couch co-op, 1–4 players. Testing: headless state tests, complete scripted campaign, Chromium/Firefox/WebKit, 14 viewports, emulated controllers/touch, offline audio and Hub harness. WebKit stands in for real iOS Safari. Research: provided plan and official engine/Hub documentation and source. Environment: Codex CLI, headless Linux/WSL2. Model: OpenAI, gpt-6.1-sol, reasoning effort max. Usage: **added on import**.

**Testing feedback:** 10 tracked defects fixed; 4 could block gameplay. Most helpful: the complete campaign bot. Least helpful: title-only screenshots.

**Engine feedback:** Best: native rigs, weapon hooks and lighting. Wrong guesses: input-hook and glow-helper signatures. Built ourselves: deterministic co-op RPG simulation. Hardest: coordinating input, hit-stop and paused panels. Engine changes: none; public registries were extended. Suggested improvement: an authoritative co-op RPG starter.

**Prompt feedback:** Best: the bell-world and concrete acceptance tests. Confusing: full-campaign length versus vertical-slice scope. Hardest: integrating campaign, multiplayer and procedural presentation. Suggested change: distinguish essential demo requirements from optional production content counts.