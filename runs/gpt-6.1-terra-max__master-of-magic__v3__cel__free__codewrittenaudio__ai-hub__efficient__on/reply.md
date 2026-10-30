Built **[Mages of the Mirror](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v6__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Mages of the Mirror-Master of Magic-gpt-6.1-terra-max-20261029-0855.html>)**. The randomly selected title contains a two-realm campaign with city production, research, spells, diplomacy, tactical battles, and conquest or magical victory.

Open the HTML in a WebGPU-capable browser. It loads its libraries from CDNs, so an internet connection is required. Use a controller’s D-pad and Cross to navigate and select; Triangle opens orders, R2 ends a turn, and Options opens settings. Arrow keys, Enter, E, R, and Esc provide the keyboard equivalents.

The two-player AI Hub harness passed, and a standalone peer challenge connected between two browser instances. Automated checks also covered campaign progression, a tactical victory, saving, realm travel, the Crown victory, attract mode, controller input, and the touch-only notice.

### Source information

- **Date:** 2026-10-29 08:55. **Source:** Master of Magic.
- **Tech:** Three.js R180 with WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio; PeerJS 1.5.5; [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Art and animation:** Procedural cel-shaded miniatures, transform animation, and Rapier-driven particles.
- **Audio:** Code-synthesized music, effects, and gibberish voices.
- **Online:** AI Hub side-by-side sessions and a standalone WebRTC peer challenge.
- **Testing parameters:** Lightweight automated checks; FPS targets were out of scope. Tests used Chrome 154 under Xvfb on Linux.
- **Environment:** Codex CLI, headless; Linux; browser unknown in the supplied environment.
- **Model:** OpenAI, gpt-6.1-terra, reasoning effort max.
- **Usage:** Cost and token count unknown; approximately 17 minutes of session time.

### Testing feedback

Testing and review caught **6 issues**, including **1 game-breaking** case where a lost WebGPU device left a blank canvas. The game now reports that failure; it does not fall back to WebGL. The campaign and tactical playthrough plus the AI Hub harness were the most helpful checks. The least helpful was the initial DOM-only smoke check, which missed the blank canvas.

### Engine feedback

Three.js made it straightforward to assemble the miniature world from simple geometry. I initially had to investigate headless WebGPU configuration. The campaign rules, tactical system, controller menus, and content were the most substantial custom work; combining asynchronous WebGPU and physics initialization in one file was the hardest engine integration. I would overhaul WebGPU failure diagnostics and make headless WebGPU testing easier.

### Prompt feedback

I liked the invitation to carry the original’s magic and two-world scope into a new game. The browser being specified as unknown while testing was requested needed clarification in the reporting, so the actual test browser is listed separately. The hardest part was fitting strategy, tactical combat, controller UX, and multiplayer into one slice. The most valuable additional test would be a long controller playthrough with players on separate devices.