Built [**Final Outrider**](./Final-Outrider-Final-Soldier-gpt-6.1-sol-ultra-20261029-0754.html), a complete single-file demo with a three-part sortie, three-phase boss, eight weapon patterns, Caravan modes, attract play, and local/network co-op.

Requires WebGPU and a controller or keyboard. Serve over HTTPS or localhost.

**Source Information:** Also embedded in About/Credits and the opening HTML comment.

- **Date:** 2026-10-29 08:30, America/Vancouver.
- **Source:** [Final Soldier](https://shmups.wiki/library/Final_Soldier). Title randomly selected from 50 candidates using OS entropy.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub Session Protocol v1; esbuild 0.28.2.
- **Art:** Original procedural cel-shaded geometry, quantized lighting, ink outlines.
- **Animation:** Procedural banking, engines, satellites, boss mechanisms, particles and scrolling scenery.
- **Audio:** Original code-composed music, synthesized effects and gibberish radio voices.
- **Online:** AI Hub co-op for 1–4; direct WebRTC and local co-op for two.
- **Testing/environment:** Lightweight physics, browser, simulated-controller and hub checks. Codex CLI headless; Linux; Chrome 154.0.8037.57 under Xvfb.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort ultra.
- **Usage:** Approximately 37 minutes. API cost and token count: unknown.

**Testing Feedback:** Testing/review caught and fixed **17 issues, including 3 critical issues**. Final results: browser smoke **13/13**, physics **9/9**, network tests **3/3**, two-player hub **28/28**, four-player server-hosted hub **29/29**. Actual WebRTC lifecycle tests passed. The most helpful test was rendered browser testing with screenshots; the least helpful was syntax-only checking. Physical-controller behavior, subjective audio quality and restrictive cross-device NAT behavior remain unknown.

**Engine Feedback:** TSL cel materials were the strongest part. I initially guessed wrong about renderer material mapping; visual testing exposed it. The most important custom work was the shooter simulation and co-op replication. The hardest part was keeping every dangerous projectile synchronized while maintaining responsive controls. I would overhaul implicit graphics fallback and add built-in controller focus/navigation.

**Prompt Feedback:** The source inspiration, controller-first direction and attract requirement gave the game a clear identity. The confusing point was the hub’s fallback recommendation versus the explicit WebGPU-only requirement; required-WebGPU metadata resolves it. The hardest task was combining complete gameplay and multiplayer in one HTML. The additional test I would run is a full sortie across two real devices with physical DualSense controllers and audio.