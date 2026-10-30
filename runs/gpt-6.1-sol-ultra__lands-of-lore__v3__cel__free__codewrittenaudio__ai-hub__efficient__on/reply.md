Built [**Lands of Thorns: The Throne of Folly — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Lands-of-Thorns-The-Throne-of-Folly-Lands-of-Lore-The-Throne-of-Chaos-gpt-6.1-sol-ultra-20261029-0809.html).

Includes the complete expedition, party combat, puzzles, equipment, saving, attract mode, and co-op. Serve over HTTPS or localhost; CDN dependencies require internet.

**Source Information:** Also included in About/Credits and the HTML’s opening comment.

- **Date:** 2026-10-29 08:41 PDT.
- **Source:** *Lands of Lore: The Throne of Chaos*.
- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, ai-hub client 1.3.0; esbuild 0.25.12.
- **Art:** Procedural cel-shaded geometry and original SVG portraits.
- **Animation:** Procedural character rigs, combat states, weapons, particles, and scenery.
- **Audio:** Original synthesized music, effects, and Animalese-style gibberish voices.
- **Online:** 1–4-player standalone WebRTC and ai-hub co-op.
- **Environment:** Codex CLI, headless Linux/WSL2; tested using Chrome 154. Player browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort ultra.
- **Usage:** API cost in USD and token totals unknown; approximately 32 minutes.

**Testing Feedback:** Passed **35/35 solo**, **13/13 co-op**, and **73/73 official hub checks**, plus attract-mode and audio checks. Recorded 26 issue groups across testing and integration review, including five potentially play-blocking groups; all corrected. The full quest playthrough and hub harness were most helpful; syntax checks were least informative. Mechanics tests used traversal/frame advancement after actual WebGPU rendering verification. Physical PS5 controllers, hardware GPUs, WAN conditions, and other browsers remain untested.

**Engine Feedback:** Three’s scene graph and Toon materials worked particularly well. An incorrect wall dimension initially obscured the courtyard; screenshot inspection and raycasting exposed it. The largest custom systems were party combat, progression, puzzles, controller navigation, and network authority. Coordinating asynchronous startup with shared simulation was hardest. I would overhaul automatic renderer fallback and add a controller-focused game shell.

**Prompt Feedback:** The source, controller-first direction, attract mode, and packaging requirements gave clear creative direction. “Feature-complete” needed a bounded interpretation: this release contains a complete five-area expedition. Integrating every mechanic into that expedition was hardest. The most useful additional test would be a four-player WAN playthrough using physical PS5 controllers across browsers.