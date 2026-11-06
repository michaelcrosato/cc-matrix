Built **Hardly Far Cry**.

[Play/download the HTML](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-063014__x07393c/work/Hardly-Far-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-063014.html) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-063014__x07393c/work/exit-interview.json) · [Progress log](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-063014__x07393c/work/PROGRESS.md)

The single file runs in a WebGPU browser. Final tests: **294 passed, 0 failed**, including both endings, all four hub scenarios, replay, and two-window multiplayer. Optional wildlife was omitted.

**Source Information**

- **Date:** 2026-11-05 06:30:14
- **Source / Plan:** Far Cry 2 / PLAN.md
- **Genre / Perspective:** Open-world survival shooter; first person with optional vehicle chase camera.
- **Tech:** Unmodified [Pixel Engine 0.46.0](https://github.com/michaelcrosato/riftlight/releases/tag/engine-v0.46.0), three.js r186, Rapier 0.20.0, esbuild 0.28.2, AI Hub client 1.4.0, original game systems.
- **Art Direction:** Native pixel pipeline, original low-poly models, red grass, plum shadows, ash and paper.
- **Animation:** Native ClipDef/compileClips, AnimationMixer, hero locomotion and ragdolls, original hand and soldier clips.
- **Audio:** Original synthesized music, effects and Animalese-style voices; music defaults to 10%.
- **Online:** Shared-world Cash Run for 1–4 players, solo bots, and same-computer BroadcastChannel play.
- **Testing:** Headless systems and campaign bots, exact replay, Chromium software WebGPU, input emulation, audio rendering, screenshots and 14 WebKit compatibility viewports. Real iOS Safari was unavailable.
- **Research:** PLAN.md, shipped engine guides/API, AI Hub protocol and reference implementation.
- **Environment:** Codex CLI (headless); Linux/Ubuntu on WSL2.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** added on import

**Testing Feedback**

1. Testing recorded **20 issues**, all fixed.
2. **6 were critical:** two startup failures, pause handling, self-intersecting rays, multiplayer readiness, and out-of-order objectives.
3. Most helpful: the complete campaign bot exercising real objectives, both endings and permanent buddy loss.
4. Least representative: the initial blank-scene hub test, which could not catch full-world startup problems.

**Engine Feedback**

1. Native model/clip data and headless stepping were most useful.
2. I initially got catalog IDs, ray exclusions and GPU startup timing wrong.
3. The main additions were persistent fire, the physical map, survival systems, missions and authoritative multiplayer.
4. Coordinating first-person input, deterministic simulation and network timing was hardest.
5. No engine-file changes; its bytes match the release zip.
6. I would add a grounded first-person preset with neutral bindings, explicit pointer-lock control and staged graphics readiness.

**Prompt Feedback**

1. The detailed setting, delivery format and concrete verification requirements helped most.
2. The game-length and vertical-slice goals required scope judgment.
3. Integrating the story, survival mechanics and multiplayer while keeping everything reachable was hardest.
4. I would separate the required slice checklist from expansion content.