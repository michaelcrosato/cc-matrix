Created **[Bard’s Late — single HTML](./Bards-Late-Baldurs-Gate-gpt-6-astra-max-20261029-0940.html)** (185 KiB): three companions, tactical combat, branching dialogue, equipment, saves, three endings, attract mode, and multiplayer.

Serve over **HTTPS or localhost**. WebGPU and internet access for CDN dependencies are required.

**Source Information**

- **Date:** 2026-10-29 10:48 PDT. **Inspiration:** Baldur’s Gate.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, ai-hub client 1.3.0.
- **Art:** Procedural cel-shaded world and original vector portraits.
- **Animation:** Procedural character rigs, attacks, wind, water, and particles.
- **Audio:** Synthesized music, effects, and gibberish voices.
- **Online:** 1–4-player parallel expeditions through ai-hub or standalone WebRTC rooms.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154 under Xvfb. Player’s browser unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 67 minutes. API cost and token usage unknown.

**Testing Feedback**

118 targeted assertions passed. Review/testing found **seven issues, including one controller-blocking issue; all fixed**. The gamepad-enabled ai-hub harness was most helpful; syntax-only checks were least helpful. Testing stayed lightweight, without performance benchmarking. Physical DualSense/TV, cross-NAT, and human balance testing remain unrun.

**Engine Feedback**

Scene composition and toon materials worked well. I incorrectly assumed `MeshToonNodeMaterial` supported `flatShading`. The main custom work was the RPG state, action economy, and controller UI. Separating simulation, rendering, and multiplayer clocks was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU option with clearer diagnostics.

**Prompt Feedback**

The controller-first, attract-mode, and single-file requirements were especially useful. “Feature-complete spiritual successor” left the overall breadth ambiguous. Combining meaningful RPG systems with both multiplayer contexts was hardest. The next test would be a physical DualSense living-room playthrough with another player on a separate network.

These details are also embedded in **About/Credits** and the HTML header comment.