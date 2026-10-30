Built [**Shells Out of Time — single HTML, 2.3 MB**](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Shells-Out-of-Time-Turtles-in-Time-gpt-6-astra-ultra-20261029-1045.html).

Three eras, nine encounters, upgrades, boss combat, 1–4-player co-op, and a looping attract mode. Requires WebGPU; serve over localhost or HTTPS. [Controls and development guide](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v14__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Shells-Out-of-Time-Turtles-in-Time-gpt-6-astra-ultra-20261029-1045/README.md).

**Source Information:** Date: 2026-10-29 10:45, America/Vancouver. Inspiration: *Turtles in Time*. Title randomly selected from 50 candidates. Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, AI Hub Client 1.3.0 and PeerJS 1.5.5. Original procedural cel-shaded art, articulated animation, code-composed music/effects and gibberish voices. Local, WebRTC and AI Hub co-op.

Environment: Codex CLI, headless Linux; target browser unknown, tested with Chrome 154. Model: OpenAI gpt-6-astra, ultra reasoning. API cost and tokens: unknown; session approximately 35 minutes.

**Testing Feedback:** Lightweight checks found and fixed eight issues, including one diagnostic-only simulation failure. Final smoke test: **17 assertions passed**. Full campaign, two-client networking and Hub lifecycle checks passed. Most helpful: complete AI playthrough. Least helpful: ordinary headless screenshots; WebGPU pixel readback verified rendering. Physical controllers, WAN conditions and hardware GPU presentation remain unverified.

**Engine Feedback:** Best feature: TSL cel shading. Got stuck on headless GPU capture. Most important custom system: combat and authoritative co-op. Hardest part: synchronizing physics, input and transitions. Would overhaul automatic fallback behavior; would add dependable headless frame capture.

**Prompt Feedback:** Best aspect: the arcade reference and controller focus. Ambiguity: the boundaries of “all features” and “complete engine.” Hardest requirement: integrating the full slice and multiplayer into one HTML. Additional desired test: four physical PS5 controllers across separate networked machines.

All requested information and feedback also appear in Credits and the HTML’s top comment.