[**Play H.E.R.O. IN A HOLE**](./HERO-IN-A-HOLE-HERO-1984-gpt-6.1-sol-ultra-20261105-214718.html) — one self-contained HTML file, approximately 3 MB.

[Exit interview](./exit-interview.json) · [Development files and instructions](./HERO-IN-A-HOLE-HERO-1984-gpt-6.1-sol-ultra-20261105-214718/README.md)

**Source Information**

- **Date:** 2026-11-05 21:47:18.
- **Source:** H.E.R.O., Activision, 1984. Researched the [original manual](https://www.atarimania.com/2600/boxes/hi_res/hero_i_3.jpg), screenshots, mechanics, enemies, level progression, and sound descriptions.
- **Plan:** none.
- **Genre / perspective:** arcade action platformer; side-on orthographic 2.5D.
- **Tech:** Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub client 1.4.0.
- **Art:** procedural cel shading and ink outlines.
- **Animation:** native Three.js AnimationMixer/AnimationClip plus secondary motion.
- **Audio:** synthesized music, effects, and gibberish voices; music defaults to 10%. Exact original audio fidelity: unknown.
- **Online:** 1–2-player AI Hub and standalone WebRTC co-op; local co-op.
- **Testing:** 208 automated checks covered; no unresolved failures. Includes physical campaign traversal, emulated controller/touch, audio, and impaired-network multiplayer.
- **Environment:** Codex CLI, headless Linux.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort ultra.
- **Usage:** added on import.

**Testing Feedback**

1. Found and fixed 21 tracked implementation/integration issues.
2. Seven were critical boot, progression, or session-lifecycle issues.
3. Most helpful: physical campaign traversal and two-browser assignment transitions.
4. Least helpful: syntax checks alone.

**Engine Feedback**

1. Best: procedural geometry, native animation, and Rapier collisions.
2. Two packaged boot mistakes required fixes; headless WebGPU screenshots were blank.
3. Built the rescue simulation, missions, controls, audio, and networking.
4. Hardest: coordinating physics, rendering, menus, and remote state.
5. Engine changes: none.
6. Desired improvement: more predictable headless WebGPU image readback.

**Prompt Feedback**

1. Best: clear source, controller philosophy, and portable deliverable.
2. Unclear: which original platform to prioritize; selected Atari 2600.
3. Hardest: completing and validating the campaign and both multiplayer paths.
4. Suggested change: specify the source platform and permitted standalone signaling services.

These records are also included in the game’s About/Credits screen.