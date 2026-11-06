Built **Combrisk** — a complete four-heat arcade game with solo, couch versus, direct-link multiplayer, and AI Hub support.

[Open Combrisk](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191318__x6bc615/work/Combrisk-Combat-1977-gpt-6.1-sol-max-20261105-191318.html) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191318__x6bc615/work/exit-interview.json) · [Build/test guide](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191318__x6bc615/work/Combrisk-Combat-1977-gpt-6.1-sol-max-20261105-191318/README.md)

The HTML is self-contained, approximately **3.17 MiB**. **68/68 automated checks passed.**

**Source Information**

| Field | Value |
|---|---|
| Date | 2026-11-05 19:13:18 |
| Source | Combat (1977) |
| Plan | none |
| Genre | Arcade vehicular arena shooter and dogfighting |
| Perspective | Elevated orthographic 3D |
| Tech | Three.js r180; WebGPU with WebGL 2 fallback; Rapier 0.19.3; Gamepad, Web Audio and WebRTC APIs; AI Hub client 1.4.0; esbuild 0.25.11 |
| Art Direction | Procedural cel-shaded paper-and-ink tabletop |
| Animation | Native Three.js AnimationMixer clips, procedural movement and particles |
| Audio | Synthesized music, effects and gibberish voices; music defaults to 10% |
| Online | AI Hub shared world for 1–4; standalone WebRTC duels; couch versus |
| Testing | Headless Chromium, software WebGPU/WebGL, full circuit, controller emulation, multitouch, audio analysis and multiplayer harness |
| Research | No internet searches; native knowledge. Required Hub files and dependencies retrieved |
| Environment | Codex CLI (headless); Linux |
| Model | OpenAI, gpt-6.1-sol, reasoning effort max |
| Usage | added on import |

Physical-device behavior and cross-network NAT coverage remain **unknown**. Direct links include no TURN relay.

**Testing Feedback**

1. Four implementation defects caught and fixed; two test-fixture mistakes also corrected.
2. Two were game breaking: rendering could stop after transitions, and Hub readiness could stall.
3. Most helpful: the full circuit playthrough and supplied Hub harness, including rendered four-player sessions.
4. Least helpful: software-WebGPU screenshots, which could produce a blank canvas.

**Engine Feedback**

1. Best feature: native animation mixers and cel-shading materials.
2. Wrong turns: legacy texture bindings and shader warm-up timing.
3. Largest custom system: combat simulation and authoritative multiplayer.
4. Hardest part: resource lifetimes across arena and vehicle transitions.
5. Engine changes: none; packages remain unmodified.
6. Desired improvement: texture-binding errors that identify the affected object and material.

**Prompt Feedback**

1. Best aspect: precise controls, attract-mode requirements and integration contract.
2. Confusing aspect: the research ban alongside required online integration files.
3. Hardest task: consistent controls and networking across every play mode without physical devices.
4. Suggested change: specify standalone connection and relay expectations explicitly.

All feedback is also embedded in **About/Credits** and the validated exit-interview JSON.