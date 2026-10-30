Built **Avow Much Trouble**—a self-contained, 3.18 MiB HTML game.

[Download the game](./Avow-Much-Trouble-Avowed-gpt-6-astra-max-20261029-0952.html) · [Development instructions](./Avow-Much-Trouble-Avowed-gpt-6-astra-max-20261029-0952/README.txt)

Includes paired combat, elemental puzzles, a companion, crafting, talents, saves, three endings, controller menus, and attract mode. Open in a WebGPU-capable browser. The title was randomly selected from 50 candidates.

The information below also appears in Credits and the opening HTML comment.

**Source information:**

- **Date:** 2026-10-29 10:57 PDT.
- **Source:** [Avowed](https://avowed.obsidian.net/).
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, JavaScript/HTML/CSS; esbuild 0.25.12.
- **Art:** Original procedural, cel-shaded 3D.
- **Animation:** Procedural character rigs, weapon poses, particles, and scripted replay.
- **Audio:** Original Web Audio music/effects; optional system speech. Installed voice unknown.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub), protocol v1/client 1.3.0; 1–4-player parallel expeditions.
- **Testing:** Lightweight progression, controller, WebGPU, responsive-layout, and WebKit checks; performance optimization excluded.
- **Environment:** Codex CLI (headless); Linux; host browser unknown.
- **Model:** OpenAI, gpt-6-astra, reasoning effort max.
- **Usage:** Approximately 65 minutes; API cost and token usage unknown.

**Testing feedback:** Seven findings: six corrected issues and one documented software-renderer timing limitation. One initial rendering failure was blocking. The progression-through-save-restoration test was most helpful; the adapter-only WebGPU probe was least helpful.

Isolated AI Hub checks passed **72/72**, with repeated rendering suspended after the first WebGPU frame. Continuous-render testing missed one brief controller press, and an ultrawide GPU screenshot timed out. Layout checks passed. Physical DualSense, real iOS Safari, and live remote-hub play remain unverified.

**Engine feedback:** Best features were toon materials and Rapier’s character controller. Wrong turns involved WebGPU presentation, mesh winding, and weapon scale. The largest custom system was the RPG/combat/quest/save layer. Aligning physics, camera, animation, and input was hardest. I would overhaul implicit renderer fallback and add a documented strict-WebGPU initialization/recovery contract.

**Prompt feedback:** The pinned stack, portable deliverable, and controller-first direction were useful. “All features” lacked a finite boundary, so I implemented a complete bounded expedition. Combining its systems into a coherent slice was hardest. My additional test would be a full television playthrough with a physical DualSense, including reconnects and axis inversion.