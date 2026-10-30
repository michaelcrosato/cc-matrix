Built **Riff n Roll Racing**.

[**Open the single-file game**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Riff-n-Roll-Racing-Rock-n-Roll-Racing-gpt-6-astra-ultra-20261029-1032.html) · [Instructions and controls](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Riff-n-Roll-Racing-Rock-n-Roll-Racing-gpt-6-astra-ultra-20261029-1032/README.md)

Includes a three-round championship, combat, AI rivals, upgrades, persistent saves, controller menus, attract mode, and multiplayer. Serve over HTTPS or localhost; WebGPU and downloadable dependencies are required.

**Source Information**

- **Date:** 2026-10-29 10:32.
- **Inspiration:** Rock n’ Roll Racing. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS.
- **Art:** Procedural cel shading and dark outlines.
- **Animation:** Physics-driven vehicles, procedural wheels, body movement, scenery and particles.
- **Audio:** Original synthesized music, effects and gibberish commentary.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) sessions for 1–4 players; standalone two-player WebRTC. Direct connections have no TURN relay.
- **Testing:** Lightweight functional and visual checks; no FPS targets.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown. Verified using Chrome 154 through Xvfb.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** API cost and tokens unknown; approximately 30 minutes.

**Testing Feedback**

Seven noncritical issues found and fixed; zero game-breaking issues. **112 checks passed**, plus rendered-browser, audio and standalone multiplayer checks. Most helpful: the official hub harness. Least helpful: headless GPU screenshots, which required Xvfb for reliable capture.

**Engine Feedback**

TSL’s cel-shading flexibility worked especially well. Headless GPU capture caused the main tooling difficulty. The most important custom system was the arcade driving/combat/race layer; predicted multiplayer physics was hardest. I’d overhaul implicit renderer fallback and add a maintained WebGPU/Rapier racing reference.

**Prompt Feedback**

The concrete audiovisual, controller and packaging requirements were useful. “Feature-complete” left the content boundary unclear; this demo uses one circuit across three race conditions. Completing progression alongside both multiplayer modes was hardest. The additional test I’d choose is physical DualSense play across two consumer networks.

These details also appear in the in-game About screen and the HTML’s opening comment.