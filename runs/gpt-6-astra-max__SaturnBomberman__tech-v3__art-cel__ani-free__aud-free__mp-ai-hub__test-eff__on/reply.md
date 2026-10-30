Built **Saturn Kaboom Carnival**.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__SaturnBomberman__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Saturn-Kaboom-Carnival-Saturn-Bomberman-gpt-6-astra-max-20261029-0952.html) · [Run/build instructions](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__SaturnBomberman__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Saturn-Kaboom-Carnival-Saturn-Bomberman-gpt-6-astra-max-20261029-0952/README.md)

Includes three adventure stages, a boss, rideable companion, ten-contestant battles, local multiplayer, AI Hub versus, a practice arena, checkpoints, and the ten-second attract loop. Requires WebGPU over HTTPS or localhost.

**Source Information**

- **Date:** 2026-10-29 09:52, America/Vancouver.
- **Source:** Saturn Bomberman. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180/0.180.0; WebGPU only; Rapier 3D 0.19.3; Gamepad API; Web Audio; HTML/CSS/JavaScript.
- **Art/animation:** Original procedural cel-shaded models, ink outlines, animated character rigs, squash/stretch and physical debris.
- **Audio:** Original synthesized music and effects; no recorded voice.
- **Online:** Shared versus through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), protocol v1/client 1.3.0.
- **Environment:** Codex CLI (headless); Linux; browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 50 minutes; API cost and token counts unknown.

**Testing Feedback**

Efficient functional and viewport testing found **five issues, all fixed; zero game-breaking issues**. Twenty-eight focused checks and 121 AI Hub assertions passed, including playerless hosting and disconnects. Phones, tablets and ultrawide layouts were inspected.

Most helpful: AI Hub’s controller/network harness. Least helpful: syntax-only checking. Installed WebKit lacked WebGPU, so its capability screen and menus were checked; gameplay ran in Chromium WebGPU. Physical DualSense and real iOS Safari remain unverified.

**Engine Feedback**

- Best: reusable Three.js geometry and cel materials.
- Stuck: brief controller presses were missed under heavy rendering; independent input sampling fixed it.
- Main custom work: bomb rules, AI, campaign, controller navigation and networking.
- Hardest: coordinating grid rules, Rapier movement and network prediction.
- Overhaul: implicit renderer fallback behavior.
- Desired addition: controller input and focus handling independent of rendering.

**Prompt Feedback**

- Best: controller-first design and arcade attract mode.
- Confusing: the hub permits fallback, while this prompt forbids it; WebGPU-only takes precedence.
- Hardest: fitting the complete adventure, multiplayer and original presentation into one portable file.
- Next test: four people using physical controllers across mixed devices.

These details also appear in the in-game credits and the HTML’s opening comment.