[Open Waku Waku Jubilee](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v11__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Waku-Waku-Jubilee-Waku-Waku-7-gpt-6.1-terra-max-20261029-0902.html>)

The demo includes an arcade story, practice, local versus, standalone online rooms, AI Hub sessions, and an attract mode. It requires a WebGPU-capable browser and an internet connection to load its dependencies and use online rooms. The in-game **How to Play** screen lists controller and keyboard controls.

**Testing feedback:** Four issues were caught and fixed; none was game-breaking. The most helpful test was the practice-mode combat and input check. The least helpful was the first headless GPU configuration, which exposed a test-environment adapter problem. The Hub harness passed four-player latency and packet-loss checks, host departure, and a separate server-hosted session. A two-browser PeerJS room exchanged movement and an attack. A physical DualSense and players on separate networks were not tested.

**Source information:**

- **Date and source:** 2026-10-29 09:02; *Waku Waku 7*.
- **Tech:** Three.js r180 with WebGPU, Rapier 3D 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, and the [AI Hub session protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Art and animation:** Original procedural cel-shaded 3D, articulated poses, and particles.
- **Audio:** Code-synthesized music, effects, and gibberish voices.
- **Testing and environment:** Lightweight headless checks on Linux using Chrome 154; target browser unknown. Codex CLI, OpenAI gpt-6.1-terra, reasoning effort max.
- **Usage:** API cost and token count unknown; session time approximately 19 minutes.

**Engine feedback:** Three.js’s scene graph and toon materials were the strongest parts. The initial headless GPU setup failed, and the Vulkan software adapter worked. The fighting rules, rigs, effects, interface, and networking had to be built for the game; synchronizing the fight was the hardest part. I would overhaul the renderer’s [automatic fallback behavior](https://threejs.org/manual/pages/webgpurenderer) for explicit WebGPU-only use and improve adapter and device-loss diagnostics.

**Prompt feedback:** The playful source and controller-first brief were the best parts. Mapping a traditionally two-player fighter to four Hub seats required interpretation. The hardest part was completing the arcade slice and networking in one file. The most valuable additional test would be a real DualSense match between players on separate networks.