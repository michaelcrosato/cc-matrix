Built **[Star Frolicier — single HTML file](./Star-Frolicier-Star-Parodier-gpt-6-astra-max-20261029-0952.html)**.

Includes three ships, three acts, two bosses, weapon upgrades, party bombs, a two-minute dash, attract mode, saved records, and AI Hub co-op. Serve through localhost or HTTPS; WebGPU and CDN access are required.

**Source information:** 2026-10-29 11:01 PDT. Inspired by [Star Parodier](https://www.pcengine.co.uk/HTML_Games/Star_Parodier.htm).

- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, esbuild 0.25.11.
- **Art:** Original cel-shaded 3D models, ink outlines, pastel scenery.
- **Animation:** Procedural animation, particles, fixed-step physics.
- **Audio:** Original synthesized music and effects; no spoken voice.
- **Online:** Shared co-op for 1–4 through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0.
- **Testing:** Targeted gameplay, controller, multiplayer, phone/tablet/desktop/ultrawide, and WebKit compatibility checks.
- **Environment:** Codex CLI (headless); Linux; browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 68 minutes. API cost and token usage: unknown.

**Testing feedback:** Seven game/UI issues were fixed, including two critical issues: a first-shot physics crash and missed controller presses during heavy frames. All 149 automated assertions passed. The four-player hub harness was most helpful. Initial screenshots using incorrect GPU capture flags were least helpful. Physical controllers and real iOS Safari remain untested.

**Engine feedback:** Scene graphs and TSL worked well for the toy-like art. I initially used the wrong Rapier descriptor method. The main custom work was the shooter simulation and co-op synchronization; coordinating physics, prediction, and snapshots was hardest. I would overhaul implicit renderer fallback and provide a public strict-WebGPU initialization/recovery path.

**Prompt feedback:** The source reference, controller-first design, and attract requirement gave clear direction. The hub’s fallback guidance needed reconciling with WebGPU-only rendering. The hardest part was completing both the arcade slice and shared co-op. One additional test would be four physical DualSense controllers across separate networks, including real Safari.

The requested information and feedback are also embedded in the HTML comment and in-game credits.