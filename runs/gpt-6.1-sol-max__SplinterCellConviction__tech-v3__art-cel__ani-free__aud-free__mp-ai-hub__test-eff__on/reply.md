Built **[Splinter Cell: Defection](</home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__SplinterCellConviction__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Splinter-Cell-Defection-SplinterCellConviction-gpt-6.1-sol-max-20261029-1411.html>)** — a single 483 KB HTML file. Serve through localhost or HTTPS; CDN access and WebGPU are required.

Includes stealth, cover, vaulting, takedowns, mark-and-execute, gadgets, checkpoints, looping attract mode, and co-op.

**Source Information**

- **Date:** 2026-10-29 14:51, America/Vancouver.
- **Source:** Splinter Cell: Conviction.
- **Tech:** Three.js r180, WebGPU only; Rapier 0.19.3; Gamepad API; JavaScript/HTML/CSS.
- **Art:** Cel-shaded industrial noir.
- **Animation:** Procedural articulated characters, vault arcs, cinematic framing, physics-driven knockdowns.
- **Audio:** Original synthesized music and effects; radio captions; no recorded voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), protocol v1/client 1.3.0; 1–4 player co-op. Production deployment: unknown.
- **Testing:** Lightweight Playwright 1.63 checks, emulated DualSense, Chromium WebGPU, WebKit UI, phone/tablet/desktop/ultrawide layouts. Network simulation: 150 ms latency, 50 ms jitter, 5% loss. No performance audit.
- **Environment:** Codex CLI, headless Linux; delivery browser unknown.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort max.
- **Usage:** 168.778K goal-tracked tokens; approximately 39 minutes. API cost and billing breakdown: unknown.

**Testing Feedback.** Testing and review found eight defects, including two critical defects; all were fixed. **37 gameplay assertions and 73 hub conformance checks passed.** The four-player network harness was most helpful. The initial software-GPU smoke run was least helpful because its GPU configuration lost the device. Real Safari gameplay and physical DualSense hardware remain unverified.

**Engine Feedback.** Three.js’s procedural scene tools and Rapier’s collision handling worked well. Strict WebGPU required disabling Three.js’s implicit fallback. I built the stealth simulation, navigation, mission systems, and co-op replication. Coordinating camera, collision, perception, and networking was hardest. I would overhaul implicit fallback behavior and add an official third-person character/camera toolkit.

**Prompt Feedback.** The explicit stack, packaging, and controller requirements gave clear direction. “All features” left the demo boundary ambiguous. The hardest task was making the systems work coherently inside one portable file. The additional test I’d choose is four physical DualSense controllers across mixed WebGPU devices.

These records are also included in the game’s credits and top HTML comment.