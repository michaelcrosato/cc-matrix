[Play **Cosmic Hitchhikers**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-212601__x70f420/work/Cosmic-Hitchhikers-Cosmic-Ark-gpt-6.1-sol-ultra-20261105-212601.html) · [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-212601__x70f420/work/exit-interview.json)

The self-contained HTML opens directly from disk. **157 checks passed, zero failures.** Includes three planets, six rescues, final escape, attract mode, developer tools, and multiplayer.

**Source Information**

- Date: 2026-11-05 21:26:01. Source: *Cosmic Ark* (1982). Plan: none.
- Genre: arcade shooter/rescue action. Perspective: side-on orthographic 2.5D.
- Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.4.0.
- Art: procedural cel/ink dioramas. Animation: native AnimationMixer clips plus procedural effects.
- Audio: synthesized music, effects, and gibberish voices; music defaults to 10%.
- Online: AI Hub shared-world co-op for 1–4; standalone same-browser tab link and local controllers.
- Research: [original manual](https://www.atariage.com/2600/manuals_old/cosmic_ark.html), screenshots, contemporary review, engine documentation, and [AI Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- Testing: full campaigns, physics, inputs, audio, multiplayer, and packaging. Physical-controller and real iPhone/iPad validation: unknown.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Usage: added on import.

**Testing Feedback**

1. Four game issues found and fixed; one test-selector error also corrected.
2. One game-breaking physics cleanup issue, fixed.
3. Most helpful: complete campaign and official Hub conformance tests.
4. Least helpful: blank headless WebGPU screenshots; WebGL supplied visual captures.

**Engine Feedback**

1. Best: scene graphs, AnimationMixer, and WebGPURenderer.
2. Difficulty: headless WebGPU capture behavior.
3. Built ourselves: campaign, input/UI, synthesized audio, and authoritative gameplay.
4. Hardest: physics lifetimes across phase and network transitions.
5. Engine changes: none.
6. Desired improvement: reliable headless WebGPU screenshots.

**Prompt Feedback**

1. Best: source research and controller-first requirements.
2. Confusing: standalone networking scope.
3. Hardest: polishing every input and multiplayer path in one file.
4. Suggested change: specify whether standalone cross-device networking is required.

These details are also saved in the in-game About/Credits screen and exit interview.