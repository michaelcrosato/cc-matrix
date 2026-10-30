[**Download Final Everafter X**](./Final-Everafter-X-FinalFantasyX-gpt-6-astra-ultra-20261029-1017.html)

Completed single-file RPG chapter with exploration, tactical battles, party swapping, progression, equipment, a playable summon, two endings, saves, and attract mode. Serve through localhost or HTTPS; WebGPU and CDN access are required.

**Source Information**

- **Date:** 2026-10-29 10:17. **Source:** Final Fantasy X.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS.
- **Art:** Original procedural cel-shaded scenery and characters.
- **Animation:** Articulated rigs, cloth, water, combat effects, cinematic cameras.
- **Audio:** Original procedural music and synthesized effects; no voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), SDK 1.3.0; synchronized parallel pilgrimage for 1–4 players.
- **Environment:** Codex CLI, headless Linux; player browser unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort ultra.
- **Usage:** 435,157 tracked tokens; 37 minutes 38 seconds. API cost and token breakdown: unknown.

**Testing Feedback**

- Found and fixed **14 issues**, including **2 startup blockers**.
- Passed 16 gameplay tests, 12 campaign seeds, controller checks, and representative phone/tablet/ultrawide checks.
- All 24 official local Hub checks passed for solo, two-player, and disconnect scenarios.
- Most helpful: Hub harness exposed missed controller presses.
- Least helpful: initial screenshots using incorrect software GPU flags.
- WebKit verified the compatibility screen; physical DualSense, real iOS Safari, and a live hosted lobby remain unverified.

**Engine Feedback**

- Best: consistent procedural scenery across exploration and battles.
- Sticking point: strict WebGPU initialization and headless GPU setup.
- Most important custom system: tactical turn scheduling and party rules.
- Hardest: coordinating animation, input, and combat state.
- Overhaul: implicit renderer fallback.
- Desired improvement: a public strict-WebGPU initialization option.

**Prompt Feedback**

- Best: clear source identity, technology constraints, and controller focus.
- Confusing: multiplayer meant a host-owned session protocol.
- Hardest: integrating the complete RPG slice into one portable file.
- Next test: a physical DualSense/television playthrough and live two-person Hub session.

This information is also embedded in Credits and the HTML’s opening comment.