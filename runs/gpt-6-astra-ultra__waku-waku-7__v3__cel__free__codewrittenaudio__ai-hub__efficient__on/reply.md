Created **[Waku Waku Zing — single HTML game](./Waku-Waku-Zing-Waku-Waku-7-gpt-6-astra-ultra-20261029-1039.html)** — 3.09 MB, with three fighters, seven campaign bouts, three arenas, guided training, couch/online versus, and attract mode.

Run through localhost or HTTPS in a WebGPU-enabled browser.

Source information:

- **Date:** 2026-10-29 10:39 build identifier.
- **Source:** Waku Waku 7.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1.
- **Art/animation:** Cel shading, outlines, shadows, articulated procedural animation.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** Two-player WebRTC rooms; 1–4-player AI Hub sessions.
- **Environment:** Codex CLI, headless Linux; tested with Chrome 154.
- **Model:** OpenAI gpt-6-astra, ultra reasoning.
- **Usage:** Cost and tokens unknown; approximately 25 minutes.

Testing feedback: Three rendering/UI defects were caught, including one startup-breaking issue; all were fixed. Three focused test suites, 11 interface/flow checks, 97 hub checks, and a final 25-check regression passed. GPU readback and screenshots were most helpful; initial blank compositor captures were least helpful. Physical controllers and separate-network connectivity remain untested.

Engine feedback: Scene composition, node shading, and Rapier’s physics integration worked well. Implicit fallback and black toon rendering required corrections. The largest custom system was combat; coordinating physics, animation, and networking was hardest. I would overhaul implicit fallback and add a supported WebGPU cel-shading recipe.

Prompt feedback: The creative reference, controller priorities, and packaging requirements were strongest. “Feature-complete” left roster and campaign size open. Combining the gameplay and online systems into one file was hardest. The additional test I would choose is a full match using physical DualSense controllers on two separate networks.

This information is also embedded in **About/Credits** and the HTML’s opening comment.