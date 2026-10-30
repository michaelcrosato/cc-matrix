[**Destruction Dirtball — single-file game**](./Destruction-Dirtball-Destruction-Derby-2-gpt-6-astra-xhigh-20261029-1117.html)

Includes three events, three cars, 12 drivers, persistent damage and repairs, synthesized audio, controller menus, attract mode, and multiplayer. Serve over HTTPS or localhost; CDN dependencies require internet access.

**Source Information**

- **Date:** 2026-10-29 12:08 America/Vancouver.
- **Source:** Destruction Derby 2. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, PeerJS 1.5.5. GPU frames use pixel readback for presentation; no WebGL fallback.
- **Art/animation:** Procedural cel-shaded cars and stadiums; physics-driven movement, wheel animation, dents, dust and debris.
- **Audio:** Original code-written music, effects and gibberish announcer.
- **Online:** 1–4-player AI Hub versus integration and standalone WebRTC rooms.
- **Testing:** Focused browser, simulation, controller and protocol checks; no FPS target.
- **Environment:** Codex CLI, headless Linux/WSL2; player browser unknown. Tested with Chrome 154 and software Vulkan.
- **Model:** OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** Approximately 50 minutes; API cost and token count unknown.

**Testing Feedback**

Seven game issues were fixed, including three critical issues. All **73 hub checks passed**. Driving, complete races, tour progression, attract mode, controller navigation and standalone multiplayer were checked.

Most helpful: the two-browser multiplayer test. Least helpful: syntax checking alone. Physical controllers and consumer WAN/NAT combinations remain untested.

**Engine Feedback**

- Best: toon materials and Rapier contacts.
- Wrong turns: texture bindings, implicit fallback and headless canvas presentation.
- Largest custom system: vehicle handling, damage, progression and networking.
- Hardest: keeping shared simulation independent of rendering.
- Overhaul: renderer fallback configuration.
- Desired addition: an official integrated arcade-vehicle example.

**Prompt Feedback**

The source, visual direction and controller requirements were clear. “Feature-complete” left the content boundary open. The hardest requirement was combining polish and both multiplayer transports in one HTML file. The next valuable test would use four physical DualSense controllers across real networks and different GPUs.

These notes are also included in the HTML’s top comment and in-game About screen.