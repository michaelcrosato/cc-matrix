Built [**Demon Bonanza — play the HTML**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191333__x64d870/work/Demon-Bonanza-Demon-Attack-gpt-6.1-sol-max-20261105-191333.html). First load needs internet for CDN dependencies.

Six waves, a three-phase boss, endless encore, co-op, attract mode, and live development tools. **39 checks passed; zero failures.**

[Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191333__x64d870/work/exit-interview.json) · [README and controls](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-191333__x64d870/work/Demon-Bonanza-Demon-Attack-gpt-6.1-sol-max-20261105-191333/README.md)

**Source Information:** Also included in-game under About & credits.

- **Date:** 2026-11-05 19:13:33. **Source:** Demon Attack, Imagic, 1982. **Plan:** none supplied. **Genre:** fixed-screen arcade shooter. **Perspective:** side-on, orthographic 2.5D.
- **Tech:** Three.js R180/WebGPU with WebGL fallback, Rapier 2D 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub Protocol v1/client 1.4.0. **Art:** procedural cel shading and ink contours. **Animation:** native Three.js clips and mixers. **Audio:** coded music at 10% default, synthesized effects and gibberish voices.
- **Online:** 1–4-player Hub co-op; two-player peer and couch co-op. **Testing:** campaign simulations, browser/input/audio checks and all four Hub harness scenarios. **Research:** [original manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=135), [archived visuals and footage](https://www.atarimania.com/games/atari-2600-games-demon-attack-7282), sound-code reference and official engine/Hub documentation.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI, gpt-6.1-sol, reasoning effort max. **Usage:** added on import. Physical controller feel, real iOS behavior, audible mix quality and arbitrary cross-internet connectivity: **unknown**.

**Testing Feedback:** Automated tests caught four implementation issues, three critical. Multiplayer review found two more, one critical; all were fixed. Most helpful: the complete campaign playthrough. Least helpful: blank software-WebGPU screenshots; visual inspection used WebGL captures.

**Engine Feedback:** Best feature: native animation with toon materials. Difficulties: a physics transition exception and GPU initialization failures. Built myself: gameplay simulation, controller UI and cooperative synchronization. Hardest part: coordinating physics, rendering and network lifecycles. Engine changes: none. Desired improvement: consistent built-in ink outlines across backends.

**Prompt Feedback:** Best part: source research and controller-first requirements. Confusing part: standalone online signaling expectations. Hardest part: completing every input, progression and network path in one HTML. Suggested change: specify a signaling service and clarify fallback expectations.