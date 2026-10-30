Built **Street Rhythm Alpha Two**.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Street-Rhythm-Alpha-Two-Street-Fighter-Alpha-2-gpt-6-astra-ultra-20261029-1053.html)

Includes three fighters, arcade progression, eight practice lessons, local/online versus, and automatic attract mode. Serve over HTTPS or localhost; internet access loads CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 11:23 PDT. **Source:** Street Fighter Alpha 2.
- **Tech:** Three.js R180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art/animation:** Procedural cel-shaded geometry, ink outlines, articulated animation, hit-stop, and comic effects.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** Standalone two-player rooms; AI Hub Protocol v1 parallel competition for 1–4 players.
- **Environment:** Codex CLI, headless Linux. Deployment browser unknown; tested Chrome 154 with Playwright.
- **Model:** OpenAI gpt-6-astra, ultra reasoning. **Usage:** Approximately 30 minutes; cost and token totals unknown.

**Testing Feedback:** Efficient checks passed: 19 combat tests, 11 acceptance checks, eight online lifecycle checks, audio checks, and hub scenarios. Found and corrected **13 issues, including one critical online results-sync defect**. Most helpful: real online lifecycle tests and the hub harness. Least helpful: syntax-only checks. Physical DualSense hardware and distant networks remain untested.

**Engine Feedback:** Three’s scene graph and toon materials worked especially well. WebGPU capture and prediction reconciliation caused friction. The main custom system was combat timing, buffering, combos, and AI. Synchronizing animation and online state was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU initialization option with clearer diagnostics.

**Prompt Feedback:** The controller-first requirements, attract mode, and exact packaging were useful. “Feature-complete” and the choice of hub multiplayer mode were broad. Integrating combat, art, audio, and networking was hardest. The most valuable additional test would use physical DualSense controllers across two networks with simulated latency and packet loss.

These details also appear in Credits and the HTML’s opening comment.