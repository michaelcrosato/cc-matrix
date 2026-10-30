Built **[Riff Rocket Riot](./Riff-Rocket-Riot-Rock-n-Roll-Racing-gpt-6-astra-xhigh-20261029-1109.html)** — a single HTML file with three circuits, championship progression, garage upgrades, combat, ghosts, attract mode, and multiplayer.

Serve through HTTPS or localhost. WebGPU and internet access for CDN dependencies are required.

**Source Information**

- **Date:** 2026-10-29 11:56, America/Vancouver.
- **Source:** Rock n’ Roll Racing. Original assets and music.
- **Title:** Randomly selected from 50 candidates using OS-backed randomness.
- **Tech:** Three.js R180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Procedural cel shading, faceted scenery, outlined armored vehicles.
- **Animation:** Procedural vehicle/prop animation, physics, particles, network interpolation.
- **Audio:** Code-written rock music, synthesized effects, gibberish announcer.
- **Online:** AI-hub races and standalone WebRTC rooms.
- **Testing:** Focused checks; performance benchmarking excluded.
- **Environment:** Codex CLI, headless Linux; tested using Chrome for Testing 156.0.8078.4 under Xvfb.
- **Model:** OpenAI gpt-6-astra, xhigh.
- **Usage:** Cost and tokens unknown; approximately 47 minutes.

**Testing Feedback**

All **96 ai-hub checks passed**, including four-player host departure. Gameplay, championship completion, ghosts, axis inversion, and a real two-browser standalone connection also passed.

Testing caught one potentially game-breaking controller timing defect under rendering stalls; fixed. The hub harness was most helpful. Initial system-Chrome captures were least helpful because browser configuration produced blank images. Physical DualSense hardware and mixed remote networks remain untested.

**Engine Feedback**

Toon materials and Rapier collisions worked well. Browser capture configuration caused the main setback. The largest custom system was arcade vehicle handling; responsive multiplayer collision/combat ownership was hardest. I would overhaul implicit renderer fallback and add a documented public “require WebGPU” option.

**Prompt Feedback**

The art, audio, and controller constraints gave clear direction. “Feature-complete” left content quantity open; this implements a complete three-event tour with repeatable modes. Integrating all systems into one HTML was hardest. The next valuable test is four people using physical DualSense controllers across different devices and home networks.

All feedback is also included in **About** and the HTML’s top comment.