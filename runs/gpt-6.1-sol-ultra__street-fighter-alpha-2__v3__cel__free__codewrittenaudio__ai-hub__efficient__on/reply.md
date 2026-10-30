Created **[Afterhours Alpha 2](./Afterhours-Alpha-2-Street-Fighter-Alpha-2-gpt-6.1-sol-ultra-20261029-0819.html)** — one HTML file with three fighters, arcade endings, local versus, twelve training lessons, online rooms, and attract mode.

Requires WebGPU and internet access for pinned dependencies.

**Source Information:** 2026-10-29 08:19. Inspired by Street Fighter Alpha 2.

- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art/animation:** Procedural cel-shaded geometry, ink outlines, articulated rigs, pose blending, particles and afterimages.
- **Audio:** Code-written synth music, effects and gibberish voices.
- **Online:** WebRTC private rooms; AI Hub versus with 1–4 players and queued challengers.
- **Environment/model:** Codex CLI, headless Linux; target browser unknown; tested Chrome 154. OpenAI gpt-6.1-sol, ultra reasoning.
- **Usage:** API cost and tokens unknown; approximately 26 minutes.

**Testing Feedback:** Tests and review found 17 issues, all fixed; four were major/critical, affecting startup, draw handling or scoring. Passed 23 combat checks, 97 official hub checks, real WebRTC exchange, and browser smoke tests. Most helpful: the hub harness. Least helpful: syntax-only checks. Physical DualSense and cross-device WAN testing remain unverified.

**Engine Feedback:** Best: scene composition and material tools. Wrong guesses included the Rapier module filename and implicit renderer fallback. The essential custom work was combat, input buffering and match networking; coordinating physics, animation and prediction was hardest. I would overhaul implicit fallback and add integrated gameplay/animation tools. Headless compositor corruption required framebuffer readback to verify visuals.

**Prompt Feedback:** Controller-first priorities and single-file delivery were clear. “Complete engine” versus “vertical slice” left scope ambiguous. Making every mechanic readable alongside multiplayer was hardest. The additional test I’d choose is a two-device DualSense match over a high-latency connection.

These details are also included in About/Credits and the HTML’s opening comment.