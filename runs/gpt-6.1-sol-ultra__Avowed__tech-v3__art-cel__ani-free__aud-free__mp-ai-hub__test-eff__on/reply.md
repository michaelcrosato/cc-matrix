Created **[Avow the Garden — single HTML file](./Avow-the-Garden-Avowed-gpt-6.1-sol-ultra-20261029-1459.html)**.

Includes sword-and-spell combat, two loadouts, companion support, upgrades, three shrines, three endings, persistent saves, co-op, and the 10-second attract demo. Serve over HTTPS or localhost in a WebGPU-capable browser.

**Source information:** 2026-10-29 15:26, Vancouver. Inspiration: Avowed. Title randomly selected from 50 candidates. Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub client 1.3.0, esbuild 0.25.12. Procedural cel-shaded art and articulated animation; synthesized adaptive music/effects; optional device speech, voice unknown. Internet co-op uses [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub); standalone rooms connect same-device tabs.

Environment: Codex CLI headless, Linux; target browser unknown. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Session approximately 27 minutes; API cost and token usage unknown.

**Testing feedback:** Testing and review caught **15 issues, including 2 potentially game-breaking defects**, all fixed. Gameplay **11/11**, regressions **7/7**, and multiplayer checks **97/97** passed. Lightweight checks covered keyboard, emulated DualSense, responsive layouts, and WebKit’s unsupported-WebGPU experience. Real iOS Safari and physical controllers were unavailable. Most helpful: the WebGPU gameplay-to-ending test. Least helpful: initial software-GPU flags that produced a false white canvas.

**Engine feedback:** Best: node materials and Rapier movement. Initial stumbling points: implicit renderer fallback and headless GPU configuration. Most important custom system: shared combat, quests, progression, and saves. Hardest: coordinating rendering, input, and multiplayer authority. I would overhaul implicit fallback and add a first-party controller/input starter.

**Prompt feedback:** Best: controller-first direction and creative freedom. Unclear: the boundary of “feature-complete” and the target hardware. Hardest: making combat, narrative consequences, and co-op cohesive. Additional desired test: a complete remote playthrough with four real PS5 controllers.

These details are also recorded in the HTML comment and in-game credits.