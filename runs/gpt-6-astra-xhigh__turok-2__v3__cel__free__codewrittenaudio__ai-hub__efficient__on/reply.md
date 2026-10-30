Built **[Tu-Ruin: Seeds of Trouble](\/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Tu-Ruin-Seeds-of-Trouble-Turok-2-Seeds-of-Evil-gpt-6-astra-xhigh-20261029-1106.html)** — one 3.38 MiB HTML file with embedded dependencies. Solo play was verified offline. Requires WebGPU and a controller or keyboard.

Includes four weapons, rescues, seals, swimming, secrets, checkpoints, a three-phase boss, attract mode, and 1–4-player co-op.

**Source Information:** Date: 2026-10-29 11:46. Inspiration: *Turok 2: Seeds of Evil*. The title was randomly selected from 50 candidates.

- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0 / Protocol v1, esbuild 0.25.12.
- **Art:** Procedural cel shading, ink outlines, jade ruins, coral accents, bone silhouettes.
- **Animation:** Procedural creature rigs, weapon motion, particles, vegetation, and interpolated remote players.
- **Audio:** Code-written adaptive music, synthesized effects, and gibberish voices.
- **Online:** Host-authoritative co-op through AI Hub or standalone PeerJS rooms.
- **Environment:** Codex CLI, headless Linux. Player browser: unknown. Tested with Chrome 154 and Playwright 1.56.1.
- **Model:** OpenAI, gpt-6-astra, reasoning effort xhigh.
- **Usage:** API cost and token count unknown; session approximately 40 minutes.

**Testing Feedback:** All 30 gameplay checks and 49 hub checks passed. Two-browser standalone co-op passed connection, synchronization, and disconnect checks. Testing used software WebGPU; hub simulation used 60 ms latency, 20 ms jitter, and 2% loss. Physical DualSense and cross-network NAT traversal remain unverified.

Testing caught four implementation/setup issues, all addressed. One was gameplay-breaking: rendering throttles stalled multiplayer simulation. The hub harness was the most helpful test. The grenade finite-position assertion was least informative because it checked stability rather than balance.

**Engine Feedback:** Three.js scene graphs, TSL, and Rapier’s character controller worked particularly well. I initially encountered blank frames from the test GPU configuration and had to separate multiplayer simulation from rendering. The largest custom system was shared combat, objectives, saves, and networking. Coordinating responsive movement with shared authority was hardest. I would make renderer fallback explicitly opt-in and add an integrated character/controller/simulation starter.

**Prompt Feedback:** The strongest parts were the source inspiration and controller-first requirements. “Feature-complete demo / game engine” left the intended feature inventory and duration ambiguous. Combining exploration, combat, and two multiplayer transports into one file was hardest. The most valuable additional test would be a four-person playthrough using physical DualSense controllers across separate networks.

These details are also included in the in-game Credits and the HTML’s opening comment.