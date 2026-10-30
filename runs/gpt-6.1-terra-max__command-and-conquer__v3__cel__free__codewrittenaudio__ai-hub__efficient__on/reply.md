**Command & Catalyst is ready to play.** The single HTML file includes the game, AI Hub client, and credits; it loads its engine dependencies from CDNs.

[Open Command & Catalyst](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command-and-Catalyst-SOURCE-gpt-6.1-terra-max-20261029-0859.html>) · [Editable source and rebuild instructions](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v8__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Command-and-Catalyst-SOURCE-gpt-6.1-terra-max-20261029-0859/README.md>)

The demo includes harvesting, base construction and power, unit production, attack-move orders, enemy raids, defenses, an ion-lance ability, and an attract replay. Standalone online play supports two-player co-op; [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) sessions use side-by-side scoring for one to four players. WebGPU and an internet connection for the CDN dependencies are required.

### Source information

- **Date and source:** 2026-10-29 08:59; Command & Conquer.
- **Tech:** Three.js r180 WebGPU renderer with no renderer fallback, Rapier 3D 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, and AI Hub Session Protocol client 1.3.0.
- **Art, animation, and audio:** Original cel-shaded low-poly art; procedural transforms, construction, projectiles and particles; synthesized music, effects and gibberish radio voices.
- **Testing and environment:** Lightweight headless tests in Chrome 154 on Linux/Xvfb with software Vulkan and an emulated controller. Recipient browser unknown. Codex CLI, headless Linux.
- **Model and usage:** OpenAI gpt-6.1-terra, reasoning effort max. API cost and token count unknown; session time approximately 25 minutes.

### Testing feedback

Testing caught **four issues**, including **one critical keyboard-only issue** that prevented confirming construction and ability targets. All four were fixed.

The most helpful test was an accelerated gameplay run covering the economy, production, combat and victory. Syntax checking alone was the least helpful for finding interaction problems. The AI Hub harness passed for one through four players, and two browser peers connected through PeerJS and synchronized a build order. Physical controllers and separate-network devices were not tested.

### Engine feedback

Three.js made procedural battlefield construction straightforward. The hardest integration work was combining WebGPU initialization, physics, controller-first orders and multiplayer state. The most important systems built for the demo were the RTS economy, orders, enemy behavior and synchronization.

A blank headless screenshot initially looked like a scene failure; an isolated test traced it to the browser’s WebGPU compositor configuration. A documented WebGPU-only renderer option would make disabling Three.js’s automatic fallback clearer.

### Prompt feedback

The controller-first direction and vertical-slice goal were useful constraints. The breadth of “feature-complete” and the relationship between standalone and AI Hub multiplayer needed interpretation. The hardest part was fitting the RTS and both multiplayer modes into one HTML deliverable. The next useful test would be a long session with two physical controllers on devices across different networks.