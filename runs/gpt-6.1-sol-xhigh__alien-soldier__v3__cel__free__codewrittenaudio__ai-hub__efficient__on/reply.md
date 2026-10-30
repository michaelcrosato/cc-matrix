[**Download Alien Firebrand**](./Alien-Firebrand-Alien-Soldier-gpt-6.1-sol-xhigh-20261029-0843.html) · [Build instructions](./Alien-Firebrand-Alien-Soldier-gpt-6.1-sol-xhigh-20261029-0843/README.md)

Complete single-file demo: three bosses, four weapons, training, checkpoints, attract mode, and co-op. Serve over HTTPS or localhost; WebGPU is required.

**Source Information**

- **Date:** 2026-10-29 08:43, Vancouver; session start.
- **Inspiration:** Alien Soldier. Title selected randomly from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, JavaScript/HTML/CSS.
- **Art:** Procedural cel-shaded 3D with ink silhouettes.
- **Animation:** Articulated procedural rigs, attack state machines, physics debris.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** AI Hub 1–4-player co-op; PeerJS 1.5.5/WebRTC rooms; two-controller couch co-op.
- **Environment:** Codex CLI, headless Linux; player browser unknown. Tested with Chrome 154.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** Cost and token totals unknown; session approximately 40 minutes.

**Testing Feedback**

Efficient browser checks caught **5 validation issues, including 2 critical issues**, all addressed. All 73 hub checks passed. Training, room synchronization, departures, settings, and the full attract loop passed. Functional tests omitted GPU draws; separate real WebGPU renders verified all three bosses.

Most helpful: the complete training checklist, which exposed the jump-state bug. Least helpful: syntax checking, which could not assess gameplay. Physical DualSense feel, speaker mix, and four-player internet conditions remain unverified.

**Engine Feedback**

Liked most: procedural geometry composition and Rapier contacts. Got stuck on headless WebGPU graphics interoperability. The largest custom systems were combat and multiplayer synchronization; separating local prediction from shared authority was hardest. I would overhaul implicit renderer fallback and add a documented strict-WebGPU initialization option.

**Prompt Feedback**

Liked most: the arcade focus, controller-first UX, and attract-mode requirement. “Feature-complete” left the content boundary ambiguous. The hardest part was combining coherent combat, original visuals/audio, and multiplayer in one file. The next test would be four physical DualSense players completing the operation over real internet connections.

These details are also included in the in-game credits and top HTML comment.