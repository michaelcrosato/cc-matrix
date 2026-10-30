Built **[Shells in the Cosmic Clock](./Shells-in-the-Cosmic-Clock-Turtles-in-Time-gpt-6-astra-max-20261029-0944.html)**: three eras, nine encounters, four heroes, a boss, couch/online co-op, and looping attract mode.

Serve through HTTPS or localhost. Requires WebGPU and internet for CDN dependencies.

**Source information**

- Date: 2026-10-29 10:53 America/Vancouver.
- Source: **Turtles in Time**.
- Tech: Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS.
- Art: procedural cel-shaded 3D with ink outlines.
- Animation: hierarchical procedural rigs, combat states, eased movement, physics-driven throws and debris.
- Audio: original synthesized music, effects, and gibberish voices.
- Online: AI Hub client 1.3.0 co-op; PeerJS 1.5.5 standalone WebRTC rooms.
- Environment: Codex CLI, headless Linux; target browser unknown. Tested Chrome 154.
- Model: OpenAI gpt-6-astra, reasoning effort max.
- Usage: approximately 68 minutes; API cost and token count unknown.

**Testing feedback**

Lightweight validation passed **121 hub checks and 12 combat checks**, plus campaign progression, attract looping, controller navigation, retry, WebRTC, and touch-only settings.

Two game issues were caught and fixed: overlapping attract dialogue and slow disconnect cleanup. **Zero game-breaking defects observed.** Most helpful: multiplayer lifecycle tests. Least helpful: syntax checks alone.

**Engine feedback**

The scene graph and toon materials worked well. Automatic renderer fallback and headless Vulkan configuration needed extra handling. I built the combat director, animation rigs, UI, and replication layer. Synchronizing immediate controls with host-owned combat was hardest. I would overhaul implicit fallback behavior and add an official fixed-step multiplayer example.

**Prompt feedback**

The controller, attract-mode, and packaging requirements were clear. Target hardware and demo duration were unspecified. Completing both multiplayer transports alongside the brawler was hardest. The additional test I’d choose is four physical DualSense controllers playing across separate networks.

These details are also included in the in-game About pages and the HTML’s opening comment.