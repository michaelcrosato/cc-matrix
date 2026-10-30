Built **The Shell Continuum**.

[Single-file game HTML](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The-Shell-Continuum-Turtles-in-Time-gpt-6-astra-xhigh-20261029-1119.html) · [Controls and development guide](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The-Shell-Continuum-Turtles-in-Time-gpt-6-astra-xhigh-20261029-1119/README.md)

Includes three eras, nine combat zones, four couriers, upgrades, revives, a boss battle, local/online co-op, and looping attract mode. Serve through HTTPS or localhost; WebGPU and CDN access are required.

**Source information**

- **Date/source:** 2026-10-29 11:19, America/Vancouver; *Turtles in Time*.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5.
- **Art/animation:** Procedural cel-shaded 3D, ink outlines, articulated rigs, pose blending, and physics-driven throws.
- **Audio:** Original code-written music, effects, and synthesized gibberish voices.
- **Online:** AI Hub co-op and standalone WebRTC rooms, supporting 1–4 players.
- **Environment/model:** Codex CLI, headless Linux; target browser unknown. OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** Approximately 160K tracked tokens and 63 minutes. API cost and token breakdown unknown.

**Testing feedback:** Efficient checks used Chromium 156 and emulated controllers, without FPS benchmarking. All 94 checks passed across gameplay, hub multiplayer, and standalone networking; complete campaign traversal also passed. Two input defects were fixed, and one critical headless-rendering configuration blocker was resolved. The hub’s dedicated-server test was most helpful; repeated browser-flag experiments were least helpful.

**Engine feedback:** Scene graphs and toon materials worked especially well. Headless GPU configuration caused the main false start. The most important custom system was the combat and encounter engine; WebGPU setup and multiplayer synchronization were hardest. I would overhaul implicit fallback and add explicit WebGPU-only initialization with clearer device-loss diagnostics.

**Prompt feedback:** The arcade reference and controller-first requirements gave clear direction. “Feature-complete” and designer-tooling depth were less specific. Integrating the entire slice into one HTML was hardest. The next valuable test would be four physical DualSense controllers across different home networks.

These details also appear in Credits and the opening HTML comment.