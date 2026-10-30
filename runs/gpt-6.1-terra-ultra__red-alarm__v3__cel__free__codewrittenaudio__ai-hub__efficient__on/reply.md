Built **Siren Vortex**, a controller-first arcade flight demo inspired by Red Alarm.

[Download the single HTML game](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Siren-Vortex-SOURCE-gpt-6.1-terra-ultra-20261029-0915.html>) · [Development folder](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-ultra__v3__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Siren-Vortex-SOURCE-gpt-6.1-terra-ultra-20261029-0915>)

The mission includes flight combat, boost and brake, evasive rolls, pulse bombs, pickups, two camera views, a boss encounter, attract mode, axis inversion settings, and parallel score races through ai-hub or standalone rooms. The file loads its dependencies from CDNs and requires a WebGPU-capable browser; there is no WebGL fallback.

### Source information

- **Date:** 2026-10-29 09:15. **Source:** [Red Alarm](https://www.nintendolife.com/reviews/virtualboy/red_alarm).
- **Tech:** Three.js R180 WebGPU, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5 and [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub).
- **Art and animation:** Cel-shaded science fiction with crimson accents; procedural object transforms and particles.
- **Audio:** Code-generated synthesizer music, effects and gibberish radio voice.
- **Online:** AI Hub parallel sessions and standalone score-race rooms.
- **Testing parameters:** Lightweight checks; FPS targets and optimization were out of scope.
- **Environment:** Codex CLI, headless Linux; browser unknown. Headless Chrome was used for testing.
- **Model:** OpenAI, gpt-6.1-terra, reasoning effort ultra. **Usage:** unknown.

### Testing feedback

Testing caught **three issues**, none assessed as game-breaking. The most helpful checks were the ai-hub multiplayer harness and Rapier collision test; syntax-only checking was the least helpful.

The ai-hub harness passed with one and two players and with an emulated standard gamepad. A simulated mission reached victory, and a mocked two-pilot room passed its connection, scoring and departure checks.

**Visual rendering remains unverified in a normal browser.** Headless Chrome advanced the mission without JavaScript errors, but its WebGPU screenshots were blank; an independent WebGPU clear test showed the same capture problem. A physical controller and live PeerJS connection were also not tested.

### Engine feedback

Three.js’s scene composition was the most useful part of the engine. I initially assumed Rapier’s default collision types covered the player sensor; testing showed they needed explicit configuration. Flight, combat and mission sequencing were the largest systems built specifically for the demo. WebGPU initialization and browser availability were the hardest constraints. I would overhaul the renderer’s automatic fallback behavior for WebGPU-only projects and add clearer compatibility diagnostics.

### Prompt feedback

The creative direction and controller-first requirements were especially useful. “Feature-complete vertical slice” left some scope open to interpretation, and multiplayer integration was the hardest part. The most valuable additional test would be a four-player playthrough with physical controllers in normal WebGPU browsers.