Created **[Turogue II: Seeds of Ruin](./Turogue-II-Seeds-of-Ruin-Turok-2-Seeds-of-Evil-gpt-6.1-sol-max-20261029-0214.html)** — a single HTML demo with four weapons, exploration, rescues, secrets, checkpoints, a boss, controller menus, attract mode, and co-op.

Requires WebGPU and internet access for CDN dependencies. Serve over HTTPS or localhost.

**Source Information:** Date: 2026-10-29 03:00, America/Vancouver. Source: *Turok 2: Seeds of Evil*. Title selected randomly from 50 candidates.

- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.3.0, PeerJS 1.5.5.
- **Art:** Procedural cel shading, faceted geometry, ink outlines and emissive runes.
- **Animation:** Procedural articulated rigs, combat poses, recoil and particles.
- **Audio:** Code-written adaptive music, synthesized effects and gibberish voices with subtitles.
- **Online:** 1–4 player co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), plus standalone room codes.
- **Environment:** Codex CLI, headless Linux; tested in Chrome 154. Player browser unknown.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** API cost in USD and token totals/breakdown unknown. Approximately 45 minutes to packaging.

**Testing Feedback:** Lightweight checks passed: 33 campaign/controller checks, hub scenarios with 2–4 players, server hosting, departures, sustained fire, and a real two-page PeerJS session. Simulated conditions included 150 ms latency, 50 ms jitter and 5% packet loss. Testing and review caught **12 issues, including 2 considered game-breaking**; all were fixed. The controller campaign progression test was most helpful. Syntax-only checking was least helpful. Physical controller and audio hardware testing was not performed.

**Engine Feedback:** I liked Three.js’s procedural scene graph and Rapier’s character controller most. Incorrect assumptions involved toon-material properties and automatic WebGL fallback. The most important custom work was the FPS gameplay, persistence and co-op layer. Coordinating WebGPU, WASM physics and network readiness was hardest. I would overhaul implicit renderer fallback and add an official controller/game-state framework.

**Prompt Feedback:** The creative reference, procedural audio requirement and controller-first direction were useful. “All features” was ambiguous for an original successor, so the demo defines a complete expedition with accessible mechanics. Combining coherent art, pacing and multiplayer in one file was hardest. One additional test would be a complete expedition across four physical machines with DualSense controllers and real WAN loss.

These records are also included in About and the opening HTML comment.