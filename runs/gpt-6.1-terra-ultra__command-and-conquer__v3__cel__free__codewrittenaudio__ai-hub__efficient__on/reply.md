[Play Command & Thunder](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command & Thunder-SOURCE-gpt-6.1-terra-ultra-20261029-0922.html>) · [Development files](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command & Thunder-SOURCE-gpt-6.1-terra-ultra-20261029-0922>)

The demo includes a solo RTS operation, attract mode, controller and keyboard controls, and a multiplayer score race. It requires WebGPU and an internet connection to load its CDN dependencies. Standalone multiplayer uses room codes; AI Hub sessions connect automatically.

**Source information**

- Date: 2026-10-29 09:22. Source: Command & Conquer.
- Tech: Three.js r180 with WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, and AI Hub session 1.3.0.
- Art: cel-shaded low-poly 3D. Animation: procedural transforms and physics simulation. Audio: code-generated music, effects, and gibberish radio voices.
- Online: AI Hub parallel sessions and standalone WebRTC score races for up to four players.
- Testing: lightweight headless browser, simulation, and network checks. Environment: Codex CLI (headless); Linux; browser unknown. Model: OpenAI, gpt-6.1-terra, reasoning effort ultra. Usage and session cost: unknown.

**Testing feedback**

Testing and review caught **four issues**, none considered game-breaking: two hub state-probe errors, a stray cursor marker, and HUD mouse interception. All were fixed. The most helpful test was the AI Hub harness, which passed 20/20 checks with both two and three players. Syntax checking alone was the least helpful.

The packaged file also passed a headless WebGPU smoke test; a live WebRTC connection and a 120-second Rapier simulation passed. The hub harness run did not exercise gamepad emulation, and a physical controller was not tested.

**Engine feedback**

Three.js made the procedural battlefield and WebGPU rendering approachable. The initial headless GPU configuration produced a black frame; Vulkan with SwiftShader resolved the test environment. The RTS simulation, AI, and controller interface were the most substantial systems built for the game. Coordinating physics, rendering, and browser lifecycle was the hardest integration work. WebGPU initialization and compatibility diagnostics are the areas I would most want to overhaul.

**Prompt feedback**

The clearest strengths were the controller-first direction and the request for a complete playable slice. Combining the broad gameplay scope with multiplayer in one file was the hardest part; nothing in the prompt was materially confusing. The most valuable additional test would be a full multiplayer session with physical controllers on separate devices.