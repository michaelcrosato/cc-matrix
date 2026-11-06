Built [**The House of Creaks — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191354__x12d807/work/The-House-of-Creaks-Haunted-House-1982-gpt-6.1-sol-max-20261105-191354.html).

Includes four floors, solo and co-op play, attract mode, save/continue, and developer tools with live sliders. **110/110 checks passed.** Open in current Chrome or Edge; CDN libraries require internet.

[Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191354__x12d807/work/exit-interview.json) · [Development files and test command](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191354__x12d807/work/The-House-of-Creaks-Haunted-House-1982-gpt-6.1-sol-max-20261105-191354/README.md)

**Source Information**

- **Date:** 2026-11-05 19:13:54. **Source:** Haunted House (Atari, 1982). **Plan:** none.
- **Genre:** survival horror, exploration adventure, cooperative puzzles. **Perspective:** isometric cutaway; fixed angle with portrait camera follow.
- **Tech:** Three.js r180/WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, BroadcastChannel, AI Hub client 1.4.0.
- **Art:** procedural cel shading and ink outlines. **Animation:** native AnimationMixer/keyframe clips.
- **Audio:** synthesized music at 10% default, effects, and gibberish voices; no audio files.
- **Online:** 1–4-player shared-world co-op through Hub, browser rooms, or direct WebRTC.
- **Testing:** full scripted playthrough, controller/touch emulation, audio analysis, file deployment, multiplayer, Hub conformance, and 1080p visuals. Real hardware and cross-network NAT compatibility: unknown.
- **Research:** none for the source; supplied integration files read.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Nine game issues found and fixed; harness/environment issues tracked separately.
2. Four blockers fixed.
3. Most helpful: the official Hub harness exposed handshake timing problems.
4. Least helpful: corrupted headless WebGPU screenshots; visual inspection used WebGL2.

**Engine Feedback**

1. Best: TSL materials and reusable native animation clips.
2. Corrections needed: Rapier’s module filename, startup ordering, and browser backend differences.
3. Built myself: gameplay/co-op simulation, menus, procedural art, and audio.
4. Hardest: coordinating startup, physics, animation, and networking.
5. Engine changes: none.
6. Desired addition: built-in controller focus and scrolling support.

**Prompt Feedback**

1. Best: clear source, controller-first direction, and completion criteria.
2. Confusing: distinguishing prohibited research from required integration-document reading.
3. Hardest: combining multiplayer and all input methods in one HTML.
4. Suggested change: specify standalone discovery, invitation, and relay expectations.

All four feedback sections are also included in the in-game About/Credits screen.