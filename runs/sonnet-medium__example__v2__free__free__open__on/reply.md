**Macbeth Mayhem** is built as a single file: `MacbethMayhem-Starfox64-claude-sonnet-5-5-medium-20261020-1915.html` in the root of this folder. Dev files, a `build.py` bundler and a README for adding stages are in the subfolder of the same name. I drew the title with a real RNG (`secrets.randbelow`) from 50 brainstormed titles.

**It has not been run on a real GPU or a real controller.** I tested in headless Chromium with software WebGPU (SwiftShader), a mocked DualSense and a mobile touch emulation. The code loads Three.js and Rapier from jsDelivr, so it needs network access.

## What's in it
- **Rail stage, Macbeth Rail Yard**
  - Tutorial hints, barrel-roll deflect, boost/brake and lock-on volleys.
  - Nova bombs, laser upgrades and rings.
  - Obstacles, a train set piece and a Hecate mid-boss.
  - A route fork (tunnel or foundry) and the Thane Express boss.
  - Both stage-1 wingman rescues work.
- **All-range stage, Dunsinane Skies**
  - Free-flight dogfight with U-turn, radar and off-screen arrows.
  - Fighters, an ace, wingman AI and storm lightning.
  - A carrier with flak turrets, shield generators and a bridge core.
- **Systems**
  - Controller-first menus with PS5 glyphs; keyboard and mouse map onto the same model.
  - Pause, game over, results and medals, mission select and checkpoints.
  - Attract mode after 10 s idle; any input exits it.
  - Settings include the invert-horizontal and invert-vertical toggles.
  - A touch-only screen reads "Controller or keyboard required" and has a Settings button.
- **Look and audio**
  - Cel-shaded with ink outlines.
  - Procedural animation.
  - Synthesised audio and music.
  - Rapier used for collision queries and debris.
- **Dev tools**: F3 gives a designer panel.

## Things that went wrong and got fixed
- Creating Rapier bodies inside a query callback aborted enemy death logic and left the boss unkillable. I now collect hits first and run the callbacks afterwards.
- Particle colours were stale on the GPU until I set the instance colour buffer to dynamic.
- Opening Controls from the title closed it immediately because the same keypress also fired its confirm.

Headless screenshots of the WebGPU canvas come out blank, so I rendered to a target and read pixels back.

## Test results
- **AI sims:** AI runs through all of stage 1 and its boss and the stage-2 carrier fight finished with no script errors.
- **Random input:** random-input runs died or survived plausibly, with no errors.
- **Mocked pad:** D-pad and stick navigation and the invert toggles worked.
- **Touch and attract:** the touch-only screen and its Settings button worked, as did attract starting on idle and exiting on a key press.

## Source Information
- Date: 2026-10-20 19:15
- Source: Starfox 64 for N64 (Nintendo 64, 1997). Macbeth Mayhem is an original spiritual successor: new characters, world, stages, art and code; no Nintendo assets.
- Tech: Three.js r180 (three/webgpu build, WebGPURenderer, no WebGL fallback); Rapier 3D 0.19.3 (@dimforge/rapier3d-compat, WASM) for collision queries, sensors and rigid-body debris; Web Audio API (every sound effect and the music are synthesised live, no audio files); Gamepad API (PS5 DualSense layout, rumble); vanilla JavaScript ES modules bundled into one HTML file by a small Python script; DOM/CSS for HUD and menus; Russo One web font (optional, falls back to system fonts).
- Art Direction: stylized cel-shading. MeshToonMaterial with a 4-step light ramp, inverted-hull ink outlines, posterised sky bands, chunky nearest-filtered ground textures, hard-edged sun shadows, dusk-orange palette.
- Animation: procedural scene-graph animation (no baked clips): hierarchical part rigs (wings, turret heads, boss pods and armour plates), damped springs, easing tweens, state machines and canvas-drawn talking portraits.
- Testing: the prompt placed no restriction on testing; FPS and optimisation targets were declared out of scope. Testing done: headless Chromium (Playwright) with SwiftShader WebGPU, scripted fast-forward simulations of both stages, the boss fight and the attract mode with random and AI input, and render-target screenshots. Real hardware, a physical DualSense and real iOS or Android devices were not available.
- Environment: Claude Code CLI (headless); Linux (WSL2); browser unknown (developed and tested with Playwright Chromium and SwiftShader WebGPU)
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: estimated cost in USD: unknown (not exposed to the agent); total tokens: about 0.41M (about 406K by the session token-budget counter, no input/output breakdown available); session time: about 51 minutes (19:15 to 20:06)

## Engine Feedback
- What did you like most about the engine? Three.js WebGPURenderer plus its node materials: toon shading, instancing, shadows and fog worked with almost no custom shader code, and one importmap pulls everything from a CDN with no build step. Rapier's query pipeline (shape-overlap tests) was a very convenient way to do projectile, pickup and ramming checks, and real rigid bodies give exploding debris a physical feel for free.
- Did you get stuck or guess wrong? Yes, four times. (1) Headless screenshots of a WebGPU canvas come out blank under SwiftShader, so I render to a RenderTarget and read pixels back. (2) Creating a Rapier rigid body inside an intersectionsWithShape callback throws "recursive use of an object ... aliasing in rust"; the error was swallowed and silently aborted my enemy-death logic until I collected hits first and ran the callbacks afterwards. (3) An InstancedMesh with more than 1000 instances showed stale instance colours on the GPU until the colour attribute was set to DynamicDrawUsage. (4) I guessed a Rapier "updateSceneQueries" call that does not exist in 0.19 and had to read the typings.
- What was the most important thing you had to build yourself? The game framework on top of the libraries: the rail-space coordinate system (path frames, lanes, forks), the entity, projectile and AI layers, the all-range flight model, the Web Audio synth and music sequencer, the controller-first menu and focus system, the input layer with axis-inversion fixes, procedural models, and the attract-mode autopilot.
- What was the hardest part about using the engine? Verifying WebGPU output without a real GPU, and the thinner documentation for the node and TSL material system compared with classic WebGL materials, so I stayed on stable, well-trodden APIs.
- If you had to remove or overhaul one thing from engine, what would that be? Rapier's re-entrancy rules: world mutation during a query callback should be impossible or deferred by the library instead of failing inside wasm.
- If you could change one thing about the engine, what would it be? A built-in, reliable way to capture the WebGPU canvas in headless automation, and a clear warning when an instanced attribute is not being re-uploaded.

## Prompt Feedback
- Prompt: TASK.md, "Starfox 64 for N64" spiritual-successor vertical slice (Three.js r180 WebGPU, Rapier 0.19.3, cel-shaded, 10-foot controller-first, attract mode).
- What did you like most about this prompt? The concrete, checkable requirements: pinned tech stack, exact deliverable name, the 10-second attract mode, the invert-axis toggles for the flaky gamepad, the touch-only message, and the list of reference demos that sets a clear bar for "feature-complete".
- What was confusing? The "[PROMPT]" placeholder in the feedback template; how to write a game title with spaces into the filename pattern; whether the intermittent gamepad inversion is a bug to reproduce or only a setting to provide; and the Usage line, which asks for cost and tokens when an agent can only estimate them.
- What was the hardest thing to do? Fitting a complete vertical slice (a branching rail stage with a boss, an all-range stage with a carrier boss, wingmen, menus, audio, attract mode and tooling) into one session, and validating it without real graphics hardware.
- If there was one test you could have run, what would that test be? A hands-on playthrough with a real PS5 DualSense on a real GPU: check stick mapping and inversion, rumble, frame time under heavy effects, and the 10-foot readability of the HUD on a TV.