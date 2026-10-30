Created [Alien Solstice](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Alien-Solstice-Alien-Soldier-gpt-6.1-terra-xhigh-20261029-0939.html>), a three-encounter boss rush with three weapons, hover, phase dash, local two-player co-op, attract mode, and AI Hub parallel score sessions. Its development files are in the matching subfolder.

**The demo still needs a real-display visual check.** Headless Chrome initialized WebGPU but displayed a white surface and reported an uninitialized shared image, so I could not confirm how the scene renders on a working WebGPU device. Standalone multiplayer is local co-op; online score play uses AI Hub, with no standalone matchmaking.

**Source information**

- Date: 2026-10-29 09:39. Source: *Alien Soldier*.
- Tech: Three.js r180 with WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, and AI Hub Session Protocol v1. CDN access is required for dependencies.
- Art and animation: original cel-shaded geometric 3D with procedural character and effects animation.
- Audio: code-generated music, effects, and synthesized gibberish voice.
- Environment: Codex CLI, headless Linux; browser unknown in the source record. Testing used Chrome 154.
- Model: OpenAI gpt-6.1-terra, reasoning effort xhigh. Usage and API cost: unknown. Session time: approximately 8 minutes.

**Testing feedback**

Two issues were observed: starting-height shots could miss the boss, which was adjusted, and the headless WebGPU surface rendered white, which remains unresolved in that environment. The latter was game-breaking in the test environment; its behavior on a real display is unknown.

The most helpful checks were the AI Hub harness and keyboard combat test. One-player, two-player, and player-leave hub scenarios passed; keyboard fire reduced boss health; and the attract replay reached encounter three and exited on input. The least helpful check was the headless screenshot because of the surface failure. A physical controller was not tested.

**Engine feedback**

Three.js made scene composition flexible. WebGPU initialization and diagnosing the surface failure were the hardest parts; combat, enemy AI, animation, and audio had to be built for the game. I would improve the engine’s WebGPU backend diagnostics to make rendering failures easier to identify.

**Prompt feedback**

The arcade reference and controller-first direction were useful. The scope of standalone online multiplayer was ambiguous, so I chose local co-op for standalone play and parallel online score sessions through AI Hub. Integrating the full slice was the hardest part. The most useful additional test would be a playthrough on a real WebGPU display with a DualSense and a multi-device hub session.