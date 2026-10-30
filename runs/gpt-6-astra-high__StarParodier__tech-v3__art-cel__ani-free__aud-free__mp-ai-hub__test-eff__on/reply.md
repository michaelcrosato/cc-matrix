Built [**Star Hootodier — single-file game**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-high__StarParodier__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Star-Hootodier-StarParodier-gpt-6-astra-high-20261029-1030.html).

Includes three pilots, three sectors and bosses, upgradeable weapons, wingmen, bombs, Caravan mode, attract mode, and AI Hub co-op. Requires WebGPU and internet access for CDN dependencies; serve through HTTPS or localhost.

**Source Information**

- Date: 2026-10-29 10:57, America/Vancouver.
- Source: [Star Parodier](https://strategywiki.org/wiki/Star_Parodier). Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, HTML/CSS/JavaScript.
- Art: Original procedural cel-shaded 3D.
- Animation: Fixed-step simulation, procedural animation, network interpolation.
- Audio: Original synthesized music and effects; no voice.
- Online: 1–4-player shared-world co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0.
- Environment: Codex CLI headless; Linux; user browser unknown.
- Model: OpenAI gpt-6-astra, high reasoning effort.
- Usage: Cost and tokens unknown; approximately 25 minutes.

**Testing Feedback**

Efficient functional and visual testing passed **73 multiplayer, 12 simulation, and 10 interaction assertions**. Phone, tablet, desktop, and ultrawide layouts were inspected. WebKit’s compatibility interface passed; its installed build lacks WebGPU.

Five application issues were found and fixed, including one major keyboard-input blocker. Most helpful: complete-campaign simulation and multiplayer conformance. Least helpful: the initial graphics-driver screenshot run, which produced corrupted captures.

**Engine Feedback**

TSL’s cel shading and Rapier’s sensor events worked well. Initial GPU-adapter assumptions and a mesh-scale mistake required correction. The largest custom system was the arcade gameplay and networking layer; separating simulation from local prediction was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU initialization option.

**Prompt Feedback**

The arcade reference, controller focus, and attract-mode requirements gave clear direction. Standalone multiplayer-room expectations were ambiguous; this implementation uses AI Hub hosting. Packaging and verifying the complete co-op game was hardest. The most valuable additional test would be four people on separate devices, including a physical DualSense and WebGPU-capable Safari.

These details are also embedded in the HTML comment and in-game About/Credits.