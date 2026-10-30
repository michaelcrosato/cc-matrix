Built [Plucky Swordsman Mochi](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v19__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Plucky Swordsman Mochi-Brave Fencer Musashi-gpt-6.1-terra-max-20261029-0912.html>). Open it in a WebGPU-enabled browser with internet access for its CDN dependencies.

The demo includes sword combat, copied enemy powers, a wind-gate puzzle, villager rescues, a boss, attract mode, two-player shared-screen co-op, standalone online rooms, and [AI Hub side-by-side sessions](https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md). The title was selected with a random number generator.

**Source information**

- **Date and source:** 2026-10-29 09:12; *Brave Fencer Musashi*.
- **Tech:** Three.js r180 with WebGPU only, Rapier 0.19.3, PeerJS 1.5.5, WebRTC, Web Audio, Gamepad API, and AI Hub Session Protocol v1.
- **Art and animation:** Cel-shaded paper-craft style; procedural character motion, Rapier movement, and particles.
- **Audio:** Code-synthesized music, effects, and gibberish voices.
- **Online:** AI Hub sessions for 1–4 players; standalone WebRTC rooms for 2–4 using [PeerJS signaling](https://peerjs.com/client/faq).
- **Environment and usage:** Codex CLI, headless Linux; player browser unknown. Tested in Chrome 154. API cost and token count unknown; session time approximately 35 minutes.

**Testing feedback**

Five issues were caught and fixed; one could block dialogue progression on a slow renderer. The most helpful test was a browser-driven journey through the gate, rescues, power copying, and boss ending. It used position shortcuts and a weakened boss. The least helpful was the syntax check, which could not exercise gameplay.

The AI Hub harness passed with one and two simulated players. A two-browser online room connected and exchanged scores. Physical controllers and players on separate networks were not tested.

**Engine feedback**

Three.js made the stylized world straightforward to assemble. An unsupported material option and an initial headless WebGPU device loss needed investigation. The most important work was building the adventure loop; the hardest was combining rendering, physics, input, and networking. I would overhaul WebGPU initialization diagnostics to make backend selection and device-loss reasons clearer.

**Prompt feedback**

The controller-first vertical-slice direction and attract-mode requirement were especially useful. Standalone multiplayer’s format was ambiguous, so the demo supports both local co-op and online score play. The hardest part was completing and verifying the adventure alongside both multiplayer paths. The next test would use physical DualSense controllers and four friends on separate networks.