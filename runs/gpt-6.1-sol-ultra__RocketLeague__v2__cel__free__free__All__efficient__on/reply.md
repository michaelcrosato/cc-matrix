[**Play Boost Brawl — single HTML file**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__RocketLeague__v2__cel__free__free__All__efficient__on/work/Boost-Brawl-RocketLeague-gpt-6.1-sol-ultra-20261028-2327.html)

Includes Pulse and Classic 2v2, Duel, training packs, four-player split-screen, online rooms, garage, settings, and AI attract mode. Requires WebGPU and internet for CDN dependencies.

**Source Information**

- **Date:** 2026-10-28 23:50 PDT.
- **Source:** Rocket League; original spiritual successor.
- **Title:** Randomly selected from 50 candidates using Python `secrets`.
- **Tech:** [Three.js](https://threejs.org/docs/pages/WebGPURenderer.html) 0.180.0, WebGPU only, Rapier 0.19.3, Web Audio, Gamepad API, PeerJS 1.5.5/WebRTC.
- **Art:** Procedural cel shading, ink outlines, rooftop stadium.
- **Animation:** Physics-driven vehicles; procedural wheels, aerial stunts, flags, flames, particles, and cameras.
- **Audio:** Original synthesized electronic music and effects; no voice.
- **Online:** Four-player host-authoritative rooms. No TURN relay; restrictive networks may block connections.
- **Testing:** Lightweight browser and simulation checks; four network peers and two integrated game clients verified.
- **Environment:** Codex CLI, Linux; Chrome 154 under Xvfb. User browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort ultra.
- **Usage:** Cost/tokens unknown; approximately 23 minutes at packaging.

**Testing Feedback**

Six issues caught and fixed; zero confirmed game-breaking issues. Final local-file launch produced zero browser exceptions. Most helpful: rendered gameplay and real WebRTC synchronization tests. Least helpful: syntax checks alone.

**Engine Feedback**

Liked scene composition and toon materials most. Got stuck on headless GPU capture and initially placed the pitch below the deck. The most important custom system was the arcade vehicle controller. Coordinating physics, cameras, and networking was hardest. I would overhaul implicit renderer fallback and add an official WebGPU vehicle reference.

**Prompt Feedback**

The controller-first direction and precise deliverable were strongest. “All modes that make sense” left scope unclear. Polishing local and online multiplayer together was hardest. The next test would use four physical PS5 controllers and four separate networks, including strict NAT.

The complete report is also embedded in **About/Credits** and the HTML’s opening comment.