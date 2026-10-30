Created [The Throne of Tangles](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The Throne of Tangles-Lands of Lore The Throne of Chaos-gpt-6.1-terra-xhigh-20261029-0934.html>), a first-person fantasy adventure with exploration, combat, a three-sigil puzzle, a boss, saves, controller support, attract mode, and side-by-side multiplayer. It requires WebGPU and an internet connection for its CDN dependencies; shared links require HTTPS or localhost.

**The demo is not fully verified:** headless Chrome initialized WebGPU but did not produce a reliable visible 3D frame, and one configuration lost its graphics device. The gameplay, controller, and session tests passed with rendering disabled. A visual playthrough on a WebGPU-capable device remains necessary.

The source information and feedback are also in the HTML comment and the in-game About screen.

**Source information**

- Date: 2026-10-29 09:34. Source: *Lands of Lore: The Throne of Chaos*.
- Tech: Three.js r180 WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub Session Protocol 1.3.0, and PeerJS 1.5.5.
- Art and animation: procedural cel-shaded fantasy geometry with procedural transforms, particles, and camera motion.
- Audio: code-generated music, effects, and gibberish voices.
- Online: AI Hub parallel sessions and an optional standalone shared-link parallel race. A two-browser PeerJS connection was established; score synchronization was not verified.
- Testing: lightweight checks; no FPS target. Environment: Codex CLI, headless Linux; browser specified as unknown. Tests used headless Chrome.
- Model: OpenAI gpt-6.1-terra, reasoning effort xhigh. Estimated cost and token usage: unknown. Session time: approximately 22 minutes.

**Testing feedback:** Five issues were caught; two were potentially game-breaking. Four were fixed, while the headless WebGPU device loss remains unresolved. The scripted quest and hub-session checks were most helpful; the screenshot taken after device loss was least helpful.

**Engine feedback:** Three.js’s scene graph made world construction approachable. I initially misjudged headless WebGPU availability. The exploration, combat, quest, interface, and save systems had to be built for the game; validating graphics without a reliable WebGPU device was hardest. Device-loss handling and adapter and shader diagnostics would benefit from an overhaul.

**Prompt feedback:** The controller-first direction was especially useful. The intended depth of standalone multiplayer was unclear. Combining an adventure with networking was the hardest part. The most valuable additional test would be a full visual and physical-controller multiplayer playthrough.