[Download **Amber Wrath** — single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Amber-Wrath-Golden-Axe-II-gpt-6-astra-ultra-20261029-1047.html)

Includes three heroes, nine encounters, charged magic, rideable beasts, upgrades, co-op, attract mode, and a three-phase boss. Requires WebGPU and internet access for dependencies.

**Source Information**

- Date: **2026-10-29 10:47**, America/Vancouver.
- Source: **Golden Axe II**. Title randomly selected from 50 candidates.
- Tech: Three.js **r180**, WebGPU exclusively, Rapier **0.19.3**, Gamepad API, Web Audio, PeerJS **1.5.5**, AI Hub protocol v1.
- Art/animation: Original cel-shaded procedural geometry, articulated rigs, combat poses, animated cloth and physics.
- Audio: Code-written music, effects and synthesized gibberish voices.
- Multiplayer: Four-player local/AI Hub; two-player standalone online rooms.
- Environment: Codex CLI, Linux; tested Chrome **154.0.8037.57** under Xvfb.
- Model: OpenAI **gpt-6-astra**, reasoning effort **ultra**.
- Usage: **424K tokens**, approximately **38 minutes**; API cost and token breakdown unknown.

**Testing Feedback**

All **73 hub checks passed**, alongside standalone controls, attract mode, combat mechanics and campaign completion. Browser/visual testing found **five issues**, including **one session-blocking initialization issue**; all were fixed. Most helpful: the four-player network harness. Least helpful: syntax checks alone. Physical controllers and geographically separated networks remain unverified.

**Engine Feedback**

Scene graphs and TSL worked especially well. Shader variants and cloned material colors required corrections. The main custom systems were combat, encounter progression and multiplayer replication; synchronizing physics, animation and authority was hardest. I would overhaul implicit rendering fallbacks and add maintained character-action/replication tooling.

**Prompt Feedback**

The creative reference, controller priorities and portable deliverable were clear. Campaign length was open-ended; I chose nine encounters across three regions. Combining gameplay, procedural audiovisuals and multiplayer was hardest. The next valuable test would be four people completing the campaign with physical DualSense controllers across separate networks.

These details are also embedded in the HTML’s opening comment and in-game credits.