Built **[Red Radar](</home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Red-Radar-Red-Alarm-gpt-6-astra-max-20261029-0940.html>)** — a single HTML file with four sectors, branching exploration, a boss, escape sequence, replay, controller menus, attract mode, and multiplayer score rooms.

[Development files and run instructions](</home/micha/dev/cc-matrix/runs/gpt-6-astra-max__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Red-Radar-Red-Alarm-gpt-6-astra-max-20261029-0940/README.md>). Requires WebGPU and internet access for CDN dependencies; serve through HTTPS or localhost.

**Source information**

- **Date:** 2026-10-29 17:31 UTC.
- **Source:** [Red Alarm](https://en.wikipedia.org/wiki/Red_Alarm). Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Procedural cel shading, polygonal models, ink outlines.
- **Animation:** Procedural flight and machinery, physics debris, recorded flight-path replay.
- **Audio:** Code-written synth music, effects, and gibberish radio voices.
- **Online:** 1–4-player AI Hub parallel competition and standalone WebRTC score rooms.
- **Testing/environment:** Lightweight browser, mechanics, visual, and integration checks; Codex CLI headless/Linux; Chrome 154 WebGPU testing. Target browser unknown. Physical-controller and cross-network results unknown.
- **Model/usage:** OpenAI gpt-6-astra, reasoning effort max. Approximately 49 minutes; API cost and token usage unknown.

**Testing feedback**

Four game issues were caught and fixed: two attract-navigation stalls, title clipping, and clipped signage. Two blocked attract progression; none blocked manual play.

Passed 14 mechanics checks, complete attract playback, hub checks with one/two players and departure, and actual PeerJS score exchange. The full mission simulation was most helpful. Initial headless screenshots were least helpful because they omitted GPU pixels; explicit GPU capture resolved that.

**Engine feedback**

- **Liked most:** The scene graph and procedural toon materials.
- **Got stuck:** Headless GPU capture and implicit WebGL fallback behavior.
- **Built ourselves:** Flight, combat, progression, controller UI, replay, audio, and score networking.
- **Hardest:** Keeping physics, targeting, cameras, and combat cues readable together.
- **Would overhaul:** Implicit renderer fallback policy.
- **Would change:** Add a public WebGPU-only option and clearer device-failure diagnostics.

**Prompt feedback**

- **Liked most:** The specific source and controller-first requirements.
- **Confusing:** Multiplayer’s format was open; I selected the hub-supported parallel score competition.
- **Hardest:** Combining exploratory flight with a complete single-file arcade slice.
- **Additional test:** A television playtest with physical DualSense controllers on separate internet connections.

These details are also embedded in About/Credits and the HTML’s opening comment.