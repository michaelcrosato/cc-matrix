Built **[Tu-Rex: Weeds of Wrath — single HTML](./Tu-Rex-Weeds-of-Wrath-Turok-2-Seeds-of-Evil-gpt-6.1-sol-ultra-20261029-0725.html)**.

Includes the complete expedition, three weapons, rescues, swimming, dash relic, secrets, checkpoints, boss, attract mode, and co-op. Serve through HTTPS or localhost; WebGPU is required.

**Source Information.**

- Date: 2026-10-29 15:02 UTC.
- Source: Turok 2: Seeds of Evil.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio; PeerJS 1.5.5.
- Art: Procedural cel shading and angular alien ruins.
- Animation: Procedural articulated creatures, weapons, vegetation, projectiles and effects.
- Audio: Code-written adaptive music, synthesized effects and gibberish voices.
- Online: AI Hub and standalone 1–4-player co-op.
- Testing: Focused, lightweight checks; physical controllers and separate-device WAN behavior remain unknown.
- Environment: Codex CLI (headless), Linux; target browser unknown. Tested Chrome 154 through Xvfb.
- Model: OpenAI, gpt-6.1-sol, reasoning effort ultra.
- Usage: API cost and token count unknown; approximately 36 minutes.

**Testing Feedback.** Corrected 23 issue categories, including three game-breaking defects. Passed 25 game-flow checks, five combat checks, live standalone WebRTC exchange, and hub suites of 24/24 and 25/25. Hub protocol testing isolated drawing; actual WebGPU visuals and audio passed separately. The dedicated-server harness was most helpful; syntax-only checks were least helpful.

**Engine Feedback.** Best feature: node materials for cel shading. Wrong turn: Linux adapter selection initially produced blank rendering. The largest custom systems were missions, controller navigation and authoritative co-op. Coordinating responsive local movement with shared state was hardest. I would overhaul implicit backend fallback and add a maintained first-person physics/network reference.

**Prompt Feedback.** The concrete requirements and creative freedom worked well. “Feature-complete” left the content boundary ambiguous. Integrating the full experience into one HTML was hardest. The additional test I would choose is a complete four-player expedition using physical DualSense controllers across separate networks.

These details are also embedded in the HTML comment and in-game About screen.