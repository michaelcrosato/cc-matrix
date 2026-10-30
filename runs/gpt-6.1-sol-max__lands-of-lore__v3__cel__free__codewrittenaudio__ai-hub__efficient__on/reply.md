Built [Lands of Spore: The Throne of Thistles](./Lands-of-Spore-The-Throne-of-Thistles-Lands-of-Lore-The-Throne-of-Chaos-gpt-6.1-sol-max-20261029-0601.html) — a **3.05 MiB single-file demo** with party combat, puzzles, trading, saves, two endings, looping attract mode, and online races. Serve over localhost or HTTPS with WebGPU enabled.

**Source Information:**

| Field | Details |
|---|---|
| Date | 2026-10-29 07:23, America/Vancouver |
| Source | Lands of Lore: The Throne of Chaos |
| Tech | Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad API; PeerJS 1.5.5; Web Audio; esbuild 0.25.11 |
| Art | Procedural cel-shaded 3D and original SVG portraits |
| Animation | Hierarchical mesh animation, combat poses, particles and environmental motion |
| Audio | Original synthesized music, effects and gibberish voices |
| Online | 1–4-player AI Hub parallel expeditions; standalone room-code races |
| Testing | Lightweight build, browser, progression, controller and networking checks |
| Environment | Codex CLI, headless Linux; Chromium 153 under Xvfb |
| Model | OpenAI gpt-6.1-sol, reasoning effort max |
| Usage | Cost and tokens unknown; approximately 82 minutes at build |

**Testing Feedback:** All 49 campaign/attract checks, three hub scenarios, standalone WebRTC checks and release UI checks passed. Testing and review found eight game/UI issues, four potentially blocking; all were corrected. A separate GPU test-environment problem was resolved. The hub harness was most helpful; syntax checks were least helpful for finding visual and timing faults.

**Engine Feedback:** Three.js’s scene hierarchy and toon materials worked well. Headless GPU presentation and early texture replacement caused difficulties. The largest custom system was the party RPG framework; coordinating physics, interactions and controller focus was hardest. I would overhaul implicit renderer fallback and add built-in controller action/focus support.

**Prompt Feedback:** The source and creative constraints provided strong direction. The multiplayer format was ambiguous, so I chose parallel expedition races. Completing the RPG loop in one portable file was hardest. The most valuable further test is a full playthrough with physical PS5 controllers across separate networks.

These details also appear in About/Credits and the HTML’s opening comment.