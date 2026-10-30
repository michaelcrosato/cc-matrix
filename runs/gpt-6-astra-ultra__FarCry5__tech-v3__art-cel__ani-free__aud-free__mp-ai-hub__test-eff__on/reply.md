Built **[Rare Cry — single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-ultra__FarCry5__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Rare-Cry-FarCry5-gpt-6-astra-ultra-20261029-0952.html)**.

The three-landmark campaign includes stealth, combat, Scout, driving, fishing, upgrades, saving, co-op, and attract mode. Serve over **HTTPS or localhost**; WebGPU and internet access for dependencies are required.

**Source Information**

- **Date:** 2026-10-29 09:52, America/Vancouver.
- **Source:** Far Cry 5; original setting, characters, assets, and dialogue. Title randomly selected from 50 candidates.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, JavaScript/HTML/CSS; esbuild 0.28.2 packaging.
- **Art:** Procedural cel-shaded rural landscape.
- **Animation:** Procedural characters and weapons, physics ragdolls/projectiles, scripted attract sequence.
- **Audio:** Original procedural folk music, ambience and effects; optional synthesized radio speech. Voice identity: unknown.
- **Online:** [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) client 1.3.0; host-authoritative co-op and PeerJS 1.5.5 standalone rooms.
- **Environment/model:** Codex CLI, headless Linux; user browser unknown. OpenAI gpt-6-astra, reasoning effort ultra.
- **Usage:** Approximately 37 minutes. API cost and token usage: unknown.

**Testing Feedback:** Lightweight checks and review identified **15 issues, including 2 potentially game-breaking issues; all resolved**. Passed 19 gameplay checks, six regression checks, attract exit, 49 combined Hub checks, and live PeerJS transport. Phone/tablet WebKit and desktop/ultrawide layouts were inspected. The campaign test was most helpful; initial headless compositor screenshots were least helpful because they appeared blank despite GPU rendering. Direct canvas capture resolved inspection. Physical PS5 hardware, real iOS Safari, separate networks, and 3–4-player sessions remain untested.

**Engine Feedback:** Three.js’s scene graph and Rapier’s shared physics world worked well. I initially assumed the hub supplied a public lobby; it supplies an iframe session protocol. The largest custom systems were gameplay state, perception, controller navigation, saving, and network authority. Coordinating WebGPU/WASM initialization and multiplayer lifecycle was hardest. I would overhaul automatic renderer fallback and add a first-party controller/gameplay integration template.

**Prompt Feedback:** Controller-first UX and attract mode provided clear targets. “ALL mechanics” left the finite scope ambiguous. Making exploration, combat, progression, and co-op coherent was hardest. The most valuable additional test would be a complete two-player campaign using physical PS5 controllers across separate networks.

These notes are also embedded in the HTML’s opening comment and in-game credits.