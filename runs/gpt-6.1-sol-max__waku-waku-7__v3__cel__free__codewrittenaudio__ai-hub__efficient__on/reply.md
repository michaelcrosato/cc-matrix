[Play **Waku Ruckus 7**](./Waku-Ruckus-7-Waku-Waku-7-gpt-6.1-sol-max-20261029-0457.html)

Complete single-file demo with seven fighters, arcade story, dojo, local versus, online rooms, and automatic AI attract mode. Requires WebGPU and internet for CDN dependencies.

**Source Information**

- **Date:** 2026-10-29 04:57 PDT. **Source:** Waku Waku 7.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio API.
- **Art:** Procedural cel-shaded 3D with ink outlines and festival-poster UI.
- **Animation:** Procedural character rigs, combat poses, secondary motion, particles, and hitstop.
- **Audio:** Original synthesized music, sound effects, and Animalese-style gibberish.
- **Online:** [AI Hub protocol](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) and standalone PeerJS 1.5.5/WebRTC rooms.
- **Testing:** Lightweight functional checks and rendered captures; no performance benchmarks.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154 with Xvfb. Player browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** Cost and token counts unknown; session approximately one hour.

**Testing Feedback**

Testing caught **2 game issues, including 1 critical startup issue**; both were fixed. Final checks passed: 45 combat/campaign checks, 11 additional feature checks, 120 hub checks, and standalone room testing. The rendered browser smoke test was most helpful; syntax-only validation was least helpful.

**Engine Feedback**

I most liked the toon materials and scene composition. I guessed wrong about a Rapier descriptor method and encountered headless GPU presentation problems. The most important custom system was combat; prediction combined with authoritative physics was hardest. I would overhaul implicit renderer fallback and add an explicit public WebGPU-only option.

**Prompt Feedback**

The concrete deliverable and controller-first requirements were strongest. Exact roster and campaign size were open to interpretation. Completing combat, campaign, controller UX, and both multiplayer transports together was hardest. The additional test I would run is two physical DualSense controllers across separate home networks.

All source information and feedback also appear in the in-game credits and opening HTML comment.