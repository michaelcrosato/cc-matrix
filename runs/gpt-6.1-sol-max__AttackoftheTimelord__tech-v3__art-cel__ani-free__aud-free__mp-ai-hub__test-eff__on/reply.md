Built **[A Bad Time for Earth!](./A-Bad-Time-for-Earth-SOURCE-gpt-6.1-sol-max-20261029-1405.html)** — five encounters, upgrades, time abilities, a three-phase boss, looping attract mode, and AI Hub score attack.

Open the single HTML in a WebGPU-capable browser. Internet access downloads dependencies. [Development and rebuild instructions](./A-Bad-Time-for-Earth-SOURCE-gpt-6.1-sol-max-20261029-1405/README.md) are included.

**Source Information**

- **Date:** 2026-10-29 14:05
- **Source:** [Attack of the Timelord!](https://odyssey2.info/library/manuals/us_timelord/Attack%20of%20the%20Timelord%20%28USA%29.pdf)
- **Tech:** Three.js R180 / 0.180.0, WebGPU exclusively, Rapier 0.19.3, Gamepad API, HTML/CSS/JavaScript.
- **Art:** Procedural cel-shaded 3D with stepped lighting and ink outlines.
- **Animation:** Procedural formations, damped movement, physics, particles, and rewind history.
- **Audio:** Original synthesized music/effects; optional browser speech. Available voices: unknown.
- **Online:** [AI Hub](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md) protocol v1, client 1.3.0; 1–4-player parallel score attack.
- **Testing:** Lightweight functional, campaign, controller-emulation, hub, phone, tablet, ultrawide, and WebKit compatibility checks.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort max.
- **Usage:** USD cost and token totals unknown; approximately 30 minutes.

**Testing Feedback**

- Eight issues corrected during testing and review; zero confirmed game-breaking issues.
- Passed 35 functional/campaign checks and 72 hub checks.
- Most helpful: accelerated complete-campaign verification.
- Least helpful: syntax checking alone.
- WebKit compatibility UI passed; real Safari and physical controllers remain unverified.

**Engine Feedback**

- **Liked most:** TSL material graphs and Rapier collisions.
- **Got stuck:** Implicit renderer fallback and headless GPU configuration.
- **Built myself:** Encounter director, controller focus, rewind, and attract AI.
- **Hardest:** Camera and UI readability across aspect ratios.
- **Overhaul:** Implicit backend fallback.
- **Change:** Add an explicit WebGPU-only initialization option.

**Prompt Feedback**

- **Liked most:** Clear arcade identity and controller priorities.
- **Confusing:** Hub fallback guidance conflicted with mandatory WebGPU.
- **Hardest:** Pacing every mechanic within a complete demo.
- **Additional test:** Four physical DualSense controllers across separate devices, including real Safari.

All required feedback is also embedded in About/Credits and the HTML’s top comment.