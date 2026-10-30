Built **The Throne of Mild Chaos**, a first-person party adventure with exploration, combat, spells, equipment, puzzles, a final encounter, and a complete quest.

[Download the single HTML game](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The Throne of Mild Chaos-Lands of Lore The Throne of Chaos-gpt-6.1-terra-max-20261029-0908.html>)  
[Development files and build guide](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v15__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/The Throne of Mild Chaos-Lands of Lore The Throne of Chaos-gpt-6.1-terra-max-20261029-0908/README.md>)

Open the HTML in a WebGPU-capable browser with an internet connection to load its libraries. On a controller, use the left stick to move, right stick to look, Cross to strike, Square to interact, R2 to cast, and Options for settings. Solo progress saves locally. AI Hub and standalone room-code play support side-by-side score races for up to four players.

### Source information

- **Date:** 2026-10-29 09:08
- **Inspiration:** Lands of Lore: The Throne of Chaos
- **Tech:** Three.js r180 with WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5/WebRTC, and [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub)
- **Art and animation:** Original cel-shaded, low-poly storybook visuals with procedural character and effect animation
- **Audio:** Code-generated music, effects, and gibberish voices
- **Online:** AI Hub side-by-side sessions and standalone room-code multiplayer
- **Testing:** Lightweight checks; no FPS target. Headless Chrome 154 used software WebGPU.
- **Environment:** Codex CLI, headless Linux; deployment browser unknown
- **Model:** OpenAI gpt-6.1-terra, reasoning effort max
- **Usage:** Unknown

### Testing feedback

Testing caught **5 issues**, with **0 considered game-breaking**; they were corrected. The most helpful test was a scripted quest completion using normal actions and test warps. The least helpful was repeated screenshot testing while the software GPU was misconfigured.

The AI Hub harness passed one-player, two-player, and player-departure checks. Two standalone browser clients connected and shared scores. Controller input, the ward collision, spells, saves, attract mode, and the touch-only notice were also checked.

### Engine feedback

The most enjoyable part was making expressive scenes from simple geometry. The initial headless GPU flags and Rapier CDN path were wrong and needed correction. The most important custom work was the quest, controller menus, and encounters; WebGPU initialization and headless testing were the hardest parts. I would overhaul automatic fallback selection and add a public WebGPU-only option.

### Prompt feedback

The controller-first direction was the strongest part of the prompt. The standalone multiplayer scope left room for interpretation; fitting a complete quest and two multiplayer entry points into one file was the hardest part. One further test would be a full playthrough with four physical controllers on separate networks.