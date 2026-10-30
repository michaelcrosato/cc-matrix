Created **[Bad Habit]( /home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v4__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Bad-Habit-SiN-gpt-6-astra-xhigh-20261029-1106.html)**: a complete single-file demo with three districts, three weapons, interactive security, a two-phase boss, attract mode, and multiplayer score races.

Serve over HTTPS or localhost. Requires WebGPU and internet for CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 11:48, America/Vancouver.
- **Source:** SiN. “Bad Habit” was randomly selected from 50 titles.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Session Protocol v1.
- **Art:** Original procedural cel shading, ink outlines, and corporate city scenery.
- **Animation:** Procedural character rigs, weapon poses, physics, particles, and scripted replay.
- **Audio:** Code-written synth music, effects, and gibberish voices with subtitles.
- **Online:** AI Hub sessions for 1–4 players; standalone room-code competition for 2–4.
- **Environment:** Codex CLI, Linux/WSL2; tested with Chrome 154 and SwiftShader WebGPU.
- **Model:** OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** Cost and token totals unknown; approximately 41 minutes.

**Testing Feedback**

- Passed **15 gameplay/controller checks**, **72 hub checks across three scenarios**, and **8 attract/multiplayer checks**.
- Fixed **5 game issues**, including **1 critical controller-input issue during slow rendering**.
- Most helpful: mission traversal and the official hub harness.
- Least helpful: syntax checks alone.
- Physical DualSense, audio audition, and separate-device WAN play remain unverified.

**Engine Feedback**

- Best: procedural scene construction and Rapier’s collision queries.
- Difficulties: software-WebGPU capture flags and input timing during slow rendering.
- Built myself: mission, combat, AI, controller UI, audio, replay, and multiplayer systems.
- Hardest: coordinating rendering, physics, input, and session clocks.
- Overhaul: implicit renderer fallback behavior.
- Desired improvement: an official game starter integrating input, physics, audio, and lifecycle handling.

**Prompt Feedback**

- Best: concrete controller-first, attract-mode, and packaging requirements.
- Ambiguous: multiplayer mode; I selected synchronized score races.
- Hardest: delivering every system within a coherent, complete mission.
- Additional test: two physical DualSense controllers completing a remote multiplayer round.

These notes are also embedded in the HTML’s opening comment and in-game Case File.