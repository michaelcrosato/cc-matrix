Built [**Wee Knit**](./Wee-Knit-Wii-Fit-gpt-6.1-sol-max-20261104-232145.html): a self-contained offline game with all 14 activities.

Verification: **525 checks passed**, plus **135 final targeted checks**. [Progress](./PROGRESS.md) · [Exit interview](./exit-interview.json)

**Source Information**

- Date: 2026-11-04 23:21:45
- Source: Wii Fit
- Plan: PLAN.md
- Genre: Physics-balance party sports with daily-ritual progression
- Perspective: Third person, framed event cameras and an orbitable island chase camera
- Tech: Three.js 0.180.0, WebGPU/WebGL2, TSL ink; Rapier 0.19.3; Web Audio; Gamepad API; esbuild 0.28.2; Fredoka 5.3.0; Playwright 1.63.0
- Art Direction: Cel-shaded wooden-toy retreat; original procedural models, sea, sky and ink
- Animation: Three.js AnimationMixer clips on jointed rigs, procedural physics lean and Rapier ragdolls
- Audio: Original synthesised city-pop and bossa, effects and Animalese/Simlish-style voices; music defaults to 10%; no audio files
- Online: AI Hub Session Protocol v1 ghost mode for 1–4 devices, plus 1–4 player couch Group Class
- Testing: Headless whole-programme playthrough, all 42 event tiers, three bot skills across three seeds, input/audio/save checks, WebGPU and WebGL2, viewport matrices and AI Hub harness. One failure-only test command; no subagents. Controllers emulated; WebKit stands in for iOS Safari.
- Research: PLAN.md; [AI Hub protocol](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md), client and harness; local Three.js renderer source
- Environment: Codex CLI (headless); Linux
- Model: OpenAI, gpt-6.1-sol, reasoning effort max
- Usage: added on import

**Testing Feedback**

1. 24 issues recorded in notes/issues.md.
2. 4 critical issues.
3. Rendered scene-switch tests exposed a stale 3D view that state-only checks missed.
4. Broad fruit tuning sweeps before tracing contact cleanup.

**Engine Feedback**

1. Node materials and rigid-body contacts make expressive wooden toys.
2. Yes: stale render passes and retired fruit contacts made apparently valid tests misleading.
3. The shared torque-limited balancer, input routing and programme director.
4. Keeping GPU scene changes and physics cleanup correct across transitions.
5. None.
6. Clearer diagnostics for stale render passes and disabled-body contact state.

**Prompt Feedback**

1. Specific mechanics, tone and measurable reference values.
2. How strictly to preserve prototype tuning when the integrated build behaved differently.
3. Making loaded balance physical, forgiving and readable through one control scheme.
4. Separate mandatory mechanics from reference tuning, and require scene-change images alongside state checks.