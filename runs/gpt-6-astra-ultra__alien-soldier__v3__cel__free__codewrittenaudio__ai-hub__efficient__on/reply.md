Built **Alien Wonder**: three bosses, gravity reversal, weapon switching, counters, Wonder Rush, co-op, and automatic attract mode.

[Open the single HTML deliverable](./Alien-Wonder-Alien-Soldier-gpt-6-astra-ultra-20261029-1056.html). Serve through **localhost or HTTPS**; WebGPU and CDN access are required.

**Source Information:** Date: 2026-10-29 10:56, America/Vancouver. Source: Alien Soldier. Model: OpenAI gpt-6-astra, reasoning effort ultra.

- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API.
- **Art/animation:** Procedural cel-shaded geometry, ink outlines, articulated animation and particles.
- **Audio:** Original synthesized music, effects and gibberish voices.
- **Online:** AI Hub co-op, standalone PeerJS 1.5.5/WebRTC rooms, and local two-player co-op.
- **Environment:** Codex CLI, headless Linux; verified using Chrome 154 through Xvfb.
- **Usage:** Cost and token totals unknown; approximately 25 minutes.

**Testing Feedback:** Testing and review caught **12 issues**, including **one game-breaking boss-defeat crash**; all were fixed. The complete campaign passed, alongside **121/121 hub checks** and **5/5 standalone networking checks**, with no final browser errors. The hub harness was most helpful; syntax checks were least helpful. Physical-controller feel, human balance and audible mix remain unverified.

**Engine Feedback:** Geometry composition and TSL were the strongest parts. Mirrored outline winding and [automatic renderer fallback](https://threejs.org/docs/pages/WebGPURenderer.html) needed correction. The most important custom system was the combat simulation with client prediction. WebGPU rendering verification was hardest. I would overhaul implicit fallback and add a documented strict-WebGPU option.

**Prompt Feedback:** The combat reference and controller-first requirements gave clear direction. “Unlimited performance” was the ambiguous constraint. Combining polished combat, three encounters and co-op was hardest. The additional test I’d choose is a complete four-person session using physical DualSense controllers over real internet connections.

All requested information is also included in the in-game credits and opening HTML comment.