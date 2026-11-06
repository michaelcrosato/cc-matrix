Built **[The Fright House]( /home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191357__x577f0c/work/The-Fright-House-Haunted-House-1982-gpt-6.1-sol-max-20261105-191357.html)** — a self-contained, 3.1 MB game with 24 rooms, developer tools, attract mode, and online ghost races.

**130 main checks and 8 visual checks passed.** [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191357__x577f0c/work/exit-interview.json) · [Development files and instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191357__x577f0c/work/The-Fright-House-Haunted-House-1982-gpt-6.1-sol-max-20261105-191357/README.md)

**Source Information**

- **Date:** 2026-11-05 19:13:57. **Source:** Haunted House, Atari, 1982. **Plan:** none.
- **Genre / perspective:** Adventure, stealth, light survival horror; third-person isometric cutaways.
- **Tech:** Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad/Web Audio APIs, PeerJS 1.5.5, AI Hub client 1.4.0, Bun.
- **Art / animation:** Procedural cel shading and ink silhouettes; native AnimationMixer clips for characters, creatures, reactions, and doors.
- **Audio:** Code-generated music, effects, and gibberish voices; no audio files. Music defaults to 10%.
- **Online:** 1–4 player AI Hub ghost races; standalone room codes using WebRTC and BroadcastChannel.
- **Testing:** Complete scripted escape, controller and touch simulation, audio analysis, and multiplayer checks. WebGL 2 supplied visual review because headless WebGPU presentation was unreliable. Physical controller, TV, iOS Safari, and cross-network NAT behavior: **unknown**.
- **Research:** Mechanics, floors, enemies, appearance, and sounds from [Atari’s description](https://atari.com/pages/hauntedhouse) and the [original manual](https://www.retrogames.cz/manualy/Atari2600/Atari2600HauntedHouse.pdf), plus official engine and AI Hub documentation.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI, gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Found 14 issues: seven game/UX issues and seven testing/environment issues.
2. Zero gameplay-breaking issues; three testing blockers.
3. Most helpful: the complete escape and official AI Hub harness.
4. Least helpful: raw headless WebGPU screenshots and readback.

**Engine Feedback**

1. Best: procedural geometry, toon materials, and native animation clips.
2. Stuck on headless graphics and timing assumptions in input tests.
3. Built the room graph, inventory, enemies, menus, audio, attract director, and races.
4. Hardest: coordinating physics, animation, room changes, and rendering.
5. Engine modifications: none.
6. Desired improvement: reliable software-WebGPU headless diagnostics and readback.

**Prompt Feedback**

1. Liked the clear source, controller-first direction, and procedural audio requirement.
2. Standalone multiplayer transport expectations were unclear.
3. Hardest: preserving the one-object puzzle in modern 3D.
4. Would specify standalone hosting expectations and the required browser matrix.

These details are also included in the game’s About/Credits screen.