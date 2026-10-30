Built **Vaulting Vanilla!**

[Download the single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Vaulting-Vanilla-Jumping-Flash-2-gpt-6.1-sol-xhigh-20261029-0824.html) · [Development files and instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Vaulting-Vanilla-Jumping-Flash-2-gpt-6.1-sol-xhigh-20261029-0824/README.md)

Includes four courier rescues, triple jumps, aerial combat, checkpoints, a three-phase boss, controller menus, looping attract mode, and multiplayer races. Serve through localhost or HTTPS; WebGPU and internet access for CDN dependencies are required.

- **Source information:** 2026-10-29 08:24 PDT. Inspired by *Jumping Flash! 2*. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Session Protocol v1.
- **Art, animation, audio:** Cel-shaded procedural geometry; procedural character, camera, and particle animation; code-written music, synthesized effects, and gibberish voices.
- **Online:** AI Hub races for 1–4 players; standalone room-code WebRTC races for 2–4.
- **Environment/model/usage:** Codex CLI headless; Linux; browser unknown. OpenAI gpt-6.1-sol, xhigh. Cost and tokens unknown; session approximately 35 minutes.
- **Testing feedback:** Efficient headless Chrome/WebGPU checks passed for mechanics, controller input, attract mode, multiplayer, and disconnects. Hub tests used 150 ms latency, 50 ms jitter, and 5% loss. Testing caught **5 issues, including 1 game-breaking issue; all fixed**. Most helpful: screenshot testing caught incorrect rendering without JavaScript errors. Least helpful: syntax-only checking.
- **Engine feedback:** Best parts were scene composition and reliable physics contact. GPU initialization required correction. The main custom systems were aerial movement, camera behavior, menus, and race adapters. Landing readability was hardest. I would overhaul implicit fallback behavior and add a public strict-WebGPU option.
- **Prompt feedback:** The source and controller direction were useful. “Feature-complete engine” left the content boundary unclear. Combining first-person platforming and multiplayer in one file was hardest. The additional test I’d want is four physical DualSense controllers across separate home networks.

The HTML’s opening comment and in-game About screen also contain the requested reports.