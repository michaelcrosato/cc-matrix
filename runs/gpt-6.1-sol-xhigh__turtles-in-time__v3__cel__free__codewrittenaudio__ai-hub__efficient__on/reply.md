Created [**Turtles Behind Schedule — single HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Turtles-Behind-Schedule-Turtles-in-Time-gpt-6.1-sol-xhigh-20261029-0832.html).

Includes four heroes, three eras, nine encounters, three bosses, combos, parries, screen throws, chrono bursts, couch/online co-op, and automatic attract mode. Requires WebGPU and internet access for CDN dependencies; serve over HTTPS or localhost.

**Source Information**

- **Date:** 2026-10-29 09:14 America/Vancouver.
- **Source:** Turtles in Time. Title randomly selected from 50 candidates.
- **Tech:** Three.js R180 / 0.180.0, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art Direction:** Original procedural cel-shaded 3D with ink outlines and comic typography.
- **Animation:** Hierarchical procedural rigs, blended poses, anticipation, jumping, knockback and hitstop.
- **Audio:** Code-written synth music, effects and Animalese-like gibberish.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op and standalone WebRTC rooms; up to four players.
- **Testing:** Efficient functional checks using Playwright and the official hub harness.
- **Environment:** Codex CLI, headless Linux; end-user browser unknown. Verified using Chrome 154 under Xvfb.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** API cost unknown; tokens unknown; session approximately 42 minutes.

**Testing Feedback**

Six game/input/integration issues were fixed; three were critical: startup, boss rendering and hub results. Four-player sessions, playerless hosting, host departure, standalone networking, campaign completion and controller checks passed.

Most helpful: the official hub harness with latency, jitter and packet loss. Least helpful: syntax-only checking, which missed the Rapier runtime mismatch. Physical controllers, audio listening and cross-network NAT behavior remain unverified.

**Engine Feedback**

I liked Three.js’s scene graph and toon materials most. I initially used the wrong Rapier descriptor method and needed to resolve Linux WebGPU presentation settings. The main custom systems were combat, encounter direction and replication. Coordinating physics, combat timing and local network prediction was hardest. I would overhaul implicit WebGL fallback and add an explicit public WebGPU-only option.

**Prompt Feedback**

The controller-first requirements and concrete deliverable were especially useful. Usage accounting was unclear because billing and token telemetry are unavailable. Integrating the complete combat, content and multiplayer slice was hardest. My additional test would be four human players using real PS5 controllers across different home networks.

The same information is embedded in the credits and top-of-file comment.