[Open **Advanced Dungeons & Near Misses**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-035445__x2713fa/work/Advanced-Dungeons-Near-Misses-Advanced-Dungeons-and-Dragons-gpt-6.1-sol-max-20261106-035445.html)

Completed the standalone game: 29 chambers, both guardians, solo/couch/online co-op, saves, attract mode, and developer tools. **698 checks passed; zero failures.**

[Interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-035445__x2713fa/work/exit-interview.json) · [Verification evidence](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261106-035445__x2713fa/work/Advanced-Dungeons-Near-Misses-Advanced-Dungeons-and-Dragons-gpt-6.1-sol-max-20261106-035445/docs/verification.md)

**Source Information**

- Date: 2026-11-06 03:54:45. Source: [Advanced Dungeons & Dragons, 1982 / Cloudy Mountain](https://history.blueskyrangers.com/mattelelectronics/games/addcloudy.html). Plan: `PLAN.md`.
- Genre/perspective: Adventure; overhead three-quarter view.
- Tech: JavaScript/HTML/CSS, my-3D2dge 0.89.1, Hub client 1.4.0/Protocol v1, WebRTC and Web Audio.
- Art/animation: Original native shaded pixel art, Humanoid poses, bow attachments, articulated creatures.
- Audio: Synthesized music, effects, ambience and gibberish voices; music defaults to 10%.
- Online: 1–2 players through couch, direct WebRTC and Hub shared-world sessions.
- Testing: Headless testing permitted; campaign, browser, input, audio and networking checks performed.
- Research: [Original instructions](https://history.blueskyrangers.com/instructions/addinst.html), production history, screenshot, engine/Hub contracts and WebRTC documentation.
- Environment/model: Codex CLI, headless Linux; OpenAI gpt-6.1-sol, reasoning effort max. Usage: **added on import**.
- Physical hardware, WAN connectivity and human listening: **unknown**. First-player pacing remains unmeasured.

**Testing Feedback**

1. Eight defects found and fixed.
2. Three were potentially game breaking.
3. Most helpful: the unassisted full-expedition command director.
4. Least helpful: initial stale screenshots; corrected with explicit rendering.

**Engine Feedback**

1. Native rigs, materials and Shell were strongest.
2. Corrected assumptions about `advance()` drawing and texture arguments.
3. Built the authoritative expedition, arrows, hearing and networking systems.
4. Hardest: keeping units, camera, fog and visibility consistent across modes.
5. Engine changes: none.
6. Suggested improvement: a native bow/projectile integration example.

**Prompt Feedback**

1. Concrete mechanics and acceptance criteria helped most.
2. “Demo” versus full expedition scope was ambiguous.
3. Hardest: integrating scarce-arrow exploration with all co-op modes.
4. Suggested change: separate functional acceptance from first-player pacing evaluation.

Progress and handoff details are recorded in `PROGRESS.md`.