Built **[Final Wingman](./Final-Wingman-Final-Soldier-gpt-6-astra-max-20261029-0944.html)** — a self-contained 3.7 MB demo with a campaign, eight weapon patterns, two caravan modes, attract mode, local co-op, and online co-op. **WebGPU is required.**

[Build and designer guide](./Final-Wingman-Final-Soldier-gpt-6-astra-max-20261029-0944/README.md)

**Source Information:** 2026-10-29 09:44, Vancouver. Inspired by [Final Soldier](https://shmups.wiki/library/Final_Soldier). The title was randomly selected from 50 candidates.

- **Tech:** Three.js R180, strict WebGPU, Rapier 2D 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0. Canvas presents completed GPU frames; no WebGL fallback.
- **Art:** Original procedural cel-shaded 3D with ink outlines.
- **Animation:** Procedural banking, orbiting pods, articulated bosses, particles, and scrolling environments.
- **Audio:** Code-written music, synthesized effects, and gibberish radio voices.
- **Online:** 1–4-player AI Hub and standalone WebRTC co-op; two-player local co-op.
- **Environment:** Codex CLI, headless Linux/WSL2. User browser unknown; tested with Chrome 154.
- **Model configuration:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** Cost and token totals unknown; session approximately 107 minutes.

**Testing Feedback:** Five issues were caught and fixed, including one game-breaking presentation issue. Campaign, caravan, controls, collision, attract, offline startup, WebRTC, and six hub scenarios passed. Network checks used 150 ms latency, 50 ms jitter, and 5% loss. No FPS benchmark was performed. Live WebGPU screenshots were most helpful; syntax-only checks were least helpful.

**Engine Feedback:** Scene composition and Rapier sensors worked well. I initially assumed default WebGPU presentation would work on the headless driver. The most important custom system was the authoritative shooter simulation. Frame presentation and pixel-row alignment were hardest. I would overhaul implicit backend fallback and add a portable presentation API with explicit row-stride information.

**Prompt Feedback:** The source reference and controller-first rules gave clear direction. “All infrastructure” had an open-ended boundary; the deliverable includes reusable systems, a validated JSON campaign, and a reproducible build. Combining the mechanics, packaging, and two network transports was hardest. The next test would be a full match with physical DualSense controllers across separate home networks.

These reports are also included in About and the opening HTML comment.