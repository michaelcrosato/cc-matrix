Created **[Road Wreck — single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v17__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road-Wreck-Road-Rash-II-gpt-6-astra-xhigh-20261029-1121.html)**.

Includes three events, combat, stolen chains, police, traffic, jumps, crash recovery, garage upgrades, attract mode, and multiplayer. Serve over HTTPS or localhost in a WebGPU browser.

**Source Information:** Date: 2026-10-29 11:21, America/Vancouver. Source: *Road Rash II*. Title randomly selected from 50 candidates.

- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Procedural cel shading and ink outlines.
- **Animation:** Articulated riders, rotating wheels, Rapier ragdolls, spring camera.
- **Audio:** Original synthesized music, effects, engines, and gibberish voices.
- **Online:** 1–4-player races through the [AI Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) or standalone WebRTC rooms. Standalone host departure allows local completion; shared play ends.
- **Environment:** Codex CLI, headless Linux; tested with Chrome 154.0.8037.57.
- **Model:** OpenAI gpt-6-astra, xhigh.
- **Usage:** Approximately 46 minutes; API cost and token count unknown.

**Testing Feedback:** 121 checks passed, plus three complete AI races and WebGPU visual checks. Testing found four game issues, including two blocking issues; all were fixed. The browser mechanics test was most helpful; syntax-only checks were least helpful. Tests were lightweight, with rendering checked separately from simulation/protocol tests. Physical DualSense hardware and cross-household networking remain untested.

**Engine Feedback:** Three.js scene composition and Rapier contacts worked well. I initially guessed the Rapier module filename incorrectly and needed specific headless graphics flags. The largest custom system was motorcycle control, combat, and replication. Matching curved-road visuals to physics and remote riders was hardest. I would overhaul implicit graphics fallback and add an arcade vehicle controller with predictable suspension and recovery.

**Prompt Feedback:** The source, art/audio constraints, and controller emphasis were clear. “Feature-complete” left the slice’s boundary ambiguous. Combining polished racing, progression, and two multiplayer transports in one file was hardest. The additional test I would choose is four physical DualSense players on separate home networks, including a disconnect.

The required information and feedback are also embedded in **About/Credits** and the HTML’s opening comment.