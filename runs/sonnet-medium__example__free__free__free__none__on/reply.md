I built **Tailfox 64** as a single HTML file, but I never ran or played it. The prompt said to do no tests, so the only check was a JavaScript syntax parse at build time, which passed. Bugs are likely; the first run is the real test. It needs internet access, because Three.js loads from the jsDelivr CDN.

**Files** (all in the work folder)
- `Tailfox64-Starfox64-claude-sonnet-5-5-medium-20261020-1426.html` is the deliverable.
- `Tailfox64-Starfox64-claude-sonnet-5-5-medium-20261020-1426/` holds the source modules, the HTML template, `build.py` and `about.txt`.

The title was picked by a random number generator in code from 50 candidates.

**What the demo contains**
- **Mission:** four stages covering Halcyon Sea, Gate Cut Canyon, the Bastion Walker mid-boss, and an all-range dogfight against the Leviathan carrier.
- **Combat:** laser upgrades, charge lock-on with homing shots, barrel roll that reflects enemy fire, nova bombs, and boost and brake.
- **Set pieces:** a rescue event, gates to thread, tail-gunners that overshoot if you brake, rings and pickups, checkpoints, and a results screen with a rank.
- **Controller-first UI:** PS5 button prompts that switch to keyboard prompts, plus pause, stage select, controls, settings, and about/credits.
- **Axis invert toggles:** horizontal and vertical invert for the gamepad, with a live stick-test dot in Settings.
- **Attract mode:** after 10 seconds idle on the title or menus, a cheating AI plays through all four stages in a loop, and any input exits it.
- **Touch-only devices:** show "Controller or keyboard required" and a Settings button.
- **Sound and music:** all synthesized in the browser.

## Source Information
- Date: 2026-10-20 14:26
- Source: Starfox 64 for N64
- Game title: Tailfox 64
- Tech: Three.js 0.160.0 (WebGL) from the jsDelivr CDN, with its EffectComposer, RenderPass, UnrealBloomPass and OutputPass addons. Hand-written vanilla JavaScript in one ES module, bundled into one HTML file by a small Python script. Web Audio API for sound and music, Gamepad API (PS5 DualSense standard mapping, rumble), and localStorage for settings. No other engine or library.
- Art Direction: Low-poly, flat-shaded N64-inspired look with modern lighting: sun shadow maps, fog, vertex-coloured procedural terrain, additive particle explosions and bloom. Comm portraits are canvas-drawn, and the HUD and menus are large-type DOM built for 10-foot viewing.
- Animation: Fully procedural, with no keyframed assets. Enemy path functions run relative to the rail, dogfighters use steering behaviours, and camera and ship motion are damped. The UI is tweened, comm text types out, and particles come from a GPU point-sprite pool.
- Testing: The prompt said to write no tests and do no tests, because testing is done separately. I did not run or play the game. The only check was the build-time syntax parse.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown, because no cost, token or session-time figures were available to me

## Engine Feedback
There is no game engine in the usual sense here. The "engine" is Three.js plus the browser platform APIs.
- **What did you like most about the engine?** Three.js gets a convincing N64-meets-modern look from very little code: flat-shaded materials, a shadow-casting sun, fog and bloom. A single CDN import also makes one-file sharing easy.
- **Did you get stuck or guess wrong?** I could not run anything, so every API detail was reasoned rather than verified. These included which way `Object3D.lookAt` faces, the Euler order for flight attitude, particle shader attributes, and whether audio will start when only a gamepad is used. I caught one in review (the shadow camera needs an explicit projection update). Others may still be wrong.
- **What was the most important thing you had to build yourself?** The whole gameplay layer. That meant a rail-relative enemy director and level script, a free-flight all-range mode, charge and lock-on shooting, boss state machines, collisions, the audio sequencer, the menu and HUD system, and the attract-mode pilot.
- **What was the hardest part about using the engine?** Three.js has no entity, collision, input, UI or audio layer, so all of that is hand-rolled. Keeping many modules coherent in one shared scope, without being able to run them, was the hard part.
- **If you had to remove or overhaul one thing from the engine, what would that be?** The split between the core build and the examples/jsm addons. It forces import maps and exact CDN version paths for something as basic as post-processing.
- **If you could change one thing about the engine, what would it be?** A small built-in gameplay layer (entities, pooling, simple collision queries, input mapping), so a vertical slice does not start from a blank page.

## Prompt Feedback
[PROMPT] Build an original spiritual successor to Starfox 64 as a feature-complete single-file HTML demo, with attract mode, controller-first 10-foot UX, axis-invert toggles and touch-only messaging.
- **What did you like most about this prompt?** The requirements are concrete and checkable: a 10-second attract mode, invert toggles, the touch-only message, an exact filename and exact report sections. Tech and art are left free, and the reference list sets the bar for "feature-complete demo".
- **What was confusing?** SOURCE is a placeholder in both the file name and the title instruction. The Source Information template has an unlabeled "Starfox 64 for N64" line. "Silently brainstorm 50 titles" is hard to square with reporting the pick. Usage and session time were requested although I had no telemetry. "No tests" sits next to "no stubs", which cannot be verified without running the game.
- **What was the hardest thing to do?** Delivering a full vertical slice in one pass without ever executing it. That slice has two flight modes, two boss fights, a rescue event, menus, settings, attract AI and procedural audio.
- **If there was one test you could of run, what would that test be?** A headless-browser smoke run that lets attract mode play through all four stage segments, fails on any console error, and screenshots each boss phase. A scripted gamepad session that walks every menu would go with it.