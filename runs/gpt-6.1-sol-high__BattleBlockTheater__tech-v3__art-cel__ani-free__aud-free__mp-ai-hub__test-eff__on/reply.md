Built **[DabbleBlock Drama](./DabbleBlock-Drama-BattleBlockTheater-gpt-6.1-sol-high-20261029-1558.html)**: four acts, a boss finale, controller-first menus, online co-op, and automatic attract mode. The title was randomly selected from 50 candidates.

Serve the HTML through localhost or HTTPS. WebGPU and internet access for CDN dependencies are required. Development files and editable level data are in the matching subfolder.

**Source Information**

- **Date:** 2026-10-29 15:58, America/Vancouver.
- **Source:** BattleBlock Theater; original assets and dialogue.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API.
- **Art / animation:** Cel-shaded paper theater; procedural puppet rigs, squash/stretch, machinery and particles.
- **Audio:** Original synthesized music and effects; optional browser narration, voice unknown.
- **Online:** 1–4 player co-op through [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Testing:** Lightweight functional, controller, multiplayer and responsive-layout checks.
- **Environment:** Codex CLI (headless); Linux; browser unknown. Test engines: Chromium and WebKit.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort high.
- **Usage:** Cost and tokens unknown; approximately 20 minutes.

**Testing Feedback**

Six product issues were caught and fixed; one was game-breaking. Final checks passed: 25 gameplay/controller checks, 69 hub checks, six layout configurations, and automatic attract entry/interruption. The hub harness was most helpful; syntax-only checking was least helpful. Linux WebKit verified the requirement screen and settings, since it lacked WebGPU; real iOS Safari was unavailable.

**Engine Feedback**

Three.js’s scene graph was the strongest part. I initially guessed wrong about gradient format and texture disposal. Responsive movement and co-op authority were the most important custom systems; GPU resource lifetime across stages was hardest. I would overhaul implicit backend fallback and add a native WebGPU cel-outline material.

**Prompt Feedback**

The explicit stack, packaging and controller philosophy were helpful. Demo duration and exact mechanic coverage were less specific. Completing the campaign alongside responsive shared co-op was hardest. The additional test I’d choose is four people using physical DualSense controllers over a variable-latency connection.

These notes are also embedded in Credits and the HTML’s opening comment.