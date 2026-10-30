Created [**Goldfang: The Axe Oath — single HTML game**](./Goldfang-The-Axe-Oath-Golden-Axe-II-gpt-6.1-sol-ultra-20261029-0819.html).

Three heroes, three acts, beast riding, charged magic, parries, local/online co-op, and a looping attract demo. Requires WebGPU; dependencies download from CDN.

**Source information**

- Date: 2026-10-29 08:19, requested build label.
- Inspiration: Golden Axe II.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API.
- Art/animation: procedural cel shading, ink outlines, articulated procedural rigs.
- Audio: synthesized music, effects, and Animalese-style gibberish voices.
- Online: AI Hub co-op for 1–4; standalone WebRTC for two; local co-op for four.
- Environment: Codex CLI, Linux; verified using Chrome 154 and Xvfb. Player browser unknown.
- Model: OpenAI gpt-6.1-sol, ultra reasoning.
- Usage: cost/tokens unknown; approximately 30 minutes.

**Testing feedback**

Seven issues caught and fixed, including two critical issues: a syntax blocker and potential caster softlock. All heroes and four-player simulation completed the campaign. AI Hub checks passed 26/26, 24/24, and 24/24; standalone co-op passed 11/11.

Most helpful: full campaign physics simulation. Least helpful: syntax checking alone. Physical PS5 testing remains unverified.

**Engine feedback**

Liked: scene graphs and toon materials. Stuck: headless WebGPU presentation and an unsupported material option. Built: combat, AI, animation, and multiplayer systems. Hardest: synchronizing responsive combat with authoritative physics. Would overhaul implicit graphics fallback; would add a complete WebGPU game starter.

**Prompt feedback**

Liked the clear reference and controller focus. Campaign length was ambiguous. Combining every system into one file was hardest. The additional test would be a complete two-person playthrough with physical PS5 controllers across separate home networks.

These notes are also included in About/Credits and the HTML’s opening comment.