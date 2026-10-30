Built [Jolly Jump Jet!](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Jolly Jump Jet!-Jumping Flash! 2-gpt-6.1-terra-xhigh-20261029-0931.html>). The development files are in the [matching folder](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Jolly Jump Jet!-Jumping Flash! 2-gpt-6.1-terra-xhigh-20261029-0931>).

The demo includes a three-beacon rescue course, triple jumps, combat, a scripted attract mode, controller-first settings, [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) parallel sessions, and standalone score rooms. It requires a WebGPU-capable browser and an internet connection for its CDN dependencies.

**Verification has a material limit:** the AI Hub harness passed with one and two players, including keyboard input, settings, progress, and results. The available headless WebGPU device failed to produce a usable rendered image, so I could not verify the 3D scene visually or complete a real-device playthrough. A physical controller and standalone multiplayer room were also not tested.

**Source information**

- Date: 2026-10-29 09:31. Source: *Jumping Flash! 2*.
- Tech: Three.js r180 WebGPU, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, and AI Hub Session Protocol client 1.3.0.
- Art and animation: original procedural cel-shaded geometry, procedural transforms, and physics.
- Audio: code-synthesized music, effects, and gibberish voice.
- Online: AI Hub parallel sessions and standalone PeerJS score rooms.
- Testing: lightweight headless browser smoke tests and AI Hub harness runs.
- Environment: Codex CLI, headless Linux, Chrome. Model: OpenAI gpt-6.1-terra, reasoning effort xhigh.
- Usage: API cost and token count unknown; session time approximately nine minutes.

**Testing feedback:** Four issues were identified: three interaction issues were corrected, and one critical headless WebGPU test-environment failure remained. The AI Hub harness was the most helpful test; the static syntax check was the least helpful.

**Engine feedback:** Procedural 3D and physics were the most useful parts. I initially expected headless WebGPU compositing to provide a visual capture, but it failed. The game rules, movement, and interface needed custom implementation. WebGPU startup and diagnostics were the hardest parts; clearer device-loss and compatibility diagnostics would be the most useful overhaul.

**Prompt feedback:** The creative direction and controller-first goal were especially clear. The standalone multiplayer transport was unspecified. Integrating the systems into one deployable file was the hardest part. The most valuable additional test would be a full controller playthrough on a working WebGPU device.

The automated cleanup command was rejected because it included recursive deletion, so temporary Chrome test profiles remain in the workspace.