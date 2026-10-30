Built **[Scarlet Skirmish](./Scarlet-Skirmish-Red-Alarm-gpt-6.1-sol-max-20261029-0201.html)** — a complete mission with free-flight combat, a multi-phase guardian, extraction, replay, attract mode, local split-screen co-op, and ai-hub score attack.

Serve the HTML over localhost or HTTPS. WebGPU and internet access for CDN dependencies are required.

**Source Information**

- **Date:** 2026-10-29 02:42, America/Vancouver.
- **Source:** [Red Alarm](https://manuals.plus/m/d223df79cbe6f13216596e9885d2400df1ad3055f02aa170365c800d259d0bac).
- **Tech:** Three.js R180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS.
- **Art:** Procedural cel shading, ink edges, stepped lighting, industrial scenery.
- **Animation:** Procedural transforms, interpolated cameras, physics debris, sampled replay.
- **Audio:** Original synthesized music, effects, and Animalese-inspired gibberish voices.
- **Online:** AI Hub Protocol v1, 1–4-player parallel score attack; standalone two-player local co-op.
- **Testing:** Lightweight browser checks, screenshots, and accelerated mission simulation.
- **Environment:** Codex CLI (headless), Linux/WSL2; player browser unknown. Tested Chromium 156 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost and token counts unknown; approximately 41 minutes.

**Testing Feedback**

- Testing and review found **15 issues**, including **3 potential progression/navigation blockers**. All resolved.
- Final results: **96/96 hub checks**, **17/17 standalone checks**, and complete mission-to-extraction verification.
- Most helpful: the official hub harness, which caught missed Options presses.
- Least helpful: syntax-only checking, which missed visual and progression problems.

**Engine Feedback**

- **Liked most:** Scene composition and toon materials.
- **Stuck/guessed wrong:** Automatic renderer fallback, an unsupported toon-material property, and headless GPU setup.
- **Most important custom work:** Flight combat, mission progression, controller UI, multiplayer lifecycle, and replay.
- **Hardest:** Keeping aiming, cameras, physics, and target indicators consistent.
- **Would overhaul:** Implicit renderer fallback behavior.
- **Would change:** Add a public strict-WebGPU initialization option.

**Prompt Feedback**

- **Liked most:** The distinctive source, controller-first direction, procedural audio, and concrete deliverable.
- **Confusing:** Standalone multiplayer topology was unspecified; I chose local co-op.
- **Hardest:** Integrating the complete mission, multiplayer, replay, and attract mode.
- **Additional test:** A complete physical-DualSense sortie across separate devices in ai-hub.

This record is also included in the in-game About/Credits screen and the HTML’s top comment.