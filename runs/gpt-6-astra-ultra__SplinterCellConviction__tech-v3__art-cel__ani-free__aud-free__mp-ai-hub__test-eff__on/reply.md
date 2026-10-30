[Play **Splinter Signal: Disavowed**](./Splinter-Signal-Disavowed-Splinter-Cell-Conviction-gpt-6-astra-ultra-20261029-0952.html)

Single HTML, **2.94 MB**, with engines embedded. Requires WebGPU; serve through localhost or HTTPS. Includes the complete operation, controller menus, checkpoints, attract mode, and hosted co-op.

**Source Information**

- **Date:** 2026-10-29 09:52, America/Vancouver.
- **Source:** Splinter Cell: Conviction. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, JavaScript, HTML/CSS, Web Audio; esbuild 0.28.2.
- **Art / animation:** Procedural cel shading, ink outlines, articulated rigs and cinematic camera sequences.
- **Audio:** Original synthesized music/effects; browser speech synthesis where available.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) Session 1.3.0, hosted co-op for 1–4 players. Standalone play is solo.
- **Testing:** Efficient gameplay, networking and viewport checks; no FPS targets.
- **Environment:** Codex CLI (headless); Linux; browser unknown. Tests used Chromium and WebKit.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** Approximately **532K tracked tokens**, **39 minutes**. API cost and token breakdown: unknown.

**Testing Feedback**

All **130 gameplay/network checks passed**, plus phone, tablet, desktop, ultrawide and WebKit interface checks. Testing caught five issues, none game-breaking; all were fixed. Integration review separately corrected four potentially game-breaking co-op cases.

Most helpful: actual WebGPU gameplay screenshots and AI Hub conformance tests. Least helpful: syntax-only checks. Physical DualSense, real iOS Safari and remote internet devices remain untested. Targeted simulation tests suppressed recurring rendering after WebGPU initialization; rendered screenshots were checked separately.

**Engine Feedback**

Three.js’s procedural scene tools and Rapier’s character collision worked well. I initially mistook a headless Vulkan configuration problem for a rendering defect. The largest custom component was the connected stealth/combat/mission/network layer; keeping physics, camera, animation and visibility consistent was hardest. I would overhaul implicit renderer fallback and add a documented strict-WebGPU option with clearer diagnostics.

**Prompt Feedback**

The controller-first requirements, attract mode and single-file deliverable made the target clear. The multiplayer URL was ambiguous because it provides a session library rather than a public lobby. Integrating every system into one coherent operation was hardest. The next test would use physical DualSense controllers and two remote hardware-WebGPU devices.

These details are also included in **About/Credits** and the HTML’s opening comment.