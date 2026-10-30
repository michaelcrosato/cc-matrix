Built **A Masterful Mistake**.

[Download the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v6__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/A-Masterful-Mistake-Master-of-Magic-gpt-6-astra-xhigh-20261029-1107.html) · [Run instructions and source guide](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v6__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/A-Masterful-Mistake-Master-of-Magic-gpt-6-astra-xhigh-20261029-1107/README.md)

Includes two realms, city development, research, diplomacy, persistent armies, tactical battles, campaign endings, autosaves, and attract mode. Serve through HTTPS or localhost; WebGPU and internet access are required.

**Source information:**

- **Date:** 2026-10-29 12:15 PDT.
- **Source:** Master of Magic.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, JavaScript/HTML/CSS; AI Hub client 1.3.0.
- **Art:** Original cel-shaded, sculpted hex dioramas.
- **Animation:** Procedural movement, attacks, projectiles, and physics-driven debris.
- **Audio:** Original code-written music, effects, and synthesized gibberish voices.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) supports 1–4-player parallel challenges; standalone supports 2–4-player local challenges.
- **Environment:** Codex CLI, headless Linux; target browser unknown. Tested using Chromium 153 under Xvfb.
- **Model:** OpenAI gpt-6-astra, reasoning effort xhigh.
- **Usage:** API cost and tokens unknown; approximately 70 minutes.

**Testing feedback:** All **128 checks passed**, covering campaign completion, controller input, saves, attract mode, multiplayer sessions, departure handling, and entry/error screens. Testing and review found six issues, including two game-breaking issues; all were fixed. The complete campaign test was most helpful. Syntax-only checking was least helpful. Testing remained functional and visual, without FPS targets.

**Engine feedback:** The scene graph and toon materials worked particularly well. Headless compositor artifacts initially looked like shader faults. The most important custom system was the campaign/tactical state model. GPU resource lifetimes across scene transitions were hardest. I would overhaul implicit fallback behavior and add clearer resource-lifecycle validation.

**Prompt feedback:** The art, audio, and controller constraints provided clear direction. “Feature-complete successor” versus “vertical slice” left the scope ambiguous. Making strategic depth readable through one controller model was hardest. The additional test I’d choose is a complete physical-DualSense campaign across two real AI Hub clients.

These details are also included in the game’s credits and top-of-file HTML comment.