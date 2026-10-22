I built **Stark Fox** (the title was picked by a random draw from 50 candidates). It's a single file, `StarkFox-Starfox64-claude-opus-5-5-medium-ultracode-20261020-1915.html` (327 KB), in the folder root. Three.js and Rapier load from jsDelivr, so it needs an internet connection. The dev sources are in the `StarkFox-Starfox64-claude-opus-5-5-medium-ultracode-20261020-1915/` subfolder; `python3 build.py` there rebuilds the file.

One limit on testing: no hardware GPU was reachable in WSL2, so every run used a software WebGPU adapter at about 0.25 FPS. I checked gameplay with a simulation hook and an AI test pilot, not by playing in real time. Frame rate on a real GPU, real controllers, rumble and iOS Safari are untested, and difficulty is tuned against the AI pilot only.

**What's in the demo**
- **Mission 1, Corvanis (on-rails):** sea, coast, city with arches and rooftop turrets, a checkpoint, then a fork: Cascade Canyon to the left or Skyway Bay to the right. The routes merge on the plains, followed by a boss fight in a circular arena against the walking Granite Strider (destroy the arm pods, then the chest plates, then the core; it fires an eye beam, missiles and ground shockwaves).
- **Mission 2, Sector Zeta (all-range):** free flight in an asteroid belt with radar and off-screen arrows. Drone waves, then three rival aces, then a flagship boss: shield generators first, then the reactor, while it fires a prow beam and launches fighters.
- **Player moves:** rapid fire, charge shot with lock-on (multi-kills give bonus hits), smart bombs, boost/brake on one meter, hard banking, barrel rolls that deflect shots, somersault, U-turn, and a camera toggle.
- **Ship state:** laser upgrades from single to twin to hyper, wings that break off (dropping you back to single lasers) until repaired, silver and gold rings, a shield expansion and 1-ups.
- **Wingmen:** three of them, with radio chatter in synthesized voices. They call for help when chased, can retreat for repairs, and react if you shoot them. A mission medal needs the hit target with all three still flying.
- **Systems:** stages are defined as data, with checkpoints, lives, game over and continue, a results screen, high scores and medals saved locally, procedural music and sound effects, and an F3 overlay showing FPS and other stats.
- **Attract mode:** after 10 seconds idle on the title or menus, an AI plays (invincible) through Corvanis, the Zeta dogfight and the Strider fight. Any key, button or mouse input returns to the title.
- **Menus:** controller-first focus navigation, with PlayStation button icons or keyboard keys depending on what you last used. Screens: Mission Select, a three-page How to Play, Settings, Pause, and About/Credits.
- **Settings:** invert controller horizontal and vertical axes (separately), pilot-style flight controls, difficulty, three volume sliders, screen shake, vibration, tutorial tips and large subtitles.
- **Touch-only devices:** they get a "Controller or keyboard required" screen with a Settings button, and it clears if a controller connects or a key is pressed.
- **No WebGPU:** the game shows an explanation instead of falling back to WebGL.

**Test results:** both missions, both routes, the full campaign to the Demo Complete screen, respawns, game over, pause, attract mode, the touch screen (emulated Pixel 7) and a fake DualSense with the invert toggles all passed, with no runtime errors.

Bugs fixed during testing:
- **Respawn:** dying while touching an obstacle silently cancelled the respawn.
- **Attract exit:** keyboard input could not leave attract mode.
- **Pause:** opening the pause menu also closed it in the same frame.
- **Ship orientation:** ships flew tail-first.

## Source Information
- **Date:** 2026-10-20 19:15
- **Source:** Starfox 64 for N64
- **Tech:**
  - Three.js r180 (WebGPU renderer with no WebGL fallback, TSL node materials, post-processing with bloom).
  - Rapier 3D 0.19.3 (compat build), used for queries, the terrain collision mesh and physics debris.
  - Web Audio API for procedural music, synthesized sound effects and radio voices.
  - Gamepad API with standard mapping and rumble.
  - Vanilla ES modules loaded from jsDelivr through an import map, plus Google Fonts.
- **Art Direction:** stylized cel-shading: toon materials with a 4-step ramp and a hard-edged rim light, ink outlines on every model, flat-shaded low-poly terrain coloured per vertex, a toon water shader, cel-style particle explosions, and bloom on glowing parts.
- **Animation:** procedural, all in code: banking, rolls and loops, walk cycles for the boss and tanks, enemy flight patterns that follow the rail, AI steering, scripted intro and mission-clear cameras, and Rapier debris.
- **Testing:** the prompt placed no restrictions on testing. I used headless Chromium with a software (SwiftShader) WebGPU adapter, since no GPU was available in WSL2, plus a simulation hook, an AI pilot, scripted UI walkthroughs, an emulated touch device and a fake gamepad.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium-ultracode
- **Usage:** unknown. A rough guess is about 0.5M tokens (about 0.32M in this session plus about 0.2M for the two helper agents that wrote the audio and the 3D models). Cost and session time aren't available to me.

## Engine Feedback
- **What did you like most about the engine?** TSL let me write the shader effects (toon rim light, outlines, animated water, star sky, damage vignette) in JavaScript right next to the game code, and they ran unchanged on WebGPU. Rapier's compat build also starts up from a single file with no separate wasm hosting.
- **Did you get stuck or guess wrong?** Yes, twice.
  - The player's death, which spawns debris bodies, ran inside a Rapier overlap callback. The resulting error was swallowed silently and the respawn never fired. The fix was to collect overlaps first and handle them after the query.
  - I had `Matrix4.lookAt`'s direction convention backwards, so ships flew tail-first.
- **What was the most important thing you had to build yourself?** The rail system: it branches and loops, and drives a data-based event script plus checkpoint restore. The outlines, particles, menus and attract-mode AI were also custom.
- **What was the hardest part about using the engine?** Checking WebGPU output with no GPU, at about 0.25 FPS. Also, WebGPURenderer quietly falls back to WebGL2 unless you check the backend yourself, and r180 has no built-in toon outline pass.
- **If you had to remove or overhaul one thing from engine, what would that be?** That silent WebGL2 fallback; a strict WebGPU-only mode would help.
- **If you could change one thing about the engine, what would it be?** An official cel-outline post-processing pass for WebGPU, and a loud error from Rapier when the world is changed inside a query callback.

## Prompt Feedback
- **What did you like most about this prompt?** The concrete quality bar (the reference demos) combined with specific UX requirements you can test: attract mode after 10 seconds, the touch-only screen, the axis-invert fix, and the controller-first 10-foot UI.
- **What was confusing?** A few things needed interpretation:
  - The file name pattern (I used "StarkFox-Starfox64").
  - "medium-ultracode".
  - "WEBGPU, no fallback": I read it as no WebGL renderer, with an explanatory error instead.
  - The Usage line asks for numbers the model can't see.
- **What was the hardest thing to do?** Making two complete, balanced missions while only seeing them through a software renderer at a fraction of a frame per second.
- **If there was one test you could have run, what would that test be?** A real playtest with a DualSense on a GPU machine at 60+ FPS, to tune the feel and confirm rumble, button icons and timings.