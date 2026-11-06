Built **[Raiders of the Golden Goose](./Raiders-of-the-Golden-Goose-Raiders-of-the-Lost-Ark-1982-gpt-6.1-sol-max-20261105-201951.html)**. **114 checks passed**, including complete solo and online expeditions.

[Exit interview](./exit-interview.json) · [Development and test instructions](./Raiders-of-the-Golden-Goose-Raiders-of-the-Lost-Ark-1982-gpt-6.1-sol-max-20261105-201951/README.txt)

Open the HTML with internet access for its pinned libraries. Developer tools are available from Pause.

**Source Information**

- **Date:** 2026-11-05 20:19:51. **Source:** Raiders of the Lost Ark (1982, as supplied). **Plan:** none.
- **Genre:** action-adventure with environmental puzzles. **Perspective:** cinematic 3D overhead.
- **Tech:** Three.js r180, WebGPU with WebGL2 compatibility, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.4.0.
- **Art Direction:** procedural cel shading, ink outlines, sandstone and jungle teal. **Animation:** native AnimationMixer clips and procedural effects.
- **Audio:** synthesized music at 10% default volume, effects and Animalese-style gibberish; no audio files.
- **Online:** 1–4 player AI Hub co-op; standalone 1–4 player couch co-op.
- **Testing:** scripted playthroughs, device emulation, offline audio renders, network harness and visual checks. Physical devices: unknown.
- **Research:** none about the source; supplied integration documentation and dependency code only.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Six game/UI/integration defects found and fixed.
2. Two blockers: escape collision and four-player startup readiness.
3. Most helpful: the complete default-balance playthrough.
4. Least helpful: a byte-based audio reading that rounded quiet music to silence.

**Engine Feedback**

1. Best: cel materials, native animation and stable physics.
2. Yes—headless graphics, socket paths and shader readiness needed corrections.
3. Largest custom work: adventure state, checkpoints, input and co-op replication.
4. Hardest: coordinating GPU warm-up, physics and network timing.
5. Engine changes: none.
6. Desired improvement: integrated controller UI and character tools.

**Prompt Feedback**

1. The concrete stack, procedural audio and verification requirements were useful.
2. The intended 1982 source edition is unknown.
3. Hardest: polishing every input method and multiplayer mode within one HTML.
4. Clarify the source edition and standalone multiplayer expectations.

All four information and feedback sections are also included in the game’s About/Credits screen.