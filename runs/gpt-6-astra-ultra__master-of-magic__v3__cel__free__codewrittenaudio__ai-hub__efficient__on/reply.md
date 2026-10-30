Built **Muster the Mages**.

[Open local preview](http://localhost:8776/Muster-the-Mages-Master-of-Magic-gpt-6-astra-ultra-20261029-1031.html) · [Single-file HTML](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v6__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Muster-the-Mages-Master-of-Magic-gpt-6-astra-ultra-20261029-1031.html)

Includes two realms, city development, research, tactical combat, diplomacy, relics, victory/defeat, saves, co-op, controller navigation, and a looping attract chronicle. Requires WebGPU and internet access for pinned dependencies.

**Source information**

- **Date:** 2026-10-29 10:31, America/Vancouver.
- **Source:** Master of Magic.
- **Tech:** Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC; esbuild 0.25.11.
- **Art:** Procedural cel-shaded fantasy dioramas and parchment interfaces.
- **Animation:** Hierarchical procedural animation, interpolated movement, animated scenery, physics debris.
- **Audio:** Original synthesized music, effects, and gibberish voices.
- **Online:** [ai-hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op and standalone WebRTC council. Direct connections have no TURN relay.
- **Testing:** Lightweight functional, browser, visual, and multiplayer checks; no performance targets.
- **Environment:** Codex CLI, headless Linux; tested Chrome 154. Player browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort ultra.
- **Usage:** Cost and token counts unknown; approximately 35 minutes.

**Testing feedback:** Eight simulation groups and **73/73 ai-hub checks passed**, alongside browser, save, attract, and touch-settings checks. Testing and integration review caught **17 issues, including two critical issues**, all corrected. Most helpful: the ai-hub harness. Least helpful: syntax-only checks. Physical-controller and remote-household testing remain unverified.

**Engine feedback:** Best: procedural scene composition and toon materials. Initial mistakes involved an unsupported material option and headless GPU capture settings. The main custom work was the strategy/tactical simulation and controller interface. Hardest: coordinating rendering with game state. I would overhaul implicit backend fallback and add an explicit WebGPU-only option with clearer diagnostics.

**Prompt feedback:** Best: the clear artistic direction and controller-first requirements. Multiplayer rules were ambiguous, so this implements shared-realm co-op. Hardest: combining strategic depth with readable couch-friendly controls. One additional test would be a remote ai-hub session using physical PS5 controllers.

This information is also embedded in About/Credits and the HTML’s opening comment.