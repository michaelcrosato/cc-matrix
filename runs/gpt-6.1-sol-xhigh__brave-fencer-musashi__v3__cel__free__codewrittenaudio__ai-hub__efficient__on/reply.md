Built [**Bouncy Blade Mochi — The Stolen Morning**](./Bouncy-Blade-Mochi-Brave-Fencer-Musashi-gpt-6.1-sol-xhigh-20261029-0842.html).

Includes three areas, sword combos, borrowed powers, rescues, shops, checkpoints, a multi-phase boss, two-player couch co-op, ai-hub sessions, and looping attract play. Requires WebGPU and internet access for CDN dependencies.

**Source information**

| Field | Details |
|---|---|
| Date | 2026-10-29 09:30 |
| Source | Brave Fencer Musashi |
| Tech | Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio; JavaScript/HTML/CSS |
| Art | Procedural cel-shaded dioramas with ink outlines |
| Animation | Hierarchical rigs, procedural poses, squash/stretch and particles |
| Audio | Original synthesized music, effects and formant-based gibberish voices |
| Online | AI Hub protocol v1, client 1.3.0; 1–4 parallel sessions; standalone couch co-op |
| Testing | Lightweight browser, mechanics, controller, graphics and official hub-harness checks |
| Environment | Codex CLI, headless Linux; Chrome 154 with virtual display for testing; player browser unknown |
| Model | OpenAI gpt-6.1-sol, reasoning effort xhigh |
| Usage | API cost and tokens unknown; approximately 48 minutes |

**Testing feedback**

- **119 checks passed.** Testing caught three game issues, including two critical issues; all were corrected.
- Most helpful: GPU scene-transition diagnostics and the complete chapter mechanics test.
- Least helpful: initial screenshots using incorrect headless Vulkan settings.
- Physical DualSense/TV play and real remote sessions remain untested.

**Engine feedback**

- Best: Three.js’s scene graph and TSL made procedural cel art flexible.
- Wrong turns: an obsolete Rapier module path and incorrect disposal of shared sprite geometry.
- Most important custom work: the adventure, combat, persistence, party and controller-interface systems.
- Hardest: coordinating physics, animation, telegraphs and GPU resource ownership.
- Overhaul: implicit renderer backend fallback.
- Change: expose clearer ownership metadata for shared resources.

**Prompt feedback**

- Best: the spiritual reference, controller-first direction and single-file delivery.
- Confusing: the boundaries of “feature-complete engine” and standalone multiplayer topology.
- Hardest: making all systems form one coherent, complete chapter.
- Further test: a blind two-person television playthrough with physical DualSense controllers.

All feedback is also included in the in-game credits and the HTML’s opening comment.