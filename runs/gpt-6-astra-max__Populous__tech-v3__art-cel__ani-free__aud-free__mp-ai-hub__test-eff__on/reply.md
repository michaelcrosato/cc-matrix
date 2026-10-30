[Download **Populora Worlds**](</home/micha/dev/cc-matrix/runs/gpt-6-astra-max__Populous__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Populora-Worlds-Populous-gpt-6-astra-max-20261029-0952.html>)

The single HTML includes sculptable terrain, growing settlements, eight miracles, champions, rival AI, shrine conquest, victory/defeat, autosaves, workshop mode, controller settings, and looping attract mode. Serve through localhost or HTTPS in a WebGPU-capable browser. Dependencies download from CDNs.

**Source information** is also embedded in About/Credits and the opening HTML comment.

- **Date:** 2026-10-29 09:52 PDT. **Source:** Populous.
- **Title:** Randomly selected from 50 candidates using Python’s secure random generator.
- **Tech:** Three.js r180; WebGPU only; Rapier 0.19.3; Gamepad API; Web Audio; HTML/CSS/JavaScript; esbuild 0.25.12.
- **Art:** Procedural cel-shaded islands, miniature villages, and stone guardians.
- **Animation:** Procedural movement, interpolated followers, particles, animated water, and physical debris.
- **Audio:** Original synthesized music and effects; no voices.
- **Online:** 1–4-player cooperative [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), client 1.3.0.
- **Testing scope:** Focused simulation, browser, viewport, and multiplayer checks; no FPS target.
- **Environment:** Codex CLI, headless Linux; player browser unknown. Tested Chromium and WebKit.
- **Model:** OpenAI gpt-6-astra, reasoning effort max.
- **Usage:** Cost and token count unknown; approximately 60 minutes.

**Testing feedback:** Seven issues were found and fixed; two were potentially game-breaking: stalled endgames and missed primary input during rendering. Nine simulation checks, nine browser-flow checks, and 121 multiplayer conformance checks passed. Screenshots were inspected across phone, tablet, laptop, and ultrawide layouts.

The most helpful test was the multiplayer harness with emulated DualSense input and adverse networking. The least helpful was the initial graphics smoke test before correcting its software-GPU flags. WebKit verified compatibility messaging and layouts; real Safari, physical controllers, and live internet multiplayer remain untested.

**Engine feedback:**

- **Liked most:** Three.js scene composition and toon materials.
- **Got stuck:** Headless GPU configuration and input polling coupled to rendering.
- **Built myself:** The terrain, settlement, belief, combat, and campaign simulation.
- **Hardest part:** Synchronizing terrain, navigation, physics, rendering, and multiplayer.
- **Would overhaul:** Implicit renderer fallback behavior.
- **Would change:** Add a documented WebGPU-only initialization path with clearer diagnostics.

**Prompt feedback:**

- **Liked most:** The clear inspiration and controller-first direction.
- **Confusing:** The multiplayer link specifies an integration protocol, rather than a hosted lobby.
- **Hardest part:** Completing the strategy loop and shared-world infrastructure in one portable file.
- **Additional test wanted:** Four physical controllers across separate WebGPU devices, including actual Safari, over an internet connection.