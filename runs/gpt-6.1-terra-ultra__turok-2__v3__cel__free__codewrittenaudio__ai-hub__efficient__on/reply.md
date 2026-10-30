Built [Raptor: Garden of Ruin](./Raptor-Garden-of-Ruin-Turok-2-Seeds-of-Evil-gpt-6.1-terra-ultra-20261029-0920.html). The development files are in the matching [subfolder](./Raptor-Garden-of-Ruin-Turok-2-Seeds-of-Evil-gpt-6.1-terra-ultra-20261029-0920).

The demo has three combat zones, two weapons, pickups, destructible warded seeds, a finale, and a looping attract-mode hunt. It supports controller and keyboard/mouse input, including separate look-axis inversion settings. Serve the HTML from localhost or HTTPS in a WebGPU-capable browser; it downloads its engine dependencies from CDNs.

Standalone multiplayer shares hunter positions through WebRTC room codes, while each player’s enemies and objectives remain independent. AI Hub uses parallel sessions. Cross-device networking and a physical controller were not tested. The level is authored in code; the deliverable does not include a designer-facing level editor.

### Source information

- **Date and source:** 2026-10-29 09:20; *Turok 2: Seeds of Evil*.
- **Tech:** Three.js R180 with WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5/WebRTC, and AI Hub session client 1.3.0.
- **Art and animation:** Procedural cel-shaded geometry and procedural character and object animation.
- **Audio:** Code-generated music, sound effects, and synthesized gibberish voice.
- **Online:** Standalone position-sharing rooms and AI Hub parallel sessions.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown. Headless Chrome was used for testing.
- **Model:** OpenAI, gpt-6.1-terra, reasoning effort ultra.
- **Usage:** Token count and API cost unknown; session time was approximately seven minutes.

### Testing feedback

Four implementation issues were found and fixed; two could have blocked or obscured progress. The most helpful test was an autonomous run through all three encounters, Rapier gates and the finale. Syntax checks were the least informative. A headless WebGPU browser pass also checked rendering, settings, movement and pause.

### Engine feedback

Three.js made the procedural world straightforward to assemble. Bringing WebGPU, physics and browser input together required the most care; the character, combat and level systems had to be built for the demo. A clearer explicit no-fallback capability and device-loss path would make WebGPU failures easier to diagnose.

### Prompt feedback

The controller-first and attract-mode requirements gave the demo a clear direction. The broad request for a complete engine and polished vertical slice was the most difficult scope to reconcile with a single-file deliverable. The most valuable additional test would be a full physical-controller and cross-device multiplayer playthrough.