[Play River Renegade](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202323__xde02fc/work/River-Renegade-River-Raid-1982-gpt-6.1-sol-max-20261105-202323.html) — self-contained HTML; open directly.

Includes a three-sector campaign, boss fight, attract mode, live developer sliders, controller/touch support, local co-op, and AI Hub multiplayer. **118 checks passed; 0 failed.**

[Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202323__xde02fc/work/exit-interview.json) · [Test results](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202323__xde02fc/work/River-Renegade-River-Raid-1982-gpt-6.1-sol-max-20261105-202323/test-results.json)

**Source Information**

- **Date/source/plan:** 2026-11-05 20:23:23; River Raid (1982), Carol Shaw/Activision; plan: none.
- **Genre/perspective:** Arcade scrolling shooter and flight action; tilted top-down orthographic 3D.
- **Tech:** Three.js r180, WebGPU with WebGL 2 recovery, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub protocol v1/client 1.4.0, esbuild 0.25.12.
- **Art/animation/audio:** Procedural cel shading and ink edges; native AnimationMixer/keyframe animations and physics debris; synthesized music, effects and gibberish voices. Music defaults to 10%.
- **Online:** 1–4 players through AI Hub; standalone local co-op for 1–2.
- **Testing/research:** Headless physics, campaign, input, audio, packaging and Hub checks; screenshots for visual review. Research included the [original manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=409), official engine documentation and [Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub). Physical hardware and human listening: unknown.
- **Environment/model/usage:** Codex CLI, headless Linux/WSL2; OpenAI gpt-6.1-sol, reasoning effort max; usage: added on import.

**Testing Feedback**

1. Ten product issues found and fixed.
2. One objective-breaking issue: intact bridges could be bypassed.
3. Most helpful: the complete scripted campaign and targeted physics regressions.
4. Least helpful: early blank WebGPU screenshot captures; state checks and WebGL screenshots provided useful evidence.

**Engine Feedback**

1. Best: procedural geometry and native animation work well together.
2. Wrong guesses: unsupported `flatShading` and software-browser launch flags.
3. Built myself: flight simulation, river course, controls, synthesis and multiplayer adapter.
4. Hardest: coordinating graphics recovery, physics and session timing.
5. Engine changes: none.
6. Desired improvement: reliable headless WebGPU frame capture.

**Prompt Feedback**

1. Liked the concrete research, controller, attract-mode and developer-tool requirements.
2. Standalone multiplayer’s connection method was unspecified.
3. Hardest: integrating the complete campaign, inputs, audio and networking into one portable file.
4. Suggested change: specify campaign duration and the desired standalone multiplayer connection method.