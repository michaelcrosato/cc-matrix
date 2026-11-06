[**Play Cosmic Arkipelago**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191327__x70f420/work/Cosmic-Arkipelago-Cosmic-Ark-1982-gpt-6.1-sol-max-20261105-191327.html) — one self-contained HTML file; solo play works offline.

Three worlds, six rescues, a final escape, co-op, controller/touch support, attract mode, and developer tools under **Pause → Developer tools**.

**37/37 acceptance checks passed**, including four official AI Hub scenarios. [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191327__x70f420/work/exit-interview.json) is saved and validated.

**Source Information**

- Date: 2026-11-05 19:13:27. Source: *Cosmic Ark* (Imagic, 1982). Plan: none.
- Genre: arcade shooter and rescue flight. Perspective: fixed orthographic 2.5D. Art: procedural cel shading and ink outlines.
- Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, PeerJS 1.5.5, AI Hub protocol v1.
- Animation: native AnimationMixer clips plus procedural effects. Audio: synthesized music, effects, and gibberish voices; music defaults to 10%.
- Online: 1–2 local/standalone co-op; 1–4 shared-world Hub co-op.
- Research: [original manual](https://www.atariage.com/2600/manuals_old/cosmic_ark.html), [gameplay footage](https://www.silverbluesretrocade.com/wp-content/uploads/2024/08/atari-2600-cosmic-ark-demo.mp4), and [Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- Testing: headless campaign, physics, inputs, audio levels, networking, and visual review. Physical controller feel, human listening, real TV/iOS behavior, and external NAT combinations: unknown.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, reasoning effort max. Usage: added on import.

**Testing Feedback:** Testing and review found 11 implementation defects, including 3 game breaking in their affected paths; all were corrected. Most helpful: the laser/shuttle collision test. Least helpful: blank headless WebGPU screenshots; WebGL captures supplied visual evidence.

**Engine Feedback:** Best: TSL shading and native animation. Wrong assumption: Rapier’s default sensor collision filters. Built: campaign, controls, audio, UI, and replication. Hardest: coordinating physics and replicated state. Engine changes: none. Desired improvement: a built-in cross-backend toon material.

**Prompt Feedback:** Best: the concrete source and controller-first requirements. Unclear: standalone networking infrastructure. Hardest: completing and verifying every system in one portable file. Suggested change: specify the preferred standalone signaling and relay service.

All four information and feedback sections are also included in **About & credits**.