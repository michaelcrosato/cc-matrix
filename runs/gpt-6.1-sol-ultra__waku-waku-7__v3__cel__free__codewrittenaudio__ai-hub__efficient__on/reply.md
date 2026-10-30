Built [**Waku Waku Wishbash**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v11__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Waku-Waku-Wishbash-Waku-Waku-7-gpt-6.1-sol-ultra-20261029-0753.html): three fighters, three arenas, arcade endings, nine training lessons, attract mode, local versus, and online play.

Serve over localhost or HTTPS. WebGPU and internet access for dependencies are required. [Guide and source](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v11__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Waku-Waku-Wishbash-Waku-Waku-7-gpt-6.1-sol-ultra-20261029-0753/README.md).

**Source Information**

- Date: 2026-10-29 08:40, America/Vancouver.
- Source: Waku Waku 7. Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub client 1.3.0; esbuild 0.25.12.
- Art: original cel-shaded procedural 3D.
- Animation: articulated procedural rigs, squash, recoil, secondary motion and hitstop.
- Audio: code-written music, synthesized effects and gibberish voices.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) rotating tournaments for 1–4 seats; standalone two-player WebRTC. Restrictive NAT traversal unknown.
- Environment: Codex CLI (headless); Linux; browser unknown.
- Model: OpenAI, gpt-6.1-sol, reasoning effort ultra.
- Usage: approximately 47 minutes; API cost and token usage unknown.

**Testing Feedback**

All final reports pass: 22 combat checks, 25 keyboard/emulated-controller UI checks, 97 hub checks plus a 25-check regression, six actual peer-game checks, six package/touch checks, graphics checks and offline audio synthesis. Protocol tests suppressed drawing after WebGPU initialization; rendering was tested separately.

Found and fixed **14 issues**, including **four critical issues, three of which could break play**. Most helpful: actual two-browser fighting and dedicated-host tests. Least helpful: syntax checks alone.

**Engine Feedback**

Best: expressive scene graphs and dependable physics contacts. Wrong turns: implicit fallback behavior and coupling simulation to presentation frames. Built ourselves: combat, AI, training, controller menus and netcode. Hardest: responsive shared combat. Overhaul: implicit renderer fallback. Desired change: public WebGPU-only initialization with clearer device-loss diagnostics.

**Prompt Feedback**

Best: clear arcade, controller and packaging constraints. Confusing: mapping a 1v1 fighter to four hub seats. Hardest: integrating combat polish with reliable multiplayer. Additional test: two physical DualSense controllers at TV distance over residential networks.

These details also appear in About/Credits and the HTML’s opening comment.