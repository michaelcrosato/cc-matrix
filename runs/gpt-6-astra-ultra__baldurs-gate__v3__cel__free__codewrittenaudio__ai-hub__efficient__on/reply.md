[**Play Badger’s Wake — single HTML file**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Badgers-Wake-Baldurs-Gate-gpt-6-astra-ultra-20261029-0952.html)

Built a four-companion adventure with tactical combat, branching dialogue, trading, talents, saves, three endings, co-op, and automatic attract mode. Requires WebGPU; no fallback.

**Source Information**

- **Date:** 2026-10-29 10:34, America/Vancouver.
- **Source:** Baldur’s Gate.
- **Tech:** Three.js r180, Rapier 0.19.3, WebGPU, Gamepad API, Web Audio.
- **Art:** Procedural cel-shaded 3D with ink contours.
- **Animation:** Articulated procedural rigs, spells, particles, and ambient motion.
- **Audio:** Code-composed music, synthesized effects, and gibberish voices.
- **Online:** 1–4 player AI Hub co-op; standalone WebRTC using PeerJS 1.5.5.
- **Testing:** Lightweight gameplay, browser, physics, audio, and network checks; no performance targets.
- **Environment:** Codex CLI, headless Linux; player browser unknown. Tested with Chrome 154.
- **Model:** OpenAI gpt-6-astra, reasoning effort ultra.
- **Usage:** Cost and tokens unknown; approximately 40 minutes.

**Testing Feedback:** Fixed six game/build issues, including one game-breaking packaging error, plus one browser-test configuration issue. Gameplay, four-player hub, playerless-host, standalone networking, and visual checks passed. Most helpful: browser gameplay and hub integration tests. Least helpful: syntax-only checks. An additional host-disconnection stress test timed out; real four-device play remains untested.

**Engine Feedback:** Three.js scene composition and Rapier collision worked well. Automatic renderer fallback and toon-material assumptions needed correction. The largest custom system was the party simulation and controller UI; coordinating tactical state with multiplayer ownership was hardest. I would overhaul implicit fallback selection and add an explicit strict-WebGPU option.

**Prompt Feedback:** The art direction and controller requirements were especially useful. “All features” left the scope open-ended. Combining narrative, tactics, and co-op in one file was hardest. My preferred additional test would be a human four-device session using real controllers.

These details are also embedded in **About/Credits** and the HTML’s opening comment.