Built **Alien Bloodstar**.

[Single-file HTML](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Alien-Bloodstar-Alien-Soldier-gpt-6-astra-xhigh-20261029-1126.html) · [Run instructions and source](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Alien-Bloodstar-Alien-Soldier-gpt-6-astra-xhigh-20261029-1126/README.md)

Includes three bosses, four weapons, training, upgrades, checkpoints, local co-op, Hub integration, and looping AI attract mode. Requires WebGPU and internet access for CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 11:26 PDT. **Source:** [Alien Soldier](https://www.sega.jp/genesismini2/assets/manual/pdf/US_Alien-Soldier.pdf).
- **Tech:** Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript.
- **Art / animation:** procedural cel-shaded geometry, ink outlines, articulated rigs and particles.
- **Audio:** synthesized music, effects and gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) protocol 1/client 1.3.0; 1–4-player parallel score attack. Standalone: two-player local co-op.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154.0.8037.57. User browser unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** API cost and token totals unknown; approximately 50 minutes.

**Testing Feedback:** Lightweight verification passed **35 gameplay checks and 72 Hub checks**. Testing and review resolved nine findings, including two potentially game-breaking issues. The integrated gameplay simulation was most helpful; initial headless screenshots were least helpful because GPU surfaces appeared black. Xvfb resolved capture. Physical controllers and human co-op remain unverified.

**Engine Feedback:** Three.js’s scene graph and Rapier’s contacts worked well. Automatic renderer fallback and headless capture behavior required investigation. The main custom system was the combat/encounter director; coordinating physics, input and rendering was hardest. I would overhaul implicit fallback and add unified GPU initialization diagnostics.

**Prompt Feedback:** The controller and delivery requirements were especially clear. Standalone multiplayer’s mode was ambiguous, so I chose local co-op. Integrating the complete combat, boss and multiplayer systems was hardest. The additional test I’d prioritize is a two-person DualSense playthrough.

These records are also included in **About/Credits** and the HTML’s opening comment.