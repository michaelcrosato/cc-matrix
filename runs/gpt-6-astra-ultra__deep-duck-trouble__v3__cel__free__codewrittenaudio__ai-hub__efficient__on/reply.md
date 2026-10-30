Built [**Duck Trouble Tide — single HTML, 3.18 MiB**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v10__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Duck-Trouble-Tide-Deep-Duck-Trouble-Starring-Donald-Duck-gpt-6-astra-ultra-20261029-1038.html).

Includes three regions, boss and ending, saves, controller settings, attract mode, and local/online co-op. **WebGPU required.**

Source information:

- **Date:** 2026-10-29 10:38, America/Vancouver.
- **Source:** [Deep Duck Trouble Starring Donald Duck](https://www.mobygames.com/game/23492/deep-duck-trouble-starring-donald-duck/).
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1/client 1.3.0.
- **Art:** Original procedural cel-shaded 3D with ink outlines.
- **Animation:** Hierarchical procedural rigs, articulated wings, strides, squash and stretch.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** Two-player WebRTC co-op; AI Hub score races for 1–4 players.
- **Environment:** Codex CLI, headless Linux; Chrome 154 and Chromium 141 under Xvfb.
- **Model:** OpenAI gpt-6-astra, ultra reasoning.
- **Usage:** Approximately 40 minutes; API cost and token totals unknown.

Testing feedback: Lightweight functional and visual checks passed: **22 gameplay checks, 24 hub checks, 15 network scenarios**, live co-op, audio, and WebGPU screenshots. Testing/review caught **14 grouped defects, including 6 critical**, all fixed. Browser integration was most helpful; syntax-only checking was least helpful. Physical controllers and separate-device WAN play remain unverified.

Engine feedback: Scene graphs and TSL worked best. I initially guessed a Rapier API incorrectly. The largest custom system was the platformer and multiplayer layer; synchronizing physics, animation, and prediction was hardest. I’d overhaul transform ownership and add an integrated WebGPU/Rapier/controller starter.

Prompt feedback: The source reference and controller-first requirements provided clear direction. Demo duration and multiplayer mode were ambiguous. Combining complete gameplay and two networking modes into one file was hardest. The next test would be a television-distance playthrough with physical DualSense controllers and separate home networks.

All required information and feedback also appear in the in-game About screens and the HTML’s opening comment.