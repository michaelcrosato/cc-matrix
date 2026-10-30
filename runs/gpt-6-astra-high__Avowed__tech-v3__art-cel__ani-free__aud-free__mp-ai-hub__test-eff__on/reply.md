Built **[Avow the Wild](./Avow-the-Wild-Avowed-gpt-6-astra-high-20261029-1024.html)** — a single-file adventure with elemental combat, companions, crafting, exploration, three endings, saves, controller menus, and attract mode.

Requires WebGPU and internet access for CDN dependencies. Serve through HTTPS or localhost.

**Source Information**

- **Date:** 2026-10-29 10:53. **Source:** Avowed.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio.
- **Art / animation:** Procedural cel shading, articulated characters, combat animations, particles.
- **Audio:** Original synthesized music and effects; text dialogue, no recorded voices.
- **Online:** AI Hub 1.3.0; 1–4-player parallel expeditions.
- **Environment:** Codex CLI, headless Linux; authoring browser unknown.
- **Model:** OpenAI gpt-6-astra, high reasoning.
- **Usage:** Approximately 28 minutes; API cost and token counts unknown.

**Testing Feedback:** 35 gameplay assertions and 72 AI Hub checks passed. Five issues were found and fixed; one input issue was treated as critical. Most helpful: controller-enabled Hub conformance. Least helpful: standalone syntax checking. Phone, tablet, and ultrawide layouts were inspected. WebKit testing covered compatibility UI and settings because its installed build lacks WebGPU. Physical controllers remain unverified.

**Engine Feedback:** Three.js scene composition and TSL worked well. Its automatic WebGL fallback required explicit disabling. The largest custom system was the adventure state and combat framework; coordinating physics and input was hardest. I would overhaul implicit fallback behavior and add an explicit strict-WebGPU option.

**Prompt Feedback:** The controller philosophy and packaging requirements were useful. “All features” lacked a bounded definition. Integrating exploration, combat, and consequential choices was hardest. The additional test I’d choose is a four-player session with physical DualSense controllers on mixed hardware.

These details also appear in the game’s credits and the HTML’s opening comment.