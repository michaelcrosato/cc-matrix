Built **Road Ruckus**, randomly selected from 50 titles.

[Single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v17__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road-Ruckus-Road-Rash-II-gpt-6-astra-ultra-20261029-1049.html) · [Gameplay preview](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v17__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Road-Ruckus-Road-Rash-II-gpt-6-astra-ultra-20261029-1049/test-artifacts/gameplay-readback.png)

Serve through **HTTPS or localhost**. Requires WebGPU; dependencies load from CDNs.

Includes three escalating heats, motorcycle combat, weapon theft, traffic, police, jumps, crash recovery, persistent garage upgrades, controller menus, attract mode, and multiplayer.

**Source information**

- **Date/source:** 2026-10-29 10:49 build stamp; completed 11:23. Inspired by Road Rash II.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API.
- **Art/animation:** Procedural cel-shaded scenery; articulated riders, leaning, punches, wheelies, jumps, and recovery.
- **Audio:** Original synthesized surf-punk music, engine/effects, and gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) sessions and standalone PeerJS 1.5.5/WebRTC rooms for 1–4 players.
- **Environment/model:** Codex CLI, headless Linux; runtime browser unknown. Tested with Chrome 154. OpenAI gpt-6-astra, ultra reasoning.
- **Usage:** API cost and token count unknown; approximately 33 minutes through validation.

**Testing feedback:** Efficient, lightweight testing passed **29/29 gameplay checks** and **112/112 hub checks**. Five observed issues were fixed; one was critical—the dependency URL prevented startup. Most helpful: the multiplayer hub harness. Least helpful: the adapter-only WebGPU probe. Visual review used GPU readback because this headless browser captured WebGPU canvases incorrectly. Physical controllers, cross-device NAT, and audible playback remain unverified.

**Engine feedback:** Best features were procedural scene composition, toon materials, and Rapier contacts. I initially guessed the Rapier module filename incorrectly. The main custom work was motorcycle handling and combat; the hardest integration was curved-road rendering with fixed-step physics and network rivals. I would overhaul implicit renderer fallback and add controller-focus navigation helpers.

**Prompt feedback:** The concrete creative and delivery constraints were useful. “Feature-complete demo” left the content boundary open to interpretation. Combining combat, physics, controller UX, and two online transports was hardest. The next most valuable test would use four physical controllers on separate devices over a real WAN, with audio listening.

These details are also embedded in the HTML’s opening comment and in-game About screen.