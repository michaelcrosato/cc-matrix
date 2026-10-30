[**Download Avowflame**](./Avowflame-Avowed-gpt-6-astra-ultra-20261029-0952.html) — a self-contained 2.99 MiB game. Requires WebGPU; supports controller and keyboard/mouse.

Includes elemental combat, companion abilities, exploration, crafting, progression, a two-phase boss, three endings, saving, attract mode, and AI Hub parallel multiplayer expeditions.

**Source Information:** Date: 2026-10-29 10:22 America/Vancouver. Inspiration: [Avowed](https://avowed.obsidian.net/). Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, esbuild 0.28.2. Cel-shaded procedural art; articulated procedural animation; original Web Audio music and effects; no voice recordings. Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), session client 1.3.0. Environment: Codex CLI headless, Linux; player browser unknown. Model: OpenAI gpt-6-astra, ultra reasoning. Cost/tokens: unknown; session approximately 30 minutes.

**Testing Feedback:** 14 issues found and fixed, including one critical Hub configuration issue. Passed 28 gameplay assertions, 72 Hub checks, and 48 responsive UI checks. Most helpful: complete quest testing and the multiplayer harness. Least helpful: syntax checks alone. Chromium/WebGPU imagery and WebKit layouts were inspected. Functional checks isolated rendering after initialization to avoid software-GPU timing interference. Physical DualSense and real iOS Safari remain untested.

**Engine Feedback:** Three.js procedural scene construction and Rapier collision handling worked well. My initial assumption about Hub room networking was wrong. The largest custom component was the gameplay/state layer; coordinating physics, menus, and session clocks was hardest. I would overhaul automatic renderer fallback and add a clear strict-WebGPU option.

**Prompt Feedback:** The controller-first direction and explicit attract requirement were especially useful. “Feature-complete” lacked a fixed boundary. The hardest part was delivering a coherent, finished journey in one file. The most valuable additional test would be two people playing through AI Hub with physical DualSense controllers.

All required information and feedback also appear in About/Credits and the opening HTML comment.