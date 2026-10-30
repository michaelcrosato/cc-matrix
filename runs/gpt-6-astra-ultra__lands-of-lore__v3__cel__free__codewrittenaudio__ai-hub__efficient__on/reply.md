Built **Lands of Yore: The Throne of Thorns**, randomly selected from 50 titles.

[Open the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Lands-of-Yore-The-Throne-of-Thorns-Lands-of-Lore-The-Throne-of-Chaos-gpt-6-astra-ultra-20261029-1046.html) · [Source and launch instructions](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Lands-of-Yore-The-Throne-of-Thorns-Lands-of-Lore-The-Throne-of-Chaos-gpt-6-astra-ultra-20261029-1046/README.md)

The 215 KB HTML includes three environments, party progression, combat, charged spells, physics puzzles, inventory, trading, saves, a boss and ending, controller menus, attract mode, and co-op. Run through localhost or HTTPS with WebGPU support; CDN dependencies require internet.

**Source information**

- **Date:** 2026-10-29 10:46 PDT.
- **Source:** Lands of Lore: The Throne of Chaos.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript, PeerJS 1.5.5.
- **Art:** Original procedural cel shading, faceted scenery, ink outlines, SVG portraits.
- **Animation:** Articulated procedural characters, weapon motion, particles, animated scenery.
- **Audio:** Code-written music, effects, and synthesized gibberish voices.
- **Online:** AI Hub Session Protocol v1 and standalone 1–4-player WebRTC co-op.
- **Testing:** Lightweight checks; no FPS targets or optimization campaign.
- **Environment:** Codex CLI, headless Linux; tested with Chrome 154.0.8037.57. End-user browser unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort ultra.
- **Usage:** Approximately **537.5K tokens**, **30 minutes**. API cost and token breakdown unknown.

**Testing feedback**

All **36 integrated checks passed**, with zero runtime errors. Browser and visual testing caught **five issues**, all fixed: one WebGPU test-environment blocker, one focus problem, and three visual defects. No unresolved game-breaking issue appeared in the final run.

The complete progression/controller test was most helpful; the adapter-only GPU probe was least helpful because it missed presentation failure. Real local WebRTC exchange passed. Physical controllers, cross-device NAT, audible listening, and a complete external Hub round remain unverified.

**Engine feedback**

- **Best:** Three.js scene composition and TSL procedural materials.
- **Wrong assumption:** A working GPU adapter did not guarantee canvas presentation.
- **Largest custom system:** Party gameplay, persistence, controller UI, and cooperative synchronization.
- **Hardest:** Coordinating rendering, physics, input, and network state.
- **Overhaul:** Automatic renderer fallback.
- **Desired improvement:** A tested WebGPU-only character-controller starter.

**Prompt feedback**

- **Best:** Clear controller, audio, attract-mode, and packaging requirements.
- **Confusing:** “Feature-complete” left campaign length open.
- **Hardest:** Making the broad systems form one coherent adventure.
- **Additional test:** A physical-controller, two-device co-op playthrough through the ending.

This feedback is also embedded in **About/Credits** and the HTML’s opening comment.