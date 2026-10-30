Built **[Knuckle Highway](./Knuckle-Highway-Road-Rash-II-gpt-6.1-sol-xhigh-20261029-0837.html)** — a single-file demo with a 7.6 km race, bike combat, police, garage progression, attract mode, and multiplayer. Requires WebGPU and CDN access; serve over HTTPS or localhost.

**Source Information**

- **Date:** 2026-10-29 08:37, America/Vancouver.
- **Source:** Road Rash II; original procedural assets.
- **Tech:** Three.js r180, strict WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art:** Cel shading, ink silhouettes, low-poly coastal scenery.
- **Animation:** Procedural riders, wheels, steering and attacks; physics ragdolls.
- **Audio:** Code-written synth music, effects, engines and gibberish voices.
- **Online:** AI Hub race integration and standalone room-code WebRTC.
- **Testing:** Lightweight browser, physics and protocol checks; no FPS benchmark.
- **Environment:** Codex CLI, headless Linux; target browser unknown. Tested with Chrome 154.
- **Model:** OpenAI gpt-6.1-sol, xhigh.
- **Usage:** Approximately 55 minutes. API cost, tokens and breakdown unknown.

**Testing Feedback**

Eight tracked issues were fixed, including two critical startup blockers. The full race, controller settings, axis inversion, core mechanics, standalone room, and hub checks at two/four players and host departure passed.

Most helpful: actual browser smoke testing. Least helpful: a single-frame raw WebGPU capture. Controllers were emulated; real four-device coverage is unknown. [Detailed test report](./Knuckle-Highway-Road-Rash-II-gpt-6.1-sol-xhigh-20261029-0837/TESTING.md).

**Engine Feedback**

Three.js scene composition and TSL worked especially well. Automatic fallback and cold shader compilation required explicit handling. The main custom system was the motorcycle handling/combat/race controller. Reconciling physics with interpolated network riders was hardest. I’d overhaul implicit fallback and add a supported strict-WebGPU option.

**Prompt Feedback**

The specific art, audio and multiplayer requirements helped most. “All infrastructure” was open-ended; I interpreted it as a complete repeatable race with reusable systems. Integrating everything into one HTML was hardest. The best additional test would be four people using physical DualSense controllers across different devices and internet connections.

These details are also included in the in-game credits and the HTML’s opening comment.