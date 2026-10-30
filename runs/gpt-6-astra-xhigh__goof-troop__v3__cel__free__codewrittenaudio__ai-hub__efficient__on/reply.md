Built **[Oddball Outing](./Oddball-Outing-Goof-Troop-gpt-6-astra-xhigh-20261029-1103.html)** — a 3.30 MiB single-file game with seven rooms, puzzles, combat, a boss, solo buddy, co-op, saves, and attract mode.

[Development files and instructions](./Oddball-Outing-Goof-Troop-gpt-6-astra-xhigh-20261029-1103/README.md). Run through HTTPS or localhost in a WebGPU-enabled browser.

**Source Information**

- **Date:** 2026-10-29 11:46 PDT.
- **Source:** Goof Troop. Original characters, assets, dialogue, and music.
- **Title:** Randomly selected from 50 candidates.
- **Tech:** Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio; PeerJS 1.5.5.
- **Art:** Procedural cel-shaded 3D.
- **Animation:** Articulated procedural rigs, squash/stretch, particles.
- **Audio:** Code-composed music, synthesized effects and gibberish voices.
- **Online:** AI Hub co-op for 1–4; standalone WebRTC co-op for 2–4; local two-player co-op.
- **Testing:** Lightweight functional/browser checks; no performance targets.
- **Environment:** Codex CLI, headless Linux/WSL2. User browser unknown; tested Chrome 154.
- **Model:** OpenAI gpt-6-astra, xhigh.
- **Usage:** Approximately 43 minutes. Cost and token usage unknown.

**Testing Feedback**

- **105 checks passed:** 26 gameplay/UI/audio, 73 ai-hub, 6 real WebRTC integration checks.
- Testing caught **8 issues, including 3 critical issues**; all were fixed.
- Most helpful: room-by-room interaction tests, which caught a progression-blocking physics bug.
- Least helpful: an early screenshot taken before loading finished.
- Physical DualSense and cross-household networking remain unverified.

**Engine Feedback**

- Best part: Three.js scene composition and toon materials.
- Wrong assumptions: shared sprite-buffer ownership, block collision clearance, and PeerJS initialization behavior.
- Biggest custom system: shared adventure simulation, progression, recovery, and networking.
- Hardest part: responsive local controls alongside authoritative shared physics.
- Overhaul: automatic rendering fallback; explicitly disabled here.
- Desired addition: integrated controller focus, interaction queries, and snapshot tools.

**Prompt Feedback**

- Best part: distinctive gameplay inspiration and clear delivery constraints.
- Confusing: “feature-complete engine” has an open-ended boundary.
- Hardest part: making every puzzle work across solo, couch, online, and dedicated-host modes.
- Additional test: four people using physical DualSense controllers across different networks, including a disconnect mid-puzzle.

All source information and feedback are also embedded in **About/Credits** and the HTML’s opening comment.