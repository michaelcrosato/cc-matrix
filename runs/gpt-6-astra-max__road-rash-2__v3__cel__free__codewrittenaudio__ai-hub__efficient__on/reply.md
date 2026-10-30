Created **[Throttle Tantrum](./Throttle-Tantrum-Road-Rash-II-gpt-6-astra-max-20261029-0947.html)** — a self-contained **3.41 MiB HTML game**. Requires WebGPU.

Includes combat racing, traffic, police, jumps, pickups, garage upgrades, saves, controller menus, AI attract mode, and multiplayer. Source information and feedback are embedded in About/Credits and the HTML’s opening comment.

**Source information:** Road Rash II; 2026-10-29 09:47, Vancouver. Title randomly selected from 50 candidates. Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.3.0, esbuild 0.28.2. Procedural cel-shaded art, articulated rider animation, synthesized music/SFX, and gibberish voices. Supports 1–4 AI Hub seats and 2–4 standalone players.

Environment: Codex CLI (headless), Linux; browser unknown. Verification used Chrome 154 under Xvfb. Model: OpenAI, gpt-6-astra, reasoning effort max. API cost and tokens: unknown; session approximately 100 minutes.

**Testing feedback:** Simulation, controller/keyboard, persistence, attract-mode, 2–4-player hub, host-departure, and live two-browser PeerJS tests passed. Six product issues were fixed, including two critical issues; two test-setup issues were also resolved. Most helpful: the four-player hub harness. Least helpful: initial headless screenshots that failed to display WebGPU output.

**Engine feedback:** Procedural geometry and cel shaders worked well. I got stuck on browser capture and shader readiness. The main custom systems were arcade motorcycle combat and race replication. Synchronizing collisions, controls, and finish order was hardest. I would overhaul implicit renderer fallback and add a complete vehicle/networking example.

**Prompt feedback:** The concrete controller, attract-mode, and multiplayer requirements were useful. The hub’s fallback recommendation conflicted with the explicit WebGPU-only requirement, which took precedence. Integrating everything into a coherent vertical slice was hardest. The most valuable additional test would be four people using physical DualSense controllers on different devices over a poor internet connection.