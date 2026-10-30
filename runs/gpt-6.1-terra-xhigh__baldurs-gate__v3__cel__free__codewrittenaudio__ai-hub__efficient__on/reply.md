Created [The Wobbly Gate — playable HTML](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The Wobbly Gate-Baldur's Gate-gpt-6.1-terra-xhigh-20261029-0929.html>).

The slice includes party combat, dialogue choices, a quest, two endings, saving, attract mode, controller settings, AI Hub side-by-side sessions, and standalone online rooms. It requires WebGPU and an internet connection for its CDN dependencies.

**The demo is not fully verified.** A scripted quest flow reached an ending, but headless Chrome could not display the WebGPU scene because its graphics surface failed to initialize. A physical controller, standalone online rooms, and a multi-player AI Hub session still need testing. I therefore can’t confirm the requested visual polish or complete playability.

**Source information:** Baldur’s Gate; 2026-10-29 09:29. Three.js r180 with WebGPU, Rapier 0.19.3, PeerJS 1.5.5, Web Audio, Gamepad API, and AI Hub Session Protocol v1. The art uses procedural cel-shaded fantasy geometry; animation uses procedural transforms and particles. Music, effects, and gibberish voices are synthesized in code. Testing used lightweight headless Chrome 154 and static checks. Environment: Codex CLI headless on Linux; model: OpenAI gpt-6.1-terra, reasoning effort xhigh. Token usage and API cost: unknown.

**Testing feedback:** Four issues were caught, including one game-breaking graphics failure in the headless configuration. The scripted quest flow was the most helpful test; the syntax check was the least helpful.

**Engine feedback:** Three.js made procedural scene construction approachable. WebGPU initialization and diagnosis were the hardest parts, and the headless device failure was an unexpected result. The party, quest, dialogue, input, and save systems had to be built for the game. I would improve WebGPU-only failure diagnostics and overhaul automatic renderer fallback.

**Prompt feedback:** The controller-first and attract-mode requirements were especially useful. Standalone multiplayer signaling was unspecified. The hardest part was fitting the RPG systems into a single-file slice. The most valuable additional test would be a full playthrough on a WebGPU-capable browser with a PS5 controller and multiple online participants.