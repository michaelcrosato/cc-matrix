Created **[Beak First Trouble — single HTML](./Beak-First-Trouble-Deep-Duck-Trouble-Starring-Donald-Duck-gpt-6-astra-max-20261029-0944.html)**.

Includes five chapters, secrets, swimming, kicking puzzles, pepper rampages, a guardian chase, checkpoints, saves, attract mode, and multiplayer. Serve through HTTPS or localhost; CDN dependencies require internet access.

**Source Information:**  
Date: **2026-10-29 10:42**, America/Vancouver. Inspired by [Deep Duck Trouble Starring Donald Duck](https://www.smspower.org/Manuals/DeepDuckTrouble-GG-JP). Title randomly selected from 50 candidates using OS entropy.

- **Tech:** Three.js R180; WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio API; AI Hub client 1.3.0.
- **Art:** Original procedural, cel-shaded island scenery.
- **Animation:** Procedural character rigs, state-driven poses, squash/stretch, particles.
- **Audio:** Code-written music, synthesized effects, gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) parallel challenges for 1–4 players. Standalone supports 2–4-player pass-controller competition.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154 with software Vulkan and Xvfb. Your browser: unknown.
- **Model:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** API cost and token totals unknown; approximately 58 minutes.

**Testing Feedback:** 25 gameplay checks, 72 hub checks, and three device/error checks passed. Testing caught **five product issues, including three considered game-breaking; all were fixed**. Most helpful: lagoon GPU readback exposed underwater occlusion. Least helpful: initial headless screenshots failed to capture WebGPU reliably. No performance targets were tested.

**Engine Feedback:** Scene composition and toon materials worked well. I initially used an unsupported material property and encountered screenshot limitations. The most important custom system was the platforming/progression controller; coordinating physics, animation, and responsive input was hardest. I would overhaul implicit renderer fallback and add a public WebGPU-only initialization flag.

**Prompt Feedback:** The source, exact stack, and controller-first requirements were especially useful. Standalone multiplayer topology was unspecified, so I chose local competition alongside hub online play. The hardest task was fitting the varied mechanics into a complete single-file adventure. The additional test I’d choose is a real DualSense across two physical devices in a live hub session.

Metadata and feedback are also included in the HTML’s opening comment and in-game About screen.