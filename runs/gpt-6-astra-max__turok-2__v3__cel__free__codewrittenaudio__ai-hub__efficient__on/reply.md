Built **Turoot: A Bad Seed**, randomly selected from 50 titles.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Turoot-A-Bad-Seed-Turok-2-Seeds-of-Evil-gpt-6-astra-max-20261029-0941.html) · [Controls and build instructions](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Turoot-A-Bad-Seed-Turok-2-Seeds-of-Evil-gpt-6-astra-max-20261029-0941/README.md)

Includes three districts, three weapons, traversal upgrades, swimming, secrets, checkpoints, a three-phase boss, attract mode, and 1–4 player co-op. Serve over localhost or HTTPS; WebGPU and internet access are required.

**Source Information**

- **Date:** 2026-10-29 09:41, America/Vancouver.
- **Inspiration:** Turok 2: Seeds of Evil.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Protocol v1; esbuild 0.25.10.
- **Art:** Original cel-shaded geometry with ink outlines.
- **Animation:** Procedural creature rigs, weapon recoil, animated water and wildlife, scripted cameras.
- **Audio:** Code-composed music, synthesized effects and gibberish voices.
- **Online:** AI Hub co-op and standalone WebRTC room codes.
- **Environment:** Codex CLI, headless Linux/WSL2. Player browser unknown; tested with Chrome 154.
- **Model:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 70 minutes. API cost and token usage unknown.

**Testing Feedback:** 60 focused checks and five hub scenarios passed. Testing and visual review found five issues: three product issues and two test-environment issues. One was critical—offscreen co-op simulation stopping—and was fixed. The most helpful test was the multiplayer harness; the least helpful was direct headless screenshots, replaced by GPU pixel readback. Testing stayed functional and lightweight, without performance benchmarks. Physical controllers and cross-household networking remain unverified.

**Engine Feedback:** Toon materials and Rapier’s character controller worked particularly well. Implicit renderer fallback and offscreen timing required correction. I built the campaign, combat, audio, controller UI, attract director and replication systems. The hardest part was keeping shared combat authoritative while movement remained responsive. I would remove implicit backend fallback and add a simulation clock independent of rendering.

**Prompt Feedback:** The controller-first philosophy and complete-slice requirement provided clear direction. The hub’s fallback recommendation conflicted with the explicit WebGPU-only requirement; WebGPU-only took precedence. The hardest task was combining the campaign and co-op into one polished file. The additional test I would choose is a complete expedition with four physical DualSense controllers across separate home networks.

These details are also embedded in About/Credits and the HTML’s opening comment.