[**Play The Golden Reckoning**](./The-Golden-Reckoning-Golden-Axe-II-gpt-6.1-sol-xhigh-20261029-0836.html)

Completed single-file demo, 2.97 MiB: five chapters, three heroes, combos, parries, throws, charged spells, rideable beasts, camp blessings, revival, a final boss, co-op, and a looping attract mode. **WebGPU required.**

**Source Information:** Date: 2026-10-29 08:36, Vancouver. Inspiration: Golden Axe II.

- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1; esbuild 0.25.12.
- **Art:** Procedural cel-shaded geometry with ink outlines.
- **Animation:** Code-driven articulated character rigs.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** Host-authoritative AI Hub and standalone WebRTC co-op; local co-op also supported.
- **Testing parameters:** Lightweight browser, simulation, controller, and network checks; performance targets excluded.
- **Environment:** Codex CLI, headless Linux/WSL2; tested using Chrome 154 under Xvfb. Your browser: unknown.
- **Model:** OpenAI gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** Cost and token totals unknown; session approximately 38 minutes.

**Testing Feedback:** Fixed six game issues, four potentially game breaking. Final verification passed 14 mechanics assertions, all five campaign chapters, attract/controller checks, and 73 official hub checks covering two players, four players, and a server-only host. Most helpful: the campaign simulation, which caught a lethal-throw crash. Least helpful: initial captures with unsuitable headless GPU flags. Standalone room play succeeded; a later public-signaling attempt timed out. Physical DualSense hardware and real WAN conditions remain untested.

**Engine Feedback:** Best: Three.js scene composition and Rapier contacts. Wrong turns: physics object lifetimes, wave timing, and browser launch flags. Largest custom system: combat and shared-world networking. Hardest: reconciling predicted movement with authoritative combat. I would overhaul renderer capability/error reporting and add built-in simulation-clock and network-interpolation primitives.

**Prompt Feedback:** Best: the specific inspiration and clear technical constraints. Confusing: the boundaries of “all features” and “normal designer tools”; encounters and heroes are editable data here. Hardest: polishing the single-file game across both multiplayer transports. One additional test: four physical DualSense controllers over a delayed WAN connection, including disconnects and revivals.

All feedback is also included in the credits and opening HTML comment.