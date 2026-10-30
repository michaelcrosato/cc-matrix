[Download **Deep Quack Caper**](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v10__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Deep-Quack-Caper-Deep-Duck-Trouble-Starring-Donald-Duck-gpt-6.1-sol-xhigh-20261029-0824.html>) · [Release notes](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v10__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Deep-Quack-Caper-Deep-Duck-Trouble-Starring-Donald-Duck-gpt-6.1-sol-xhigh-20261029-0824/RELEASE.md>)

Built five playable routes with guardians, crate combat, fluttering, swimming, vines, pepper rampages, secrets, checkpoints, saves, attract mode, and multiplayer. Use a WebGPU browser with internet access, served through HTTPS or localhost.

**Source information**

- **Date:** 2026-10-29 08:24 PDT.
- **Inspiration:** Deep Duck Trouble Starring Donald Duck. Title selected randomly from 50 candidates.
- **Tech:** Three.js r180, WebGPU exclusively, TSL, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art/animation:** Original procedural cel-shaded dioramas, articulated rigs, procedural poses and particles.
- **Audio:** Code-written music, synthesized effects, and gibberish voices.
- **Online:** AI Hub score challenges and standalone WebRTC treasure races, supporting up to four players.
- **Environment:** Codex CLI, headless Linux/WSL2; tested Chrome 154.0.8037.57. Player browser unknown.
- **Model/usage:** OpenAI gpt-6.1-sol, xhigh. Approximately 33 minutes; API cost and token usage unknown.

**Testing feedback:** Three game issues caught and fixed; one critical under slow rendering. Core checks, physical guardian combat, hub sessions with 1/2/4 players, departures, and real WebRTC connections passed. Most helpful: the official hub harness. Least helpful: an empty GPU submission test. Physical DualSense testing and a full manual campaign playthrough remain unverified.

**Engine feedback:** Best features were procedural geometry, TSL, and Rapier shape casts. I initially guessed the wrong Rapier module filename. The main custom system was the buffered platform controller and route infrastructure. The hardest integration was keeping input independent of rendering while supporting both multiplayer lifecycles. I’d overhaul implicit renderer fallback and add a public strict-WebGPU option plus complete controller examples.

**Prompt feedback:** The source, controller philosophy, and attract requirement gave clear direction. Demo length and multiplayer mode were unspecified. The hardest part was fitting the adventure, original art/audio, menus, and multiplayer into one file. The ideal additional test is two physical devices with real DualSense controllers over the internet.

These details are also embedded in About/Credits and the HTML’s opening comment.