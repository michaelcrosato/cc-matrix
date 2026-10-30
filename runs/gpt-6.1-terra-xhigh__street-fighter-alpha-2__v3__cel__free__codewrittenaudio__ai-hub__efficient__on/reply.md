Built [Street Thunder Alpha](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-xhigh__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Street Thunder Alpha-Street Fighter Alpha 2-gpt-6.1-terra-xhigh-20261029-0939.html>) as a single HTML file. It includes arcade, training, local versus, an attract mode, controller settings, and an AI Hub score challenge. WebGPU and an internet connection for the CDN dependencies are required.

The headless Chrome smoke test exercised startup, combat, settings, and attract mode. A simulated hub session connected, started, and returned a result. A physical controller and a multi-device online session were not tested.

**Source information**

- Date: 2026-10-29 09:39. Source: Street Fighter Alpha 2.
- Tech: Three.js r180 WebGPU, Rapier 0.19.3, Web Audio API, Gamepad API, and AI Hub Session Protocol v1 client 1.3.0.
- Art and animation: original cel-shaded 2.5D arena and procedurally posed characters.
- Audio: synthesized music, effects, and gibberish voices.
- Online: AI Hub parallel score challenge for up to four players; standalone local two-player versus.
- Testing: lightweight headless browser and syntax checks. Environment: Codex CLI, headless Linux; browser initially unknown.
- Model: OpenAI gpt-6.1-terra, reasoning effort xhigh. Token usage and API cost: unknown.

**Testing feedback:** Testing caught one critical issue: an empty initial input could corrupt fighter physics. It was fixed and retested. The most helpful test was the WebGPU combat smoke test; the least helpful was the static syntax check.

**Engine feedback:** Three.js made the stage and lighting expressive. WebGPU setup and headless GPU availability were the hardest parts; I initially had to adjust the test renderer configuration. The combat system, AI, animation, and game flow had to be built for the demo. Clearer Rapier initialization and WebGPU diagnostics would improve the development experience.

**Prompt feedback:** The controller-first direction was the most useful part. The standalone online transport was unspecified, so the game uses the hub for online competition and local versus outside it. Combining the fighting loop with session integration was the hardest part. The most valuable further test would be a physical-controller and multi-device network playtest.