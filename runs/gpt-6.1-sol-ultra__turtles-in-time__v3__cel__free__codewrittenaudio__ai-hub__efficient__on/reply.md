[Play **Turtle Time Trouble** — single HTML file](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Turtle-Time-Trouble-Turtles-in-Time-gpt-6.1-sol-ultra-20261029-0801.html)

Includes three eras, nine encounters, a three-phase boss, four-player co-op, and looping attract mode. Requires WebGPU and internet access for CDN dependencies.

**Source Information:** Date: 2026-10-29 08:01. Inspiration: *Turtles in Time*. Tech: Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API and Web Audio. Art: procedural cel shading and ink outlines. Animation: articulated procedural rigs with physical jumps, throws and debris. Audio: original synthesized music, effects and gibberish voices. Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) session 1.3.0, manual-code WebRTC, local browser rooms and couch co-op. Environment: Codex CLI, headless Linux/WSL2; player browser unknown, tested Chrome 154. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Cost and token usage: unknown; session approximately 34 minutes.

**Testing Feedback:** Lightweight testing passed 15/15 functional scenarios, 49/49 official Hub checks, and the packaged-file smoke test. Testing caught nine issues, including five game-breaking issues; all fixed. Most helpful: complete campaign progression and Hub tests with latency and packet loss. Least helpful: native WSL canvas screenshots, which required GPU readback.

**Engine Feedback:** Best: expressive TSL cel shading. Stuck: unreliable headless canvas capture. Most important custom system: combat and encounter progression. Hardest: coordinating physics, animation and online responsiveness. Overhaul: implicit WebGL fallback. Desired addition: a first-party character/combat framework.

**Prompt Feedback:** Best: clear arcade inspiration and controller-first direction. Unclear: target duration and standalone signaling service. Hardest: completing multiplayer and polish in one portable file. Additional test: four physical PS5 controllers and remote players across mixed browsers and hardware.

These notes are also embedded in About/Credits and the HTML’s opening comment.