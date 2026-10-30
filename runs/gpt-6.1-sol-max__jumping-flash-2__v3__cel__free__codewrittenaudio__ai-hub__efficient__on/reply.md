Built [**Hopping Rocket! — single HTML demo**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Hopping-Rocket-Jumping-Flash-2-gpt-6.1-sol-max-20261029-0418.html).

Includes nine islands, triple jumps, dash, stomp, fireworks, four rescues, a boss, checkpoints, couch co-op, ai-hub competition, and attract mode. Requires WebGPU and CDN access; serve through localhost or HTTPS.

**Source Information**

- Date: 2026-10-29 04:18, America/Vancouver.
- Inspiration: *Jumping Flash! 2*. Title selected using a real RNG after brainstorming 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, HTML/CSS/JavaScript.
- Art: procedural cel shading, ink outlines, pastel sky islands.
- Animation: hierarchical rigs, procedural motion, physics, squash/stretch, particles.
- Audio: original code-written music, synthesized effects, gibberish voices.
- Online: [ai-hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), Protocol v1/client 1.3.0, 1–4-player parallel competition. Standalone: two-player split-screen co-op.
- Environment: Codex CLI, headless Linux; runtime browser unknown. Tested with Chrome 154.0.8037.57.
- Model: OpenAI, gpt-6.1-sol, reasoning effort max.
- Usage: API cost and token totals unknown; session approximately 40 minutes.

**Testing Feedback**

- **37/37 automated checks passed**, including hub rounds with one player, two players, and a player leaving. Real WebGPU screenshots verified the scene and split-screen.
- Five issues resolved; one was a rendering blocker in the test browser’s setup. None remain unresolved.
- Most helpful: input/progression checks covering rescues, boss vulnerability, completion, and ferry carrying.
- Least helpful: the initial screenshot before correcting software-WebGPU configuration.
- Testing stayed lightweight. Physical DualSense hardware, audible sound quality, and remote multi-device transport remain unverified.

**Engine Feedback**

- Best: scene composition and toon materials.
- Wrong guesses: Rapier’s module entry point and Three.js fallback caching.
- Most important custom system: triple-jump movement and airborne camera.
- Hardest: coordinating kinematic physics, moving platforms, and split-screen.
- Overhaul: implicit renderer fallback.
- Desired change: a documented, complete character-controller starter.

**Prompt Feedback**

- Best: the movement reference and controller-first direction.
- Confusing: standalone multiplayer transport was unspecified; chose couch co-op.
- Hardest: making every requested system feel cohesive.
- Additional test: a physical DualSense playthrough across two devices.

These details are also embedded in About/Credits and the HTML’s opening comment.