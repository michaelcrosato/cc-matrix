Built [**Final Dawn X**](./Final-Dawn-X-Final-Fantasy-X-gpt-6.1-sol-ultra-20261029-1526.html): a complete single-HTML pilgrimage featuring exploration, tactical combat, party switching, progression, a temple trial, summon, currentball, saving, multiplayer, and attract mode.

Serve through localhost or HTTPS. **Cross/Enter** confirms; **Options/Esc** opens settings. WebGPU is required.

**Source Information**

- **Date:** 2026-10-29 15:53
- **Source:** Final Fantasy X; all demo characters, writing, models, and music are original.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, JavaScript, HTML/CSS; esbuild 0.25.12 packaging.
- **Art:** Stylized cel shading.
- **Animation:** Procedural character joints, locomotion, combat poses, foliage, particles, and sky-ray animation.
- **Audio:** Original synthesized music, ocean ambience, and effects; no voice recordings.
- **Online:** [AI Hub Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0; 1–4-player pilgrimage time trial with live ghosts.
- **Testing:** Focused gameplay, controller, network, viewport, and WebKit checks; no FPS audit. WebKit tested capability screens because WebGPU was unavailable there.
- **Environment:** Codex CLI (headless); Linux; deployment browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort ultra.
- **Usage:** API cost unknown; tokens unknown; session approximately 26 minutes.

**Testing Feedback**

15 functional/UX issues caught and fixed, including **2 game-breaking issues**. Final results: gameplay **26/26**, multiplayer **26/26**, player departure **26/26**, layout/capability **9/9**; zero runtime errors. Most helpful: complete-journey and real multiplayer checks. Least helpful: an initial render test using the wrong software GPU adapter.

**Engine Feedback**

- **Liked most:** Scene composition and toon materials.
- **Got stuck:** Headless GPU configuration and automatic fallback behavior.
- **Most important custom system:** Conditional-turn combat and forecasting.
- **Hardest part:** Coordinating combat, animation, menus, and the online clock.
- **Overhaul:** Implicit renderer fallback.
- **One improvement:** Built-in controller focus and narrative authoring tools.

**Prompt Feedback**

- **Liked most:** Controller-first design, attract mode, and concrete packaging requirements.
- **Confusing:** The open-ended meaning of “ALL features.”
- **Hardest:** Making every system feel like one coherent chapter.
- **Additional test:** A television playthrough with a physical DualSense, including reconnection during combat.

These details also appear in-game and in the HTML’s opening comment.