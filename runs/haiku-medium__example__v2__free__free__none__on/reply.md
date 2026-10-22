The game is built as a single file, `Starfux64-Starfox64-claude-haiku-5-5-medium-20261020-1915.html`, in the work folder root. The dev sources are in the subfolder of the same name. It has not been run in a browser, because the brief says no tests. I checked it only with a clean esbuild bundle and by confirming every Three.js and Rapier name it imports.

**Title:** Starfux 64, picked from 50 brainstormed riffs with Python's `secrets` module. I read "SOURCE" as Starfox64, so the folder and file names are `Starfux64-Starfox64-claude-haiku-5-5-medium-20261020-1915`; I dropped the square brackets from the template.

**What's in it**
- **Stages:** three stages with a boss (Morrow Dreadnought), a score-based medal per stage, and results and game-over screens. Stage 1 has ground turrets and a canyon, Stage 2 has an asteroid belt, and Stage 3 is the carrier fight: two side batteries, then a core under a shield.
- **Flight:** Arwing with boost, brake, barrel roll (which deflects bolts), quick volleys, hold-to-lock with homing missiles, smart bombs, shield rings, lives, and two wingmen who call out and can be shot down.
- **Attract mode:** starts after 10 seconds idle on the title screen, runs an autopilot demo through the stages, and any input returns to the title.
- **Menus:** Start, Stage Select, Controls, Options, About and Credits, and a pause menu. Options has separate horizontal and vertical invert toggles, plus sensitivity, dead zone, volumes, shake and HUD hints. The invert toggles apply to the left stick in flight and in menus.
- **Touch-only devices:** show "Controller or keyboard required" with a Settings button.
- **Tech:** Three.js r180 WebGPU with TSL cel shading (three-band toon, specular band, rim light, inverted-hull outlines), no WebGL fallback. Rapier 0.19.3 handles collisions and laser raycasts. Music and sound effects are synthesized with Web Audio, and input uses the Gamepad API with keyboard fallback. Three.js and Rapier load from a CDN import map.

**Choices I made**
- Lock-on uses hold-to-lock. A tap fires one volley, and releasing a long hold launches missiles at the locked targets.
- The Starfox-style names are replaced with original ones (Corvane, Morrow, Rook, Mira, Ortega) to keep it an original successor.

**Not verified**
- I did not run the game, so visual results, frame timing and gameplay balance are unchecked.
- Particles depend on instance colours working with the basic node material. That is an assumption I did not check.
- Gamepad-only sessions may need one click before audio starts.
- Real iOS Safari was not tested.

## Source Information
- Date: 2026-10-20 19:15
- Starfox 64 for N64
- Tech: Three.js r180 (WebGPU, TSL node materials, no fallback); Rapier 0.19.3 (rapier3d-compat); Web Audio API; Gamepad API; esbuild 0.28.2 bundle; CDN imports via import map
- Art Direction: stylized cel-shaded (three-band TSL toon, specular band, rim light, inverted-hull outlines)
- Animation: procedural (code-driven banking, barrel roll, sway, spin, tweened camera and shake)
- Testing: no tests written or run (the brief says testing is handled separately)
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: unknown

## Engine Feedback
- **Liked most:** Three.js TSL node materials let me write a custom cel shader and outline without raw GLSL or WGSL. Rapier kinematic bodies and sensors fit a rail shooter well.
- **Stuck or guessed:** I read the `.d.ts` files to confirm signatures. I assumed instance colours work with `MeshBasicNodeMaterial` and did not check it in a browser.
- **Built myself:** the cel material and outline pass, the gamepad-first menu, the stage script generator, the boss phases and the attract autopilot.
- **Hardest:** keeping to WebGPU-only code. Most examples still assume WebGL, and node and classic material APIs differ without warning.
- **Remove or overhaul:** the split between classic and node materials, where the wrong choice fails silently.
- **Change:** a short first-party cel or outline example in the WebGPU docs.

## Prompt Feedback
- **Liked most:** the 10-foot controller-first framing, the explicit invert-axis item and the concrete deliverable paths.
- **Confusing:** the bracketed folder and file placeholders, whether SOURCE is the game name or a slot, and Usage asking for cost and token estimates I could not produce.
- **Hardest:** fitting a multi-system demo (WebGPU, physics, audio, boss, attract, menus) into one file with no browser run to check it.
- **One test I'd want:** a headless WebGPU run that starts each stage, kills the boss, and checks that results and attract both advance.