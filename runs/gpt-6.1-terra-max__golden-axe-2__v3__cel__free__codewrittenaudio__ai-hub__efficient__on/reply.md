**[Play Golden Whacks II](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Golden Whacks II-Golden Axe II-gpt-6.1-terra-max-20261029-0911.html>)**  
[Development files and rebuild instructions](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Golden Whacks II-Golden Axe II-gpt-6.1-terra-max-20261029-0911/README.md>)

Serve the file from localhost or HTTPS in a WebGPU-capable browser. An internet connection is needed to load the CDN dependencies. The title was selected with a random number generator from 50 candidates.

The demo includes four encounters, a boss, local and online co-op, and a looping attract mode. On a controller, use **Square** to attack, **Cross** to jump, **Circle** to dodge, **Triangle** for magic, **L1** to guard, and **R1** to ride. Options opens Settings.

### Source information

- **Date and source:** 2026-10-29 09:11; *Golden Axe II*.
- **Technology:** Three.js r180 with WebGPU only, Rapier 3D 0.19.3, Web Audio, WebRTC, Gamepad API, and [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Art and animation:** Original procedural cel-shaded 3D; articulated procedural character animation and physics.
- **Audio:** Code-generated music, effects, and synthesized gibberish vocalizations.
- **Online:** Host-authoritative AI Hub co-op for up to four players; direct two-player WebRTC using exchanged connection codes. Direct connections have no relay and may fail on restrictive networks.
- **Environment and usage:** Codex CLI headless on Linux; deployment browser unknown. API cost and token usage are unknown; session time was approximately 48 minutes.

### Testing feedback

Testing caught **two issues**, neither game-breaking: an unsupported material option and scenery outside the camera view. Code review found and fixed three more issues involving attract looping, remote pickup display, and audio unlocking in hub sessions.

The most helpful test was the assisted combat and progression run through all four encounters and victory. The least helpful was the first headless WebGPU screenshot, which showed a blank compositor capture; a later render-target readback succeeded.

The delivered WebGPU build passed the two-player AI Hub harness. Four-player and dedicated-host harness checks passed with a test-only rendering stub. A local two-browser WebRTC connection, emulated controller input, and targeted mechanics checks also passed. Physical controllers and remote-network play remain untested.

### Engine feedback

Three.js made procedural scene construction approachable. I initially guessed a material option incorrectly and had to investigate headless WebGPU capture. The most important custom work was combat, animation, encounter progression, and shared-world networking; WebGPU initialization and testing were the hardest engine-specific parts. I would overhaul automatic fallback handling and add an explicit no-fallback option with clearer diagnostics.

### Prompt feedback

The arcade reference and controller-first direction were especially clear. Standalone online signaling was unspecified, so the game uses manually exchanged WebRTC codes. Integrating shared-world co-op into the single-file WebGPU demo was the hardest part. The most valuable additional test would be a full playthrough with four people, physical controllers, and real internet latency.