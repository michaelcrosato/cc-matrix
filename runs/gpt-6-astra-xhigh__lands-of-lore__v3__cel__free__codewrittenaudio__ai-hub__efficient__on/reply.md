Created **[Lands of Lute: The Throne of Discord](</home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Lands-of-Lute-The-Throne-of-Discord-Lands-of-Lore-The-Throne-of-Chaos-gpt-6-astra-xhigh-20261029-1120.html>)** — a single HTML file, approximately 147 KiB.

Includes three regions, party combat, spells, puzzles, equipment, merchants, saves, two endings, controller menus, multiplayer challenges, and attract mode. Serve through HTTPS or localhost; WebGPU and internet access for CDN dependencies are required.

**Source information**

- **Date:** 2026-10-29 11:20 PDT.
- **Source:** Lands of Lore: The Throne of Chaos.
- **Title:** Randomly selected using `crypto.randomInt` from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Procedural cel-shaded fantasy with faceted scenery and illustrated portraits.
- **Animation:** Procedural character poses, weapon movements, environmental animation, and particles.
- **Audio:** Code-written music, synthesized effects, and gibberish voices.
- **Online:** AI Hub parallel challenges and standalone WebRTC rooms for 1–4 players; local companion control for up to three controllers.
- **Environment:** Codex CLI, headless Linux/WSL2; tested with Chrome 154.0.8037.57.
- **Model:** OpenAI, gpt-6-astra, reasoning effort xhigh.
- **Usage:** API cost and token count unknown; approximately 50 minutes elapsed.

**Testing feedback**

Efficient targeted checks passed: **31 gameplay assertions, 24 AI Hub checks, and four real WebRTC checks**, plus save-protection and attract-exit regressions. Five game/UI issues and one browser-capture issue were corrected; **one was critical**, involving missed controller presses.

The AI Hub harness was most helpful. The initial startup smoke test was least helpful because backend creation alone didn’t establish visible rendering. Physical DualSense and cross-network hardware testing remain unverified; performance optimization was outside scope.

**Engine feedback**

Scene graphs and TSL were the strongest tools. Headless Vulkan capture and unlit shadow receivers required correction. The main custom work was the party, quest, inventory, save, and controller framework. Coordinating physics and responsive input was hardest. I’d make automatic renderer fallback opt-in and improve WebGPU device diagnostics.

**Prompt feedback**

The clear source, controller philosophy, and deployment format were especially useful. “Feature-complete demo” and multiplayer mode left scope open to interpretation. The hardest task was making the systems form a coherent adventure. The most useful additional test would be a complete physical-controller playthrough across two devices and networks.

These notes are also included in **About/Credits** and the HTML’s opening comment.