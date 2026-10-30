Built [**Final Shoulder**](./Final-Shoulder-Final-Soldier-gpt-6-astra-xhigh-20261029-1117.html): a single HTML release with three combat regions, twelve weapon patterns, armored bosses, caravan modes, attract play, and multiplayer.

Run over HTTPS or localhost with WebGPU enabled. CDN dependencies require internet access.

**Source Information**

- **Date:** 2026-10-29 11:52 PDT.
- **Source:** [Final Soldier](https://shmups.wiki/library/Final_Soldier).
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art / animation:** Procedural cel-shaded models, ink outlines, articulated animation, particles, physical wreckage.
- **Audio:** Code-written music, synthesized effects and gibberish radio voices.
- **Online:** Standalone two-player WebRTC duels; [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) 1–4 player score rounds; local co-op.
- **Environment:** Codex CLI (headless), Linux; deployment browser unknown. Tested using Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6-astra, reasoning effort xhigh.
- **Usage:** Cost and tokens unknown; approximately 35 minutes.

**Testing Feedback:** Lightweight checks passed: 17 verification groups and all 24 hub checks. Two issues caught and fixed, including one rendering blocker in the test environment. Most helpful: controller navigation and hub conformance. Least helpful: syntax-only checking. Physical controllers and cross-device internet play remain unverified.

**Engine Feedback:** Toon materials and the scene graph worked well. The implicit WebGL fallback required correction. I built the encounter, weapon, input, menu, and multiplayer systems. Coordinating physics with round clocks was hardest. I would replace implicit fallback with an explicit strict-WebGPU option.

**Prompt Feedback:** The source, controller requirements, and packaging constraints were useful. Multiplayer scope and “unlimited performance” needed interpretation. Completing the entire gameplay and supporting systems was hardest. The additional test I’d choose: four physical DualSense controllers across separate networked devices.

These reports are also embedded in About/Credits and the HTML’s opening comment.