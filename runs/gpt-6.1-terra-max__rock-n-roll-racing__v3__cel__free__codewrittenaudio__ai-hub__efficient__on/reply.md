[Play Road n Roll Riot](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road n Roll Riot-Rock n' Roll Racing-gpt-6.1-terra-max-20261029-0857.html>)

The demo includes a three-track cup, combat and pickups, garage upgrades, AI rivals, attract mode, standalone room-code multiplayer, and AI Hub race sessions. It requires a WebGPU-capable browser and internet access for its CDN dependencies. The [development notes](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road n Roll Riot-Rock n' Roll Racing-gpt-6.1-terra-max-20261029-0857/DEVELOPMENT.md>) describe the content tables and build.

**Source Information**

- **Date:** 2026-10-29 08:57. **Source:** Rock n’ Roll Racing.
- **Tech:** Three.js r180 with WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, and [AI Hub Session Protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) client 1.3.0.
- **Art and animation:** Procedural cel-shaded, low-poly visuals; procedural vehicle, wheel, pickup and particle animation with Rapier physics.
- **Audio:** Code-generated rock-inspired music, synthesized effects and gibberish announcer voice.
- **Online:** AI Hub shared races and standalone room-code races for up to four players.
- **Testing:** Lightweight Chrome 154 tests under Xvfb with software WebGPU, simulated controller and touch input, accelerated races, the hub harness, and two local PeerJS clients.
- **Environment:** Codex CLI headless; Linux; user’s browser unknown. **Model:** OpenAI, gpt-6.1-terra, reasoning effort max.
- **Usage:** API cost and token count unknown; session time approximately 25 minutes.

**Testing Feedback**

Testing and review caught **six issues, including two critical multiplayer issues**; all were corrected. The most helpful test was the four-player hub harness with host departure and emulated controller input. The least helpful was an initial WebGPU probe on `about:blank`, which did not represent the localhost game page. Physical controllers and players on separate networks remain untested.

**Engine Feedback**

Three.js made the procedural 3D presentation approachable. The initial headless WebGPU setup produced a black canvas; Xvfb with software Vulkan resolved it. The main systems built from scratch were racing, combat, AI and peer synchronization, with networked physics the hardest to coordinate. I would overhaul the implicit WebGL fallback and add a documented WebGPU-only renderer option.

**Prompt Feedback**

The controller-first arcade direction was the clearest and most useful part. The broad boundary of a “complete vertical slice” required a scope decision, so the demo uses a three-track cup. Combining the racer with both multiplayer paths was the hardest part. The next test would be a four-person session using physical controllers on separate devices and networks.