Built **[H.E.R.O. After Hours](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191351__x22ec35/work/H.E.R.O.-After-Hours-H.E.R.O.-1984-gpt-6.1-sol-max-20261105-191351.html>)** — one self-contained HTML file, playable offline.

Four descents, eight rescues, procedural audio, controller/touch support, co-op, attract mode, and live dev tools. **29/29 checks passed.**

[Exit interview JSON](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191351__x22ec35/work/exit-interview.json>)

**Source Information**

- **Date:** 2026-11-05 19:13:51. **Source:** H.E.R.O., Activision, 1984. **Plan:** none.
- **Genre / Perspective:** Action platformer and cave-rescue adventure; scrolling, side-on 2.5D.
- **Tech:** Three.js r180, WebGPU with WebGL2 recovery, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.4.0; esbuild 0.25.12.
- **Art / Animation:** Procedural cel shading and ink outlines; native AnimationMixer clips and keyframe tracks, with procedural secondary motion.
- **Audio:** Synthesized music, effects, and gibberish voices. Music defaults to 10%.
- **Online:** AI Hub shared-world co-op for 1–4; standalone shared-screen co-op for 1–2.
- **Testing:** Headless campaign, physics, controller, multitouch, audio, GPU recovery, and impaired-network Hub checks. Physical hardware and human listening: unknown.
- **Research:** [Original manual](https://static.atariage.com/manual_html_page.php?SoftwareLabelID=228) and [Atarimania](https://www.atarimania.com/games/atari-2600-games-h-e-r-o-19482). Exact original audio fidelity: unknown.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI, gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Seven issues caught and corrected.
2. One game-breaking startup issue, fixed.
3. Most helpful: the physical campaign traversal, which found two blocked waypoints.
4. Least helpful: initial blank WebGPU captures before correcting browser flags.

**Engine Feedback**

1. Native animation clips and toon materials worked well.
2. A Rapier method assumption and Vulkan flags needed correction.
3. Built the rescue systems, co-op synchronization, menus, and audio.
4. Hardest: verifying headless WebGPU presentation and resource handling.
5. Engine changes: none; libraries remain unmodified.
6. Desired improvement: clearer device-loss diagnostics.

**Prompt Feedback**

1. Strong source-fidelity, controller, attract-mode, and testing requirements.
2. Standalone multiplayer transport was unspecified.
3. Hardest: completing and verifying every system in one portable file.
4. Clarify local versus internet multiplayer and whether WebGL fallback is acceptable.

All four information and feedback sections are also in the game’s About/Credits screen.