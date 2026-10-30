Built [**Lands of Fable: The Throne of Ferns**](./Lands-of-Fable-The-Throne-of-Ferns-Lands-of-Lore-The-Throne-of-Chaos-gpt-6.1-sol-xhigh-20261029-0832.html).

Includes the complete adventure, saves, attract mode, standalone couch cooperation, and AI Hub multiplayer. Serve through localhost or HTTPS; WebGPU and internet access are required.

**Source information**

- **Date:** 2026-10-29 08:32, America/Vancouver.
- **Source:** Lands of Lore: The Throne of Chaos.
- **Tech:** Three.js R180, strict WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript.
- **Art:** Procedural cel-shaded storybook ruins.
- **Animation:** Articulated procedural rigs, combat tweens, foliage and particles.
- **Audio:** Code-composed music, synthesized effects and gibberish voices.
- **Multiplayer:** 1–4-player parallel AI Hub expeditions; standalone 1–3-controller couch party.
- **Environment:** Codex CLI, headless Linux/WSL2; Chrome 154.0.8037.57.
- **Model:** OpenAI gpt-6.1-sol, xhigh.
- **Usage:** Cost and tokens unknown; approximately 52 minutes.

**Testing feedback:** 43 gameplay/input checks and three official hub scenarios passed. Testing caught four issues, two critical; all fixed. Most helpful: complete quest checks and the full-render hub test. Least helpful: direct canvas screenshots affected by the Linux compositor; visuals were verified through GPU readback. Physical-controller testing remains unverified.

**Engine feedback:** The scene graph, toon materials and Rapier contacts worked well. GPU presentation and readback required investigation. Party combat, quests, saves and controller navigation were the main custom systems. GPU lifecycle and submission backpressure were hardest. I would overhaul implicit backend fallback and add a documented strict-WebGPU option.

**Prompt feedback:** The source, controller focus and procedural audio requirements gave clear direction. Multiplayer form and demo length were open to interpretation. Making every RPG system coherent in one file was hardest. The next test would be a physical DualSense/TV playthrough and cross-device hub session.

These notes are also included in the in-game About screen and opening HTML comment.