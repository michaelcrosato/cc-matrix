Built [**Treasure of Tarmin After Dark**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra.build-v2__20261106-040805__x318715/work/Treasure-of-Tarmin-After-Dark-Advanced-Dungeons-and-Dragons-Treasure-of-Tarmin-1983-gpt-6.1-sol-ultra-20261106-040805.html).

**246/246 verification checks passed**, including full solo completion, controller/touch input, real WebRTC co-op, and the official Hub harness.

[Required report](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra.build-v2__20261106-040805__x318715/work/exit-interview.json) · [Progress log](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra.build-v2__20261106-040805__x318715/work/PROGRESS.md)

**Source Information:** Date: 2026-11-06 04:08:05. Source: *Advanced Dungeons & Dragons: Treasure of Tarmin* (1983). Plan: PLAN.md. Genre/perspective: first-person dungeon RPG. Tech: my-3D2dge 0.89.1, World3D, Three.js 0.182.0, Rapier 0.19.3, Hub client 1.4.0; Bun 1.3.14 build. Art: procedural pixel textures and outlined volumetric creatures. Animation: native Humanoid/Blob/Combo systems. Audio: synthesized music, effects, and gibberish voices; music defaults to 10%. Online: 1–2 player WebRTC and Hub co-op, without TURN.

Research inspected the [manual](https://mocagh.org/intvaction/addtot-manual.pdf), official transcript, publisher history, and gameplay screenshot. Video playback and original timbres remain unknown. Unlimited headless testing was allowed; physical devices, real iOS, cross-network reachability, and human listening remain unknown. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Usage: `added on import`.

**Testing Feedback:** 36 issues found and fixed through tests and integration review, including one critical boss-phase recursion bug. No known critical issue remains. Most helpful: the complete normal-rules browser replay with real Enter/R2 phase transitions. Least helpful: syntax-only checks.

**Engine Feedback:** Best: shared native procedural art and animation. Difficulties: camera axes, overlay scale, and GPU fallback initialization. Built ourselves: deterministic dual-strength rules, campaign, inventory transactions, and authority. Hardest integration: bundling and independent network clocks. Engine sources remain unchanged; the packaging wrapper supplies a compatibility shim. Suggested improvement: a supported single-HTML World3D exporter and shared-world starter.

**Prompt Feedback:** Best: clear strategic identity and acceptance criteria. Confusing: filename ownership between TASK.md and PLAN.md. Hardest: completing campaign, controls, presentation, and both multiplayer paths together. Suggested change: provide a pinned engine/Hub integration starter.