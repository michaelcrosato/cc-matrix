[**Play Jungle Zip — single HTML file**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191409__x1f1523/work/Jungle-Zip-Jungle-Hunt-1983-gpt-6.1-sol-max-20261105-191409.html)

Complete four-act demo. **61/61 checks passed.** Includes controller and touch support, procedural audio, attract mode, developer sliders, and ghost multiplayer.

[Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191409__x1f1523/work/exit-interview.json) is validated. All information below is also in the game’s About/Credits screen.

**Source Information:** 

- **Date:** 2026-11-05 19:14:09. **Source:** Jungle Hunt (1983). **Plan:** none.
- **Genre:** Arcade action platformer/adventure. **Perspective:** 2.5D side-scrolling, orthographic.
- **Tech:** Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub protocol v1/client 1.4.0, esbuild 0.28.2.
- **Art Direction:** Cel shading, ink outlines, geometric jungle scenery, paper-style UI.
- **Animation:** Native Three.js AnimationMixer and original keyframe clips.
- **Audio:** Synthesized music, effects, and gibberish voices; no audio files. Music defaults to 10%.
- **Online:** 1–4 AI Hub ghost racers; standalone two-player WebRTC invitations.
- **Testing:** Full playthroughs, GPU readback, keyboard, emulated controller/touch, audio analysis, WebRTC, and AI Hub latency/loss scenarios. Physical controllers, real phones, and WAN traversal: unknown.
- **Research:** [Atari manual](https://atarionline.org/wp-content/uploads/2021/11/jungle-hunt-1982-atari-2600-instructions-manual.pdf), [screenshots](https://atariage.com/screenshot_page.php?SoftwareLabelID=256), [sound comparison](https://frgcb.blogspot.com/2020/04/jungle-hunt-taito-1982.html), and [AI Hub documentation](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Environment:** Codex CLI, headless Linux/WSL2. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback:**

1. Nine implementation or test-environment issues caught and fixed.
2. Three development blockers: vine balance, software GPU device loss, and stalled GPU initialization. Resolved.
3. Most helpful: normal-lives playthroughs and GPU pixel readback.
4. Least helpful: early blank WebGPU screenshots.

**Engine Feedback:**

1. AnimationMixer and TSL supported the procedural animation and cel shading well.
2. Restitution mixing and software Vulkan configuration needed correction.
3. Built traversal systems, controller menus, and ghost networking.
4. Hardest: verifying both rendering backends without a display.
5. Engine changes: none; application configuration only.
6. Desired improvement: a native ink-outline material across both backends.

**Prompt Feedback:**

1. The source-specific mechanics, TV-focused UX, and testing requirements gave clear direction.
2. The intended 1983 platform and standalone multiplayer transport were unspecified.
3. Hardest: combining four movement styles, two multiplayer paths, and single-file delivery.
4. Suggested change: specify the source platform and preferred standalone connection flow.