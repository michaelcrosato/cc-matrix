[**Play Chop Shop Command**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-212549__x3f4e66/work/Chop-Shop-Command-Chopper-Command-1982-gpt-6.1-sol-ultra-20261105-212549.html)

Complete single-file demo with three sorties, an airship boss, local co-op, controller/touch support, attract mode, and live dev tools. **78 automated checks pass.**

**Source Information**

- Date: 2026-11-05 21:25:49. Source: [Chopper Command (1982)](https://atariage.com/manual_html_page.php?SoftwareID=921). Plan: none.
- Genre: arcade shooter / convoy defense. Perspective: 2.5D side-scrolling.
- Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 2D 0.19.3, Gamepad API, Web Audio.
- Art: procedural cel shading and ink outlines. Animation: native Three.js mixers and clips.
- Audio: synthesized music at 10% default, effects, and gibberish radio voices.
- Online: AI Hub competition for 1–4; standalone local co-op for two.
- Research: original manual, contemporary coverage, official engine and Hub documentation.
- Testing: full campaign, browser automation, emulated controllers/touch, audio analysis, Hub harness.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, ultra reasoning. Usage: added on import.

**Testing Feedback**

1. Ten product issues found and fixed.
2. One critical input issue affected first-touch launch.
3. Most helpful: the complete campaign using real physics collisions.
4. Least helpful: blank headless WebGPU screenshots; WebGL captures supported visual inspection.

**Engine Feedback**

1. Best: cel-shading nodes and native mechanical animation.
2. Stuck on headless WebGPU capture behavior.
3. Built the gameplay, input, UI, and audio systems.
4. Hardest: integrating wrapped physics and portable browser rendering.
5. Engine changes: none.
6. Desired improvement: reliable headless WebGPU captures.

**Prompt Feedback**

1. Best: source research and controller-first requirements.
2. Confusing: multiplayer mode was open to interpretation.
3. Hardest: completing every system in one portable file.
4. Suggested change: specify multiplayer mode and fallback expectations.

All answers also appear in Credits and [exit-interview.json](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-212549__x3f4e66/work/exit-interview.json).