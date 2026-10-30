Created **[Red Detour]( /home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Red-Detour-Red-Alarm-gpt-6.1-sol-ultra-20261029-0715.html)** — a complete single-file demo. [Editable sources and instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Red-Detour-Red-Alarm-gpt-6.1-sol-ultra-20261029-0715/README.md).

Serve over HTTPS or localhost. Requires WebGPU and internet access for CDN dependencies.

| Source information | Details |
|---|---|
| Date | 2026-10-29 07:15, America/Vancouver |
| Source | Red Alarm |
| Tech | Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio |
| Art direction | Original cel-shaded procedural 3D; coral, ivory, ink, mint |
| Animation | Articulated transforms, particles, interpolated cameras, recorded replay |
| Audio | Code-written music, effects, and synthesized animalese voices |
| Online | ai-hub client 1.3.0: 1–4-player parallel scoring; standalone two-player WebRTC duels |
| Testing | Lightweight headless Chrome 154 checks, synthetic controllers, controlled-clock physics, reduced-resolution visual checks |
| Environment | Codex CLI, headless Linux; player browser unknown |
| Model | OpenAI gpt-6.1-sol, reasoning effort ultra |
| Usage | Approximately 40 minutes; API cost and token totals unknown |

**Testing feedback:** Passed 10 gameplay checks, 72 official ai-hub assertions, and 7 integrated multiplayer checks. Testing and integration review caught six defects, including one blocking visibility issue; all were fixed. The most helpful test exercised real projectile collisions through mission completion and the attract loop. Syntax checks were least informative about gameplay. Physical PS5-controller testing remains unknown.

**Engine feedback:** Native toon materials and scene composition worked well. I initially guessed incorrectly about material support and encountered headless Vulkan configuration problems. The main custom system was the flight/combat framework with mission progression and replay. Coordinating renderer startup, physics, and cameras was hardest. I would replace implicit backend fallback with an explicit policy and improve versioned material diagnostics.

**Prompt feedback:** The distinctive source and controller-first requirements gave clear direction. Multiplayer’s intended structure was ambiguous; this demo uses parallel score attack. Completing flight, combat, replay, and networking in one file was hardest. The additional test I would choose is a full physical DualSense sortie, including reconnection and both inversion toggles.

All source information and feedback also appear in-game and in the HTML’s opening comment.