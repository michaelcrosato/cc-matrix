I've built **Stuffox 64** (title picked by a random number generator from 50 brainstormed names) as a single HTML file. It was never run: TASK.md says "do no tests", so I didn't open it in a browser. That also overrides your global CLAUDE.md, which asks for viewport-matrix runs. The only checks were static: the bundle builds with esbuild, passes Node's syntax check, and has no undefined-identifier lint errors. Shader compilation, physics and gameplay have not been seen working.

**File:** `Stuffox64-Starfox64-claude-opus-5-5-medium-ultracode-20261020-1915.html` (about 270 KB). The dev sources and the build script (`build.mjs`) are in the subfolder of the same name. Three.js and Rapier load from the jsDelivr CDN, so the file needs internet access.

**What's in it.** Plush pilots (a fox, a badger, a bunny and an owl) defend a patchwork planet from a wind-up tin-toy army.
- **Stage 1, Quiltara (on rails):** sea, then farmland, then a branch. Fly through all 5 flare gates to unlock a secret canyon route; otherwise you go through a city where you can shoot towers to topple them onto tanks. A checkpoint ring sits before the branch. The boss is a walking crab with two arm cannons, then an exposed wind-up core, shockwave stomps and homing missiles.
- **Stage 2, Button Belt (free flight):** an asteroid field where asteroids react to shots and bombs, a radar, a rival squadron of three named aces with health bars and taunts, and a flagship boss. You destroy 4 shield generators first, then the lid opens to expose the core.
- **Moves:** barrel roll that bounces enemy shots back, bank turns, boost and brake on a shared gauge, somersault and U-turn. Holding fire charges a homing lock-on blast; bombs can be set off early by pressing again. Laser upgrades go single → twin → hyper, and wings can be torn off, which drops you back to single lasers.
- **Pickups and scoring:** silver and gold rings, bombs, wing repairs, extra lives. Hit counter, bonuses for multi-kills, and a medal per stage.
- **Wingmates:** they fly with you, shoot enemies, call for help when chased, and complain if you hit them. One who goes down misses the next stage. The boss health bar only shows while the owl wingmate is still flying.
- **Menus (controller first, PS5 button icons):** title, main menu, stage select, mission briefing with a map, a 4-tab How to Play, Settings, About/Credits, pause, results tally, game over with continue, and a demo-complete screen. Settings include separate invert-horizontal and invert-vertical toggles for controllers, plus difficulty, volumes, vibration, screen shake, hints and stick deadzone. Best scores are saved between sessions.
- **Attract mode:** after 10 seconds idle on the title or main menu, an invincible AI plays three segments in a loop (the start of stage 1, the stage 1 boss, the stage 2 ace fight). Any input returns to the title.
- **Touch-only devices:** show "Controller or keyboard required" and a Settings button.
- **Audio:** all music, sound effects and gibberish radio voices are synthesized with Web Audio.

## Source Information
- **Date:** 2026-10-20 19:15
- **Source:** Starfox 64 for N64
- **Tech:** Three.js r180 (three@0.180.0: WebGPURenderer, TSL node materials, ToonOutlinePassNode, BloomNode). WebGPU only, no WebGL fallback. Rapier 0.19.3 (@dimforge/rapier3d-compat). Web Audio API for synthesized music, SFX and voices. Gamepad API with standard mapping and dual-rumble. Vanilla JS ES modules bundled with esbuild 0.25 into one HTML file; Three.js and Rapier come from the jsDelivr CDN.
- **Art Direction:** Stylized cel-shading: MeshToonNodeMaterial with a 4-step hard light ramp, screen-space ink outlines (toonOutlinePass), HDR glows with bloom, and patchwork vertex-colored terrain. Plush heroes with button eyes and stitches against glossy tin toys.
- **Animation:** Procedural, code-driven animation: hierarchical transforms, sine-phase walk cycles, damped flight feel, and curves for the barrel roll, somersault and U-turn. Debris, toppling towers and asteroids are driven by Rapier physics. Camera cutscenes are scripted. No skeletal or keyframe assets.
- **Testing:** The prompt said "Write no tests, do no tests, testing will be done separately." No tests were written or run; the only checks were the esbuild build, a syntax check and lint.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium-ultracode
- **Usage:** unknown (no cost, token or session-time estimates are available to me)

## Engine Feedback
- **What did you like most about the engine?** Three.js r180's TSL node system and its built-in toonOutlinePass. Cel-shading, ink outlines and bloom took a few lines, and the animated water, sky gradient and waterfalls needed no hand-written GLSL or WGSL.
- **Did you get stuck or guess wrong?** I had to check details against the package source: which post-processing nodes ship in r180, the toonOutlinePass signature, and Rapier 0.19's collision-group rules for queries. My first group setup would have made the sensor hitboxes invisible to raycasts; I caught and fixed it in review.
- **What was the most important thing you had to build yourself?** The game layer: the rail and free-flight models, the data-driven level events, enemy movement patterns, boss state machines, and a sensor hitbox layer on Rapier for laser raycasts, lock-on and splash damage.
- **What was the hardest part about using the engine?** With WebGPU only, there was no way to look at the result here, and node materials fail when the shader is built rather than where the code is wrong.
- **If you had to remove or overhaul one thing from the engine, what would that be?** WebGPURenderer's silent automatic fallback to WebGL2. With a "no fallback" requirement it has to be detected and blocked by hand.
- **If you could change one thing about the engine, what would it be?** A small official "game kit": pooled particles, outline-friendly instanced props, and a helper to sync Rapier bodies to meshes.

## Prompt Feedback
- **What did you like most about this prompt?** It sets a clear bar ("feature-complete vertical slice" with named reference demos) plus concrete UX rules you can check: the 10-second attract mode, the inverted-axis toggles, the touch-only message.
- **What was confusing?** "Performance unlimited" sits uneasily with a real-time game. "Do no tests" conflicts with the global instruction to check UI visually. The usage line asks for cost and token figures I can't observe.
- **What was the hardest thing to do?** Fitting the whole Star Fox 64 move set (rails plus free flight, deflecting rolls, lock-on, bombs, somersault and U-turn, wingmate rescues, a branching route, bosses with weak points, medals) into one coherent build without ever running it.
- **If there was one test you could have run, what would that test be?** A Playwright run in a WebGPU-enabled Chromium: load the file, let attract mode start, and check for zero console errors across all three demo segments. That covers shader compilation, physics and most game systems in one pass.