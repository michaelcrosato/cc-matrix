Built **B-17 Cross Channel Chaos**.

[Play the game](./B-17-Cross-Channel-Chaos-B-17-Bomber-gpt-6.1-sol-ultra-20261106-043517.html) · [Sources and handbook](./B-17-Cross-Channel-Chaos-B-17-Bomber-gpt-6.1-sol-ultra-20261106-043517/README.md) · [Feedback JSON](./exit-interview.json) · [Progress](./PROGRESS.md)

The single HTML works offline. Controls: WASD fly, mouse aim, 1/2/3 switch stations, click/Space fire or release, M map, H navigation hold. Controllers and touch are supported.

**Verification:** `npm run verify` completed with **579 checks, 0 failures**, including a full playable sortie and all five Hub scenarios.

**Source Information:** Based on B-17 Bomber (Intellivision, 1982), following `PLAN.md`. Date: 2026-11-06 04:35:17. Arcade flight action with first-person stations, downward bombsight, overhead map and exterior shots. Tech: my-3D2dge 0.89.1, World3D, Three.js 0.182.0, Rapier 0.19.3, Bun 1.3.14 and Web Audio. Original chunky PS1/N64 geometry, native rigs and procedural animation. Music, effects and gibberish voices are synthesized; music defaults to 10%. Online: 1–2 local crew and AI Hub shared-world co-op. Research covered original instructions, developer history and screenshots; original audio timbres remain unknown. Environment: headless Codex CLI, Linux. Model: OpenAI gpt-6.1-sol, ultra effort. Usage: **added on import**.

**Testing Feedback:** 40 issues corrected, four critical. Most useful: complete sortie and Hub/split-screen regressions. Least useful: a screenshot taken before the menu animation settled. Hardware inputs and listening used prescribed stand-ins. WebGL 2 passes; software WebGPU was unreliable here.

**Engine Feedback:** Strongest features were native geometry, cameras and fixed stepping. Split overlays required investigation. I built the coupled aircraft, crew and bombing systems; portable two-view rendering was hardest. Added independent native overlays and compatibility constants without editing upstream engine files. A documented per-viewport overlay API would help.

**Prompt Feedback:** The complete sortie and exact handoff schema were useful. The source’s fuel jettison versus PLAN’s payload jettison needed distinguishing. Shared authority across play modes was hardest. I would separate acceptance gates from optional polish and standardize the evidence format.