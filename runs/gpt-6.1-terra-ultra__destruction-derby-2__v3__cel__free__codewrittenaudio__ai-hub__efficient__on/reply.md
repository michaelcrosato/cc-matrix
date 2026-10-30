Created [Derby Crash Club](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Derby Crash Club-Destruction Derby 2-gpt-6.1-terra-ultra-20261029-0924.html>), a single-file demo with a crash-scoring race, demolition bowl, controller settings, attract mode, synthesized audio, AI Hub integration and standalone online rooms. The [development files](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Derby Crash Club-Destruction Derby 2-gpt-6.1-terra-ultra-20261029-0924>) are alongside it.

**The 3D scene and driving remain unverified.** In headless Chrome, the software WebGPU device was lost; an independent minimal Three.js scene reproduced the same failure. The menu, race start, countdown, HUD, attract-mode entry and exit, and device-loss message were checked without JavaScript page errors. The networking adapter passed a mock three-peer test; live WebRTC and AI Hub sessions were not tested. The HTML loads its libraries from CDNs and requires WebGPU.

### Source information

- **Date and source:** 2026-10-29 09:24; *Destruction Derby 2*.
- **Tech:** Three.js 0.180.0 WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5 and AI Hub session client.
- **Art and animation:** Procedural cel-shaded stadium and cars; physics-driven vehicles with procedural wheels, camera, particles and damage.
- **Audio:** Code-synthesized music, engines, impacts and gibberish announcer.
- **Online:** AI Hub sessions and standalone peer-hosted rooms.
- **Testing:** Lightweight browser and mock-network checks; performance targets were out of scope.
- **Environment:** Codex CLI, headless Linux; browser unknown. Testing used Chrome’s headless software WebGPU adapter.
- **Model:** OpenAI gpt-6.1-terra, reasoning effort ultra. **Usage:** unknown.

### Testing feedback

Testing found **one critical environment issue**: the headless WebGPU device loss prevented 3D validation. It confirmed no game-code defects, though that is not proof the unverified gameplay is defect-free. The most helpful test was comparing the failure with a minimal Three.js scene; syntax-only checking was the least helpful.

### Engine feedback

Three.js made the procedural scene straightforward to express. WebGPU device loss blocked visual verification, and integrating rendering, physics and networking was the hardest part. The most important custom work was the arcade driving, AI and race rules. WebGPU initialization is the strongest candidate for overhaul; clearer device-loss diagnostics would help.

### Prompt feedback

The specific arcade inspiration and controller-first direction were the most useful parts of the prompt. The standalone multiplayer scope left the most room for interpretation, and making the systems work together was the hardest task. The most valuable additional test would be a real-GPU, multi-device controller and network playtest.