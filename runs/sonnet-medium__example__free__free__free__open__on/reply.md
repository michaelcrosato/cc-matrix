**Lylat Lark** is built and bundled: `LylatLark-Starfox64-claude-sonnet-5-5-medium-20261020-1426.html` in the work folder root, about 778 KB, with three.js inlined. Dev files are in the subfolder of the same name, and `build.py` there regenerates the bundle.

I tested it in headless Chromium, plus an emulated iPhone 15 Pro in WebKit and a Pixel 7. Both scripted AI playthroughs finish with no console errors. The keyboard path, a fake DualSense, pause, death, respawn and the touch-only screen all behaved as expected. A viewport-matrix run covered 8 tablet and desktop sizes in Chromium only, with no issues flagged. Real iOS Safari and a physical controller weren't available. The bundle contains no TODOs, placeholders or stubs.

## What's in it
- **Stages:** Sunreach Canyon and Veil Asteroids, each with a training run or briefing, a Warden Cruiser mini-boss and a boss (Gantry Titan, Hive Maw). A full pass of each stage takes roughly 2 to 3 minutes.
- **Combat:** tap to fire, hold to charge and lock on up to 8 targets, nova bombs, barrel-roll deflect, boost and brake, gold rings, pickups, a Squad Call meter, and a scoring chain.
- **Wingmen:** three AI wingmates get chased and you shoot the chasers off.
- **Attract mode:** 10 idle seconds on the title or any menu starts a cheating AI that loops both stages; any input exits.
- **UI:** PS5 controller first, keyboard and mouse mirror it, with button prompts that follow the last device used. Settings has the Invert Horizontal and Invert Vertical gamepad toggles with a live stick test. Touch-only devices see "Controller or keyboard required" plus a Settings button.
- **Extras:** stage select, pause, results with medals, saved scores, and an F1 debug overlay.

Chrome doesn't treat gamepad input as a click, so sound stays off until one click or key press. The title shows a hint for that.

## Source Information
- Date: 2026-10-20 14:26
- Source: Starfox 64 for N64
- Game title: Lylat Lark (rolled with a real RNG from 50 titles)
- Tech: single-file HTML, plain JavaScript, three.js r149 (WebGL, bundled inline), WebAudio for all sound and music, Canvas 2D for HUD and portraits, DOM/CSS menus, Gamepad API (rumble) plus keyboard and mouse
- Art Direction: faceted low-poly "toy model" look, warm canyon daylight and a violet nebula belt, shadows, drawn animal-pilot comm portraits
- Animation: procedural hierarchical rigs, damped springs, a small tween and timeline system, particle and debris pools, scripted boss state machines
- Testing: the prompt placed no restriction on testing. I used Playwright with headless Chromium, emulated WebKit and touch devices, a fake DualSense, and AI playthroughs.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown cost; about 0.3M tokens by the session counter and about 1 hour (estimates)

## Engine Feedback
- **Liked most:** three.js gets shadows, fog, instancing and flat-shaded models on screen fast, and the UMD build made a true single-file deliverable easy.
- **Stuck or guessed wrong:**
  - Menu items without an explicit type silently did nothing.
  - A gamepad can't unlock WebAudio in Chrome.
  - A flag I reused hid the Hive Maw core from hit tests.
- **Built myself:** all the gameplay: rail and event timeline, entity registry, collisions, lock-on, wingmen AI, bosses, UI navigation, input layer, audio synth and the attract-mode pilot.
- **Hardest part:** readability. Additive glows and fog wash out against a bright sky, so blending, exposure and fog took several passes.
- **Remove or overhaul:** newer three.js releases dropped UMD builds, and a no-module single-file path should be first-class.
- **Change one thing:** headless frame stepping built in, so simulations run without rendering.

## Prompt Feedback
- **Liked most:** the concrete, testable requirements (10-second attract mode, inversion toggles, touch-only message) and the clear definition of done.
- **Confusing:** "Engine" feedback when the stack is free choice, and the folder-versus-file naming placeholder.
- **Hardest:** making a vertical slice feel complete without real-hardware playtesting.
- **One test I'd run:** a real DualSense session on a TV at 10 feet, checking axis directions, rumble and text legibility.