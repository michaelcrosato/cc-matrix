Built **[Command & Coil — single-file HTML](./Command-and-Coil-Command-and-Conquer-gpt-6-astra-xhigh-20261029-1110.html)** (165 KiB).

Includes the complete RTS mission, controller controls, base building, harvesting, combat, orbital strikes, attract mode, and 1–4 player co-op. Requires WebGPU and internet access for CDN dependencies. Serve through localhost or HTTPS.

**Source Information**

- **Date:** 2026-10-29 11:52, America/Vancouver.
- **Source:** Command & Conquer; original game assets and dialogue.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, PeerJS 1.5.5, Gamepad API, Web Audio, HTML/CSS/JavaScript; esbuild 0.25.11.
- **Art:** Cel shading, geometric desert scenery, ink outlines.
- **Animation:** Procedural articulation, machinery, particles, physics debris.
- **Audio:** Original synthesized music, effects, and gibberish radio voices.
- **Online:** [AI Hub Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op and standalone WebRTC rooms.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown. Tested with Headless Chrome 154.
- **Model:** OpenAI, gpt-6-astra, reasoning effort xhigh.
- **Usage:** Approximately 42 minutes; API cost and token count unknown.

**Testing Feedback**

Passed 29 simulation checks, 15 interaction/WebRTC checks, and both official Hub suites—including server-only hosting. Also verified touch-device messaging, WebGPU rejection, and a complete mission victory without cheats. Testing remained lightweight, with no performance targets.

Two game issues were caught and fixed: misplaced hidden models and stale disconnected-player rosters. Neither was game-breaking. The most helpful test was the Hub harness; the least helpful was the initial headless screenshot test, whose rendering-environment failure required Vulkan and GPU pixel readback.

**Engine Feedback**

Scene composition and toon materials worked best. Rapier’s translation-lock API naming needed correction. The RTS simulation was the largest custom system; separating physics, rendering, and network state was hardest. I would overhaul automatic renderer fallback and add a documented strict-WebGPU option.

**Prompt Feedback**

The controller-first direction, pinned stack, and single-file requirement were especially useful. “Feature-complete” needed a concrete boundary, implemented here as one complete operation. Making deep RTS commands comfortable on a controller was hardest. The next test I’d run is four physical DualSense controllers across separate home networks.

All required information and feedback also appear in the in-game credits and the HTML’s opening comment.