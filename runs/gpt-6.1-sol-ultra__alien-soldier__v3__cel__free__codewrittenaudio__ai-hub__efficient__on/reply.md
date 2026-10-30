[**Play Alien Shoulder locally**](http://localhost:8718/Alien-Shoulder-Alien-Soldier-gpt-6.1-sol-ultra-20261029-0820.html) · [**Single HTML file**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v20__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Alien-Shoulder-Alien-Soldier-gpt-6.1-sol-ultra-20261029-0820.html)

Complete with three bosses, four weapons, counters, Phoenix dash, local co-op, hub score competition, and attract mode. Requires WebGPU and CDN access.

**Source Information**

- Date: 2026-10-29 08:40, America/Vancouver.
- Source: Alien Soldier. Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.3.0.
- Art: procedural cel shading and ink outlines.
- Animation: articulated procedural rigs and state-driven movement.
- Audio: code-written synth music, effects, and gibberish voices.
- Online: AI Hub parallel competition for 1–4 players; standalone two-player local co-op.
- Testing: lightweight headless Chrome/WebGPU checks and emulated controllers.
- Environment: Codex CLI (headless); Linux; player browser unknown.
- Model: OpenAI, gpt-6.1-sol, reasoning effort ultra.
- Usage: API cost and tokens unknown; session approximately 20 minutes.

**Testing Feedback**

Passed 21 gameplay checks and 72 official hub checks. Eight implementation or packaging issues were fixed, including one critical controller-input blocker. Most helpful: the official hub harness. Least helpful: the initial native Vulkan screenshot run, which required correcting the headless graphics configuration.

**Engine Feedback**

Three.js TSL made cel shading straightforward. Headless Vulkan configuration caused the main detour. The encounter director and combat systems required the most custom work; aligning physics and hit detection was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU option.

**Prompt Feedback**

The complete vertical slice and controller-first requirements gave useful direction. The multiplayer mode was unspecified; parallel competition suited the boss-rush structure. Showing every mechanic through readable encounters was hardest. The additional test I would run is a physical DualSense television session with two real hub devices.

These reports are also included in the in-game credits and opening HTML comment.