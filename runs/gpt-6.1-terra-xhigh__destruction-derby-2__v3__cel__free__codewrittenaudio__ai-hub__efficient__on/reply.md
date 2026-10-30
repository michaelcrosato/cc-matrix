Built [Destruction Darby](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v13__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Destruction Darby-SOURCE-gpt-6.1-terra-xhigh-20261029-0932.html>), with the development files in the matching subfolder. It includes a two-minute wrecking bowl, AI rivals, damage and combo scoring, repairs, boost, controller and keyboard controls, settings, and a looping attract demo.

**The demo is not fully verified.** Chrome initialized WebGPU and the simulation entered play, but its headless GPU compositor produced a blank screenshot. A visual playtest, physical-controller test, and AI Hub harness run remain outstanding. Standalone multiplayer is a same-browser score comparison between tabs; AI Hub uses parallel score sessions.

**Source information**

- Date: 2026-10-29 09:32. Source: *Destruction Derby 2*.
- Tech: Three.js r180 WebGPU, Rapier 0.19.3, JavaScript, Web Audio, Gamepad API, and AI Hub Session Protocol 1.3.0.
- Art and animation: stylized cel-shaded low-poly models, procedural transforms, and Rapier physics.
- Audio: code-written music, engine and impact effects, and gibberish announcer sounds.
- Online: [AI Hub parallel sessions](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub); standalone same-origin BroadcastChannel score comparison.
- Testing: lightweight syntax and headless Chrome 154 startup, menu, and simulation checks.
- Environment: Codex CLI headless on Linux; player browser unknown.
- Model: OpenAI gpt-6.1-terra, reasoning effort xhigh. Estimated session time: about 9 minutes. Token counts and API cost: unknown.

**Testing feedback:** Testing caught one issue, which was game-breaking: a Rapier startup API mismatch. It was fixed. The most helpful test was the headless browser runtime check; the least helpful was the syntax check, which could not detect the API mismatch.

**Engine feedback:** Three.js scene composition and Rapier’s rigid-body contacts were the strongest parts. WebGPU availability and the headless compositor were the main uncertainties. Arcade vehicle handling and damage scoring needed to be built from scratch. Integrating rendering, physics, and session timing was the hardest part. I would overhaul the renderer’s implicit WebGL fallback for WebGPU-only builds and improve its capability diagnostics.

**Prompt feedback:** The controller-first design and attract-mode requirements were particularly useful. The standalone multiplayer transport was unspecified. The hardest part was combining a derby slice and multiplayer in one HTML file. The most valuable additional test would be a multi-device WebGPU and controller playtest.