Created [**Final Pulse Soldier**](./Final-Pulse-Soldier-SOURCE-gpt-6.1-sol-xhigh-20261029-0826.html), a single-file demo with a three-sector mission, multi-phase boss, twelve weapon configurations, Caravan modes, couch co-op, and AI attract mode. Requires WebGPU and internet access for CDN dependencies.

**Source information**

- Date: 2026-10-29 08:56 America/Vancouver.
- Source: [Final Soldier](https://en.wikipedia.org/wiki/Final_Soldier). Title randomly selected from 50 candidates.
- Tech: Three.js 0.180.0, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API.
- Art: procedural cel-shaded spacecraft and orbital architecture with ink outlines.
- Animation: procedural movement, banking, formations, particles, and physics debris.
- Audio: original synthesized music, effects, and gibberish radio voices.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) parallel score attacks for 1–4 players; standalone couch co-op for two.
- Environment: Codex CLI, headless Linux; production browser unknown. Tested using Chromium 154 under Xvfb.
- Model: OpenAI, gpt-6.1-sol, reasoning effort xhigh.
- Usage: approximately 30 minutes; token count and API cost unknown.

**Testing feedback:** Twenty final checks and 72 hub assertions passed. Testing caught four issues, including two critical issues involving hub startup and missed controller presses; all were resolved. The official hub harness was most helpful. Raw headless WebGPU screenshots were least helpful because their capture path was corrupted.

**Engine feedback:** Node materials were the strongest feature. Automatic WebGL fallback needed explicit removal. The main custom work was combat, stage sequencing, controller menus, audio, and session handling. Coordinating physics and rendering was hardest. I would make fallback opt-in and add a built-in fixed-step gameplay loop.

**Prompt feedback:** The source, packaging requirements, and controller focus were clear. Standalone multiplayer topology was ambiguous; I chose couch co-op alongside hub online competition. Integrating every mechanic into one coherent slice was hardest. The next useful test would use two physical DualSense controllers during a four-device hub session.

These details also appear in the in-game credits and the HTML’s leading comment.