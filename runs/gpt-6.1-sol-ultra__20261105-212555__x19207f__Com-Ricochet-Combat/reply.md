[**Play Com-Ricochet**](./Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555.html) — five fields of tank duels, bank shots, guided shells, invisible rivals, and jet fighters.

Single HTML; open in a WebGPU browser. Internet is required for CDN dependencies. **154/154 checks passed**, including all four official AI Hub scenarios.

[Exit interview](./exit-interview.json) · [Development files and test command](./Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555/README.md)

**Source Information**

- **Date:** 2026-11-05 21:25:55. **Source:** [Combat, Atari, 1977](https://atari.com/pages/combat). **Supplied plan:** none.
- **Genre / perspective:** Arcade vehicle shooter; tilted orthographic top-down arena.
- **Tech:** Three.js r180, WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, BroadcastChannel, AI Hub protocol v1/client 1.4.0.
- **Art / animation:** Procedural cel-shaded dioramas with ink outlines; native AnimationMixer clips for recoil, hit reactions, and flight.
- **Audio:** Synthesized music, effects, engines, and gibberish radio voices. Music defaults to 10%; no audio files.
- **Online:** AI Hub shared world for 1–4; standalone direct/LAN links and browser rooms; two-player couch play.
- **Testing:** Software WebGPU, scripted mechanics and circuit progression, virtual controller, multitouch, audio analysis, and multiplayer fault scenarios. Physical-device feel and listening results: unknown.
- **Research:** Atari rules, [original manual](https://www.ataricompendium.com/archives/manuals/vcs/combat.pdf), and program disassembly. Exact original sound timbre: unknown.
- **Environment:** Codex CLI, headless Linux/WSL2. **Model:** OpenAI gpt-6.1-sol, reasoning effort ultra. **Usage:** added on import.

**Testing Feedback**

1. Testing and review caught 10 game issues; all corrected.
2. Three were game breaking: startup, escaping round results, and missing multiplayer host results.
3. Most helpful: real-physics bank-shot arming and scoring.
4. Least helpful: ordinary screenshots when software WebGPU appeared blank; GPU readback worked.

**Engine Feedback**

1. Best: the scene graph, native animation mixer, and Rapier collision events.
2. Wrong guesses: Rapier descriptor methods; software WebGPU initialization needed investigation.
3. Built manually: duel rules, AI, menus, procedural assets/audio, and multiplayer snapshots.
4. Hardest: WebGPU initialization and capture across multiple copies.
5. Engine source changes: none.
6. Requested improvement: clearer WebGPU diagnostics and reliable automated capture.

**Prompt Feedback**

1. Best: concrete source, controller-first design, attract mode, and multiplayer contract.
2. Confusing: standalone internet matchmaking scope and feedback formatting.
3. Hardest: integrating five rules, multiple input methods, and shared-world multiplayer.
4. Suggested change: specify whether standalone networking requires internet relays or permits direct/LAN pairing.

All information and feedback are also included in the in-game Credits screen.