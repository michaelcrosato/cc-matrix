[**Download Star Kooky Comet — single HTML**](./Star-Kooky-Comet-Star-Parodier-gpt-6.1-sol-ultra-20261029-1519.html)

Complete demo with three craft, three upgradeable weapons, two bosses, dash, grazing, confetti bursts, score attack, local co-op, Hub co-op, and looping attract mode. WebGPU required; engine dependencies load from CDN.

**Source Information**

- Date: 2026-10-29 15:19
- Inspiration: [Star Parodier](https://en.wikipedia.org/wiki/Star_Parodier). Title randomly selected from 50 candidates using Python `secrets`.
- Tech: Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, HTML/CSS/JavaScript.
- Art/animation: original procedural cel-shaded models, outlines, banking, bobbing, and confetti particles.
- Audio: original synthesized music and effects; no voice.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) host-authoritative co-op for 1–4 players.
- Environment: Codex CLI (headless), Linux; authoring browser unknown. Tested Chromium and WebKit.
- Model: OpenAI, gpt-6.1-sol, reasoning effort ultra.
- Usage: cost and tokens unknown; approximately 19 minutes.

**Testing Feedback**

Nine noncritical issues caught and fixed; zero game-breaking issues. The full stage and all boss phases passed, alongside controller, collision, audio, attract, and responsive checks. Hub testing passed **97/97 checks**, followed by a **24/24** targeted repeat.

Most helpful: the bad-network multiplayer harness. Least helpful: initially blank headless GPU screenshots. WebKit checked capability/settings screens; real iOS Safari was unavailable.

**Engine Feedback**

- Liked most: toon materials and the flexible scene graph.
- Wrong assumption: successful headless GPU initialization meant useful screenshots.
- Main custom system: combat, stage direction, and network replication.
- Hardest part: coordinating physics lifecycles with responsive multiplayer.
- Overhaul: automatic renderer fallback.
- Desired change: an explicit “require WebGPU” constructor option.

**Prompt Feedback**

- Liked most: the controller-first arcade direction and attract requirement.
- Confusing: the multiplayer URL describes Hub sessions rather than standalone rooms.
- Hardest: completing gameplay, presentation, networking, and packaging together.
- Additional test: physical DualSense play across four real devices, including Safari.

All feedback is also embedded in **About** and the HTML’s opening comment.