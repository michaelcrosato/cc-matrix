Created [Final Sidekick — single-file demo](/home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v12__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Final%20Sidekick-Final%20Soldier-gpt-6.1-terra-ultra-20261029-0924.html). The development files are in the matching [subfolder](/home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v12__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Final%20Sidekick-Final%20Soldier-gpt-6.1-terra-ultra-20261029-0924/).

Move with the stick or arrows, hold **Cross / Z / Space** to fire, press **Square / X** to sacrifice a sidekick, and **R1 / C** to change speed. The game includes weapon pickups, a guardian encounter, a score attack, attract mode, axis inversion settings, AI Hub sessions, and standalone online score races.

### Source information

- **Date and source:** 2026-10-29 09:24; [Final Soldier](https://shmups.wiki/library/Final_Soldier).
- **Tech:** Three.js r180 WebGPU, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.4, and AI Hub session client 1.3.0.
- **Art and animation:** Cel-shaded procedural 3D with transform and particle animation.
- **Audio:** Code-generated music, sound effects, and gibberish radio voices.
- **Online:** AI Hub parallel score attack and standalone WebRTC score races through PeerJS signaling.
- **Testing parameters:** Lightweight checks; performance targets were out of scope.
- **Environment:** Codex CLI, headless Linux; browser unknown. The browser smoke tests used Chrome.
- **Model:** OpenAI gpt-6.1-terra, reasoning effort ultra.
- **Usage:** Unknown.

### Testing feedback

Testing caught **two issues**, including **one game-breaking issue**: Rapier sensors initially did not register intersections. The other was title-screen clipping on a short viewport. Both were fixed.

The most helpful test was the real Rapier simulation through waves, pickups, the boss, and the attract loop. The least helpful was syntax checking alone. The AI Hub smoke test verified start, progress, and time-up result reporting; two standalone browser tabs connected and entered a race. **Standalone score synchronization was not verified.** Headless Chrome’s WebGPU compositor did not produce a visible canvas, so the game’s rendered visuals still need a check on a WebGPU-capable display.

### Engine feedback

Three.js made the cel-shaded scene approachable. The initial Rapier sensor configuration was the main wrong assumption. The arcade gameplay, interface, and procedural audio needed custom implementation; verifying WebGPU presentation was the hardest part. I would overhaul the renderer’s automatic fallback behavior and make WebGPU initialization failures clearer.

### Prompt feedback

The source reference and controller-first direction were especially useful. Standalone signaling details were unspecified, and combining the shooter with online sessions was the hardest part. The most valuable additional test would be a real-controller, multi-device playtest covering visuals and score synchronization.