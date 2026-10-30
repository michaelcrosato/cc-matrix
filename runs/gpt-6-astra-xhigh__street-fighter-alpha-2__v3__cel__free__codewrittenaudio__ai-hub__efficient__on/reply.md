[**Download Street Heat Encore**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v18__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Street-Heat-Encore-Street-Fighter-Alpha-2-gpt-6-astra-xhigh-20261029-1124.html)

Single HTML, 161 KB. Includes four fighters, two stages, arcade stories, twelve training lessons, couch versus, online rooms, ai-hub multiplayer, and attract mode. Serve through localhost or HTTPS; WebGPU and CDN access are required.

**Source information:** Date: 2026-10-29 12:00 PDT. Inspiration: *Street Fighter Alpha 2*.

- **Tech:** Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio; PeerJS 1.5.5; ai-hub Protocol v1; JavaScript/HTML/CSS; esbuild 0.25.11.
- **Art and animation:** Original cel-shaded procedural geometry, vector portraits, articulated rigs, attack poses, and effects.
- **Audio:** Code-written synth music, effects, and gibberish voices.
- **Online:** Two-player WebRTC rooms and ai-hub team matches supporting 1–4 players.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154.0.8037.57 with SwiftShader and Xvfb. End-user browser: unknown.
- **Model/usage:** OpenAI gpt-6-astra, xhigh. Approximately 35 minutes; API cost and token usage unknown.

**Testing feedback:** Passed 14 combat checks, 2 network regressions, 16 browser/controller checks, 4 WebRTC checks, and 73 hub checks. Hub tests used 150 ms latency, 50 ms jitter, and 5% loss. Three findings were resolved: simulation scheduling, delayed network attacks, and browser-capture configuration; one was game-breaking. The hub harness was most helpful; initial headless screenshots were least helpful. Physical DualSense, geographically separated WAN play, and subjective audio listening remain unverified. No performance benchmarks were targeted.

**Engine feedback:** Toon materials and the scene graph worked well. I got stuck on GPU capture and implicit renderer fallback. The main custom system was frame-based combat; independent simulation and network reconciliation were hardest. I would overhaul backend selection and add a public WebGPU-only initialization option. [Renderer documentation](https://threejs.org/docs/pages/WebGPURenderer.html)

**Prompt feedback:** The controller, art, and audio constraints gave clear direction. Traditional 1v1 combat versus four hub seats needed interpretation; team matches resolved it. Combining complete combat, teaching, and networking was hardest. The additional test I’d choose is two physical DualSense controllers playing across a real WAN.

These disclosures are also embedded in About/Credits and the HTML’s opening comment.