Built **Bronze Axe Brigade**: five chapters, three heroes, elemental magic, beast riding, co-op, checkpoints, and a complete boss encounter and ending.

[Open/download the single HTML game](./Bronze-Axe-Brigade-Golden-Axe-II-gpt-6-astra-max-20261029-0946.html) · [Controls and build instructions](./Bronze-Axe-Brigade-Golden-Axe-II-gpt-6-astra-max-20261029-0946/README.md)

Serve through localhost or HTTPS in a WebGPU-enabled browser. CDN dependencies require internet access.

**Source Information**

- **Date:** 2026-10-29 09:46, America/Vancouver.
- **Source:** Golden Axe II; original characters, assets, writing, and music.
- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Cel-shaded fantasy dioramas with ink outlines.
- **Animation:** Procedural joint rigs, combat poses, particles, and physics.
- **Audio:** Code-written music, synthesized effects, and gibberish voices.
- **Online:** 1–4-player hub co-op, standalone WebRTC rooms, and local co-op.
- **Testing:** Lightweight functional checks; performance optimization excluded.
- **Environment:** Codex CLI (headless); Linux; target browser unknown. Tested Chrome 154 under Xvfb.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** API cost and token totals unknown; approximately 65 minutes.

**Testing Feedback**

Six tracked issues were fixed; one startup error was critical. All nine saved test reports pass, including the complete campaign, controller input, axis inversion, standalone rooms, and hub scenarios.

The official hub harness was most helpful. Initial raw-headless screenshots were least helpful; Xvfb resolved canvas presentation. Physical-controller feel and four-device real-WAN endurance remain unverified.

**Engine Feedback**

Scene composition, toon materials, and Rapier’s body API worked well. Headless rendering and short-input sampling required corrections. The main custom work was combat, encounters, controller menus, and networking; synchronizing physics and shared state was hardest. I would overhaul implicit renderer fallback and add a supported strict-WebGPU initialization option.

**Prompt Feedback**

The arcade reference, original audio requirement, and controller focus were useful. Demo duration was unspecified, so I chose five complete chapters. Packaging the game and both multiplayer transports into one file was hardest. The next useful test would be a full campaign with four physical DualSense controllers across real internet connections.

These notes also appear in About/Credits and the HTML’s opening comment.