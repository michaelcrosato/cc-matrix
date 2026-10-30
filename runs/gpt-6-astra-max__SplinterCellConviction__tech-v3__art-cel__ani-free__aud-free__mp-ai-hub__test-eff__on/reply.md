Built **[Splinter Cellar: Hard Evidence](/home/micha/dev/cc-matrix/runs/gpt-6-astra-max__SplinterCellConviction__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Splinter-Cellar-Hard-Evidence-SplinterCellConviction-gpt-6-astra-max-20261029-0952.html)**.

The self-contained **4.06 MB HTML** includes the solo mission, stealth/combat systems, checkpoints, attract replay, and co-op. Serve it over localhost or HTTPS in a WebGPU-capable browser. Development files are in the matching subfolder.

**Source information**

- **Date:** 2026-10-29 10:40, America/Vancouver.
- **Inspiration:** Splinter Cell: Conviction.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio; esbuild 0.25.11.
- **Art:** Procedural cel shading, ink outlines, industrial noir.
- **Animation:** Articulated procedural rigs, blended movement, vaults and cinematic executions.
- **Audio:** Original synthesized music/effects; optional browser-generated radio voice.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) shared-world co-op for 1–4 players; protocol v1, client 1.3.0.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown. Tested Chromium 153 and WebKit using Playwright 1.63.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** API cost unknown; tokens unknown; approximately 48 minutes.

**Testing feedback**

All **49 focused checks** and **five multiplayer harness scenarios** passed. Testing covered mission mechanics, controller/keyboard input, phones, tablets and wide screens. Simulated networking used 150 ms latency, 50 ms jitter and 5% loss.

Testing caught **five product/build issues**, including **two blockers**: attract-mode startup and embedded-font CSS parsing. All were fixed. Visual inspection of the packaged HTML was most helpful; checking WebGPU on `about:blank` was least helpful.

WebKit verified unsupported-device interfaces. Physical DualSense hardware, real iOS Safari and live multi-device Internet co-op remain untested.

**Engine feedback**

The toon materials were the strongest feature. Initial headless Vulkan settings produced blank captures, and automatic renderer fallback needed explicit disabling. The most important custom system was the stealth simulation. Coordinating physics, camera collision and shared-world authority was hardest. I would overhaul implicit fallback behavior and add a standard character/camera integration layer.

**Prompt feedback**

The source reference, controller philosophy and packaging requirements provided clear direction. The multiplayer URL required interpretation as a host protocol rather than matchmaking. Combining the complete mission, replay and co-op in one file was hardest. The most valuable additional test would be a four-player mission using physical DualSense controllers across separate devices.

These details are also included in **Credits** and the **HTML’s opening comment**.