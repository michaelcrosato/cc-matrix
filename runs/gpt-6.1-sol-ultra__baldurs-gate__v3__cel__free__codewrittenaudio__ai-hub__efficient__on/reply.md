[**Play Baldur’s Errand**](./Baldurs-Errand-Baldurs-Gate-gpt-6.1-sol-ultra-20261029-0709.html) — complete, self-contained HTML, 2.93 MiB.

Four companions, tactical combat, branching dialogue, exploration, shops, talents, saves, two endings, co-op, and looping attract mode. [Development files and controls](./Baldurs-Errand-Baldurs-Gate-gpt-6.1-sol-ultra-20261029-0709/README.md).

**Source information:** Date: 2026-10-29 07:42, America/Vancouver. Inspiration: **Baldur’s Gate**. Title randomly selected from 50 candidates.

- **Tech:** Three.js r180, strict WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio API, ai-hub-session 1.3.0.
- **Art/animation:** Procedural cel-shaded 3D; articulated character animation, environmental motion, and spell particles.
- **Audio:** Original synthesized adaptive music, effects, and Animalese-style gibberish voices.
- **Online:** AI Hub and local co-op for 1–4; direct WebRTC for two.
- **Environment:** Codex CLI, headless Linux/WSL2; tested Chrome 154; your browser unknown.
- **Model/usage:** OpenAI gpt-6.1-sol, ultra reasoning. Approximately 33 minutes; API cost and token totals unknown.

**Testing feedback:** Six test-caught issues, three critical, plus sixteen review findings, six critical—all fixed. All **73 official multiplayer checks passed**, alongside lightweight gameplay, audio, controller simulation, saving, and attract checks. Most helpful: the multiplayer harness exposed input scheduling failures. Least helpful: source-only syntax checks missed packaging errors. Physical controllers and cross-network WebRTC remain unverified.

**Engine feedback:** Toon materials and scene composition worked well. Automatic WebGL fallback initially required correction. The main custom work was party tactics, quests, controller focus, and shared authority; coordinating those systems was hardest. I would overhaul automatic fallback and add a public strict-WebGPU initialization option.

**Prompt feedback:** The concrete controller and packaging requirements were helpful. “Complete successor” versus “vertical slice” left the scope boundary ambiguous. Integrating party tactics and co-op was hardest. My additional test would use physical DualSense controllers across four clients and separate networks.

These details are also embedded in **About/Credits** and the HTML’s opening comment.