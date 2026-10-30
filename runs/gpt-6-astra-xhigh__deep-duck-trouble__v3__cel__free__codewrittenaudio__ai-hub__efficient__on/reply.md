[Download **Duck Luck Trouble**](./Duck-Luck-Trouble-Deep-Duck-Trouble-Starring-Donald-Duck-gpt-6-astra-xhigh-20261029-1111.html)

Four chapters, kick puzzles, secrets, a chase, a boss, couch co-op, and a looping attract mode. Serve over localhost or HTTPS; WebGPU and internet access are required.

**Source Information**

- **Date:** 2026-10-29 11:52 PDT.
- **Inspiration:** [Deep Duck Trouble Starring Donald Duck](https://www.mobygames.com/game/23492/deep-duck-trouble-starring-donald-duck/).
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio.
- **Art:** Procedural cel-shaded dioramas, outlines, and shadows.
- **Animation:** Procedural character rigs, gait, kick, and glide poses.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) 1–4 player parallel rounds; standalone two-player couch co-op.
- **Environment:** Codex CLI (headless), Linux/WSL2; end-user browser unknown. Tested with Chromium 141 under Xvfb.
- **Model:** OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** 143.6K goal-tracked tokens; approximately 41 minutes. Full-session total, token breakdown, and USD cost unknown.

**Testing Feedback**

102 recorded checks passed. Testing and review found six implementation defects, including one controller-blocking issue; all were fixed. A separate screenshot-environment issue was resolved.

Most helpful: the official Hub harness. Least helpful: initial unconfigured headless screenshots. Physical DualSense hardware, human audio listening, and a full unassisted playthrough remain untested.

**Engine Feedback**

- **Liked most:** Toon materials and Rapier collision handling.
- **Got stuck:** Linux WebGPU capture and controller sampling tied to rendering.
- **Built myself:** Traversal, kicks, recovery, progression, and boss behavior.
- **Hardest:** Coordinating physics, input, and animation.
- **Would overhaul:** Implicit renderer fallback.
- **Would add:** A first-party platformer controller example.

**Prompt Feedback**

- **Liked most:** Clear source, art, controller, and attract-mode requirements.
- **Confusing:** The open-ended “all features” and designer-tool scope.
- **Hardest:** Completing the original game within one portable HTML.
- **Additional test:** Two people using physical PS5 controllers across different WebGPU devices.

The full feedback is also embedded in About/Credits and the HTML’s opening comment.