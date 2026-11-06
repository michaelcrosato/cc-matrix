Created [**Raiders of the Lost Map — game HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202225__x1d6bdf/work/Raiders-of-the-Lost-Map-Raiders-of-the-Lost-Ark-1982-gpt-6.1-sol-max-20261105-202225.html) and [**exit-interview.json**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202225__x1d6bdf/work/exit-interview.json).

Open the HTML with internet access for CDN dependencies. Includes seven chapters, co-op, checkpoints, attract mode, and developer tools under Pause.

**Source Information**

- **Date:** 2026-11-05 20:22:25. **Source:** *Raiders of the Lost Ark*, Atari 2600, 1982. **Plan:** none.
- **Genre / perspective:** Action-adventure with environmental puzzles; isometric 3D and a tracking escape camera.
- **Tech:** Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.4.0, PeerJS 1.5.5, BroadcastChannel.
- **Art / animation:** Cel shading and ink outlines; native AnimationMixer clips plus procedural motion.
- **Audio:** Original synthesized music at 10% default, coded effects, and gibberish voices; no audio files.
- **Online:** 1–4 player co-op. Hub and same-browser multiplayer verified; cross-device WebRTC: **unknown**.
- **Testing:** **33/33** full-suite checks, **8/8** replay checks, **3/3** metadata checks. Headless controller/touch stand-ins and offline audio; no FPS targets. Physical hardware and subjective listening quality: **unknown**.
- **Research:** [Atari manual](https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html), [game analysis](https://github.com/halkuncode/Raiders2600), engine documentation, and [AI Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Addressed 10 findings: eight game/UX issues and two test-tool issues.
2. One critical issue: missing co-op actors after roster changes; fixed.
3. Most helpful: comparing authoritative state across two co-op pages.
4. Least helpful: WebGPU screenshots, which were blank in this headless environment.

**Engine Feedback**

1. Native toon materials and animation clips worked well.
2. Material cloning and shared Sprite cleanup required corrections.
3. Built the adventure, interaction, input, checkpoint, audio, and networking systems.
4. Hardest: synchronizing physics, traversal, room transitions, and replicated actors.
5. Engine changes: none.
6. Desired improvement: an integrated character controller and resource-lifetime inspector.

**Prompt Feedback**

1. The source, controller requirements, and testing stand-ins gave clear direction.
2. Standalone signaling expectations and demo duration were unspecified.
3. Hardest: combining seven adventure sequences and verified co-op in one file.
4. Suggested change: specify networking transport, signaling policy, and target duration.

All four sections are also included in the in-game About screen and exit interview.