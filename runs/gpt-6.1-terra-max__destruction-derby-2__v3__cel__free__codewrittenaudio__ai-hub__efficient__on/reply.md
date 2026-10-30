[Play Metal Mayhem Derby](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Metal-Mayhem-Derby-Destruction-Derby-2-gpt-6.1-terra-max-20261029-0905.html>) · [Development folder](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Metal-Mayhem-Derby-Destruction-Derby-2-gpt-6.1-terra-max-20261029-0905>)

The demo includes a three-lap wrecking race, a timed demolition bowl, AI rivals, directional damage, boost, attract mode, AI Hub races, and standalone room-code multiplayer. It requires **WebGPU** and an internet connection for its CDN dependencies.

Drive with **R2 / Cross**, steer with the **left stick**, brake with **L2**, and boost with **R1**. Keyboard controls are **WASD**, **Shift** for boost, **Space** for handbrake, **R** for reset, and **Esc** for settings.

### Source information

- **Date and source:** 2026-10-29 09:05; *Destruction Derby 2*.
- **Tech:** Three.js r180 WebGPU, Rapier 3D 0.19.3, Web Audio API, Gamepad API, PeerJS 1.5.5, and [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Art, animation, and audio:** Original cel-shaded motorsport art; procedural vehicle, camera, and particle animation; code-generated music, effects, and gibberish announcer.
- **Online:** Shared AI Hub races and standalone PeerJS/WebRTC room-code races.
- **Environment and model:** Codex CLI headless; Linux; browser unknown. OpenAI gpt-6.1-terra, reasoning effort max.
- **Usage:** API cost and token count unknown; approximately 20 minutes wall-clock time.

### Testing feedback

Testing and review found **five issues**, including **one game-breaking startup syntax error**; all were fixed. The accelerated full-race simulation was most helpful. A headless WebGPU screenshot was least helpful because the canvas rendered blank; a virtual display produced a usable image.

The release passed the two-player AI Hub harness **24/24**. A four-player host-departure run also passed **24/24** with rendering disabled. Two local browser clients connected through live PeerJS signaling. A four-player race on separate machines with physical controllers remains untested.

### Engine feedback

Three.js scene composition and toon materials were useful. I initially expected headless Chrome to display WebGPU screenshots; a virtual display resolved that. The main custom work was vehicle handling, damage, AI, audio, and synchronization. Responsive networked collisions were the hardest part. I would overhaul the renderer’s automatic WebGL fallback and add an explicit WebGPU-only initialization option with clearer diagnostics. [Three.js WebGPU documentation](https://threejs.org/docs/pages/WebGPURenderer.html)

### Prompt feedback

The source reference, controller-first requirements, and attract mode gave the work a clear direction. The filename’s “SOURCE” was ambiguous, so I interpreted it as *Destruction Derby 2*. Combining solid networked rivals with the arcade slice was the hardest part. The most valuable additional test would be four players on separate machines using physical controllers over the internet.