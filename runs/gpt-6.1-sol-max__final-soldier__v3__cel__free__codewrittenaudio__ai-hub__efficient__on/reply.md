Built **Finale Patrol**: three mission sectors, two bosses, configurable weapons, Caravan modes, co-op, and AI attract mode.

[Download the single HTML game](./Finale-Patrol-Final-Soldier-gpt-6.1-sol-max-20261029-0506.html) · [Development files and instructions](./Finale-Patrol-Final-Soldier-gpt-6.1-sol-max-20261029-0506/README.md)

Open in a WebGPU-capable browser with internet access for CDN dependencies. Cross/Enter starts; Options/Escape opens settings.

**Source information:** Built 2026-10-29 06:00, America/Vancouver. Inspired by [Final Soldier](https://en.wikipedia.org/wiki/Final_Soldier). Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, and Web Audio. Original procedural cel-shaded art; transform animation and physics debris; code-written synth music, effects, and gibberish voices. Online uses AI Hub client 1.3.0 and standalone PeerJS 1.5.5/WebRTC; local duo is included. Environment: Codex CLI, headless Linux/WSL2, Chrome 154 testing; player browser unknown. Model: OpenAI gpt-6.1-sol, max reasoning. Session approximately 53 minutes; API cost, token total, and breakdown unknown.

**Testing feedback:** All **189 recorded assertions passed**, covering gameplay, controller input, deployment, and multiplayer under lightweight testing. Three defects were caught and fixed; zero game-breaking issues were observed. The AI Hub conformance harness was most helpful. Fixed-delay controller pulses were least helpful because software rendering caused false failures. Physical controllers and four separate home networks remain unverified.

**Engine feedback:** Best: Three.js scene composition and Rapier collision sensors. Initially guessed the headless graphics flags incorrectly; explicit SwiftShader WebGPU selection resolved that. The main custom systems were the encounter director and co-op replication. Keeping immediate local movement coherent with authoritative damage was hardest. I would overhaul implicit renderer fallback and improve adapter/device-loss diagnostics.

**Prompt feedback:** Best: the arcade identity, controller-first controls, procedural audio, and precise delivery format. Mission length and standalone transport were unspecified; I chose a 4.5-minute mission and room-code WebRTC. Integrating the complete presentation, combat, and multiplayer lifecycle was hardest. The next useful test would be a full patrol with four real DualSense controllers across separate home networks.

These details are also included in About/Credits and the opening HTML comment.