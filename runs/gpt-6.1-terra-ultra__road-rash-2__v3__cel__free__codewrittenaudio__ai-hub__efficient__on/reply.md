**Road Rattle** is packaged as a single HTML file:

[Download Road Rattle](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v17__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road Rattle-Road Rash II-gpt-6.1-terra-ultra-20261029-0927.html>)

It includes a coastal race with AI rivals, traffic, directional combat, boost, damage and recovery, controller-first menus, an attract mode, axis inversion settings, AI Hub integration, and standalone room-code multiplayer. It requires a WebGPU-capable browser and an internet connection for its CDN dependencies.

The race rendered and accelerated in headless Chrome using Vulkan/SwiftShader. A two-browser test also connected a standalone room. **A full race finish and multiplayer race synchronization remain unverified.**

### Source information

- **Date and source:** 2026-10-29 09:27; *Road Rash II*.
- **Tech:** Three.js r180 WebGPU, Rapier 0.19.3, Web Audio API, Gamepad API, PeerJS 1.5.5, and AI Hub session protocol 1.3.0.
- **Art and animation:** Original cel-shaded, low-poly scenery and riders, animated with procedural transforms and simulation.
- **Audio:** Code-synthesized music, engine sounds, effects, and gibberish rider voices.
- **Online:** AI Hub race sessions and standalone private rooms for up to four riders.
- **Testing:** Lightweight syntax, browser interaction, rendering, and two-player room-signaling checks; performance targets were out of scope.
- **Environment:** Codex CLI, headless Linux, Google Chrome 154.
- **Model:** OpenAI gpt-6.1-terra, reasoning effort ultra.
- **Usage:** API cost, token count, and session time unknown.

### Testing feedback

Testing caught **two issues**, including **one game-breaking issue**: the first package accidentally commented out its scripts. That and a HUD overlap were fixed. The most helpful test was opening and playing the assembled file in Chrome; syntax checking alone was the least helpful because it could not exercise rendering or gameplay.

### Engine feedback

Three.js made the procedural scene and lighting quick to build. WebGPU initialization and headless graphics configuration required the most investigation. The most important custom work was the race logic, rider behavior, combat, and controller interface. Clearer diagnostics and an explicit WebGPU-only initialization option would improve the engine experience.

### Prompt feedback

The strongest part of the prompt was its clear creative direction and controller-first focus. Standalone multiplayer parity with hub sessions left some room for interpretation. Integrating the race, combat, networking, audio, and interface into one portable file was the hardest part. The most valuable remaining test would be a full four-player controller race on separate devices under varying network conditions.