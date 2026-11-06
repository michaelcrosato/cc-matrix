Built **Yars on the Edge**.

[Play the game](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022838__xedac3c/work/Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838.html) · [Source and build instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022838__xedac3c/work/Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838/README.md) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022838__xedac3c/work/exit-interview.json) · [Progress log](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-022838__xedac3c/work/PROGRESS.md)

The single HTML works offline. **Final `npm test`: 218 passed, 0 failed.**

**Source Information**

- Date: 2026-11-06 02:28:38. Source: [Yars’ Revenge (1982)](https://atari.com/pages/yarsrevenge). Plan: `PLAN.md`.
- Genre/perspective: arcade siege shooter, fixed overhead.
- Tech: JavaScript, Canvas 2D, Web Audio; my-3D2dge 0.89.1, revision `8ecc2f6`; AI Hub client 1.4.0/protocol 1, revision `35a1047`.
- Art/animation: original dimensional pixel art, articulated insects, transforming fortresses, native procedural posing and effects.
- Audio: code-only music, effects and gibberish voices; music defaults to 10%.
- Online: solo, simultaneous local co-op, and AI Hub online co-op for 1–2 players.
- Testing: unrestricted automation covering campaigns, recovery, controls, touch, audio and networking. Stress scenarios use 150 ms latency, 50 ms jitter and 5% loss.
- Research: original instructions, Atari retrospective, creator interview and pack-in comic. Footage, physical hardware validation, novice pacing and subjective audio quality: unknown.
- Environment/model: Codex CLI, headless Linux/WSL2; OpenAI gpt-6.1-sol, reasoning effort max.
- Usage: **added on import**.

**Testing Feedback**

1. Fixed 16 issues: 10 product issues and 6 test/pilot issues.
2. One was game-breaking: the engine’s boot flag prevented scene changes.
3. Most helpful: proving final-phase recovery with zero cells, zero charge and a respawned scout.
4. Least helpful: the initial generic title screenshot.

**Engine Feedback**

1. Best parts: pixel primitives, shading, actors, lights and audio buses.
2. Wrong turns involved boot state, scaled menus and resize mapping.
3. Built the siege simulation, fortress phases and authoritative co-op.
4. Hardest part: coordinating simulation, presentation, menus and session clocks.
5. Changed one engine branch to clear the boot flag; documented the patch.
6. Suggested improvement: a tested headless shared-world example.

**Prompt Feedback**

1. Clear mechanics, acceptance gates and hand-in requirements helped.
2. Model metadata differed between files; novice pacing remained unmeasurable.
3. Hardest task: keeping recovery, co-op, controls and packaging consistent.
4. Suggested change: distinguish mechanical release checks from pacing targets and specify render-free network testing expectations.