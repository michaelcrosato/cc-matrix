Built **Turoar: Seeds of the First Sun**.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Turoar-Seeds-of-the-First-Sun-Turok-2-Seeds-of-Evil-gpt-6-astra-ultra-20261029-1005.html)

Includes the complete campaign chapter, three weapons, boss encounter, checkpoints, controller menus, automatic attract mode, and four-player co-op. Requires WebGPU and internet access for CDN dependencies. No WebGL fallback.

**Source Information:** Date: **2026-10-29 10:05**, America/Vancouver. Inspiration: **Turok 2: Seeds of Evil**. Title selected randomly from 50 candidates.

- **Tech:** Three.js r180, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Session Protocol v1.
- **Art and animation:** Procedural cel-shaded geometry, ink outlines, articulated creatures, animated weapons, physics and particles.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** 1–4-player authoritative co-op through AI Hub or standalone WebRTC rooms.
- **Environment:** Codex CLI, headless Linux. Player browser unknown; verified with Chrome 154.0.8037.57.
- **Model and usage:** OpenAI gpt-6-astra, ultra reasoning. **560.5K tracked tokens**, approximately **39 minutes**. Token breakdown and API cost in USD unknown.

**Testing Feedback:** **158 checks passed**: 33 solo/controller, 121 official hub, and four live WebRTC checks. Testing used real WebGPU captures, synthetic controllers, bounded progression hooks, and simulated network impairment; no FPS target. Repeated rendering was suppressed during logic checks.

Testing exposed two environment issues. Independent review found ten corrected issues, including four blockers affecting co-op/controller flows. No remaining critical failures appeared in tested paths. The most helpful test completed objectives through boss victory; the least helpful was the initial render-heavy run stalled by software-GPU scheduling. Physical PS5 controllers and four devices on separate networks remain unverified.

**Engine Feedback:** Geometry and material composition worked especially well. Friction came from automatic backend fallback and synchronizing physics with network state. The main custom system was the campaign state machine; its hardest part was maintaining consistent host/client behavior. I would overhaul implicit backend fallback and add an official Rapier-plus-multiplayer example.

**Prompt Feedback:** The controller-first priorities and explicit attract/multiplayer requirements were useful. “Complete engine” versus “vertical slice” left the authoring scope ambiguous; this delivers reusable modules and encounter data, without an external editor. The hardest task was combining campaign polish with four-player authority. My next test would be a full campaign on four separate networks using physical PS5 controllers.

All required information and feedback are also embedded in the **six-page About screen** and the **HTML’s opening comment**.