Created [**Avowbreaker — The Roots Remember**](./Avowbreaker-Avowed-gpt-6.1-sol-high-20261029-1532.html), a single-file fantasy RPG demo with elemental combat, companion abilities, exploration, progression, saving, two persistent endings, attract mode, and AI Hub sessions.

Serve over **HTTPS or localhost**. Requires WebGPU and internet access for pinned dependencies.

**Source Information:** Date: 2026-10-29 15:32, America/Vancouver. Inspiration: [Avowed](https://avowed.obsidian.net/). Tech: Three.js R180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.3.0. Art: procedural cel shading and ink outlines. Animation: procedural character and weapon rigs, particles, scripted replay. Audio: original synthesized music/effects; optional device narration, voice unknown. Online: parallel scored expeditions for 1–4 players. Environment: Codex CLI, headless Linux; end-user browser unknown. Model: OpenAI gpt-6.1-sol, high reasoning. Cost and tokens: unknown; session approximately 25 minutes.

**Testing Feedback:** 33 integration checks and 72 AI Hub checks passed. Inspected phone, landscape, tablet, desktop, and ultrawide screenshots. WebKit menus and unsupported-WebGPU handling passed; native Safari gameplay remains untested. Testing caught **7 issues, including 2 launch blockers; all corrected**. Most helpful: actual WebGPU startup testing. Least helpful: initial captures with unsuitable graphics flags.

**Engine Feedback:**

- Liked: Three.js composition and TSL material expressions.
- Got stuck: missing import alias and headless graphics configuration.
- Most important custom work: connected combat, quests, progression, saving, and controller menus.
- Hardest: coordinating input, collisions, and animation.
- Overhaul: automatic renderer fallback.
- Desired change: stronger character-controller and gameplay-authoring tools.

**Prompt Feedback:** The creative freedom, explicit stack, and attract requirement were useful. Multiplayer scope was ambiguous; I selected the hub’s documented parallel mode. The hardest part was connecting the RPG systems within one portable file. The additional test I’d choose: physical DualSense play on a television, plus native Safari WebGPU.

These details are also included in the in-game credits and the HTML’s opening comment.