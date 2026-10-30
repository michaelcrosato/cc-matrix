**Cherry Alarm** is built and bundled as one file, with every feature in TASK.md implemented and no TODOs or stubs left. I could not play it on a real GPU, so how it looks and feels at full frame rate is unchecked; headless software rendering ran at only 1–5 fps.

- **Deliverable:** `CherryAlarm-RedAlarm-claude-sonnet-5-5-medium-20261029-0715.html` (3.35 MB) in this folder's root. Source and tests are in the subfolder of the same name.
- **Title:** picked from 50 brainstormed candidates with a real RNG (`crypto.randomInt` landed on "Cherry Alarm").

**What the game is.** It's a cel-shaded flight shooter in three sorties, ending in a boss fight. You fly the PIT-1 through rooms and open space, lock missiles onto up to six targets, barrel-roll to dodge and reflect shots, and chain kills for a score multiplier.

**Menus and input.** The title, mission select, briefings, pause, settings (including the invert horizontal and vertical toggles), controls, results and About screens are all pad-first and work the same with keyboard and mouse. After 10 seconds idle on the title or menus, an AI pilot plays the missions in a loop, and any input exits it. On touch-only devices it shows "Controller or keyboard required" plus a Settings button.

**AI Hub.** The hub's own harness passes at 1, 2 and 4 players. The game plays side by side in sessions, as a score-based run through the sorties. Because you asked for WebGPU with no fallback, it declares `hub:webgpu required`.

**What I tested.**
- The autopilot clears all three sorties in-page, including the boss and the escape. In a final 8-run check, 7 of 8 of the second sortie's runs finished.
- The full menu flow passes by keyboard.
- Emulated-DualSense checks of the horizontal-invert toggle, menu navigation, and Create+Options being ignored all passed.
- The vertical-invert toggle itself was never exercised.
- The touch-only screen works.

Everything runs fully only on WebGPU. The page logs a harmless Rapier deprecation warning at boot.

# Source Information
- Date: 2026-10-29 07:15
- Red Alarm (Virtual Boy, 1995)
- Tech: Three.js r180 (WebGPURenderer + TSL), Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Gamepad API, Web Audio, esbuild single-file bundle, AI Hub session client 1.3.0
- Art Direction: cel-shaded, with a 4-step toon ramp, inverted-hull ink outlines and red wire-grid walls (a nod to the original's wireframes)
- Animation: procedural rig animation (spring and tween driven transforms, banking, barrel rolls, per-enemy part animation, particles and shockwaves)
- Audio: music, sound effects and Animalese-style gibberish voices, all synthesized in code with no samples
- Online: AI Hub session protocol v1, side-by-side (`parallel`) mode, with a seeded layout, progress and result reporting; no other networking
- Testing: headless Chrome via Playwright; in-page fast-forward simulation with the cheating autopilot; the hub harness at 1/2/4 players; keyboard and emulated-pad flow tests; touch emulation
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown (the CLI did not expose cost or token counts); wall time about 55 minutes, 07:15 to about 08:10

# Testing Feedback
- Issues caught: 6.
  - Crash when a mission was loaded a second time, from a stale Rapier body.
  - Esc closing settings and instantly reopening them.
  - Short key taps lost by menu navigation.
  - Attract mode starting during the briefing.
  - Autopilot stuck on ring and gate geometry.
  - Pause and probe lag under slow frames.
- Critical or game-breaking: 2, the second-load crash and the autopilot that could not finish a sortie.
- Most helpful test: fast-forwarding whole missions in-page with the autopilot, plus the AI Hub harness.
- Least helpful test: ordinary headless screenshots, which return a blank WebGPU canvas. I had to read pixels back through a render target instead.

# Engine Feedback
- **Liked most:** TSL makes toon shading, ink outlines and procedural wire grids only a few lines each, and Rapier's compat build embeds its wasm, so single-file bundling was easy.
- **Stuck or guessed wrong:** I tried mutating a TSL color node (a `uniform()` is needed instead), assumed headless screenshots capture WebGPU, and reused a Rapier body after its world was freed.
- **Most important thing I built myself:** everything around the engines, namely the fixed-step game, unified input, the menu system, the level builder, enemy and boss AI, and the whole audio stack.
- **Hardest part:** verifying WebGPU output without a real GPU, since node-material mistakes fail silently.
- **Remove or overhaul:** the silent failure mode of node materials, and the missing built-in way to read pixels back for automated tests.
- **One change:** an official toon-plus-outline helper in the WebGPU build.

# Prompt Feedback
- **Liked most:** concrete UX rules (pad-first, invert toggles, attract mode, touch message) and a real protocol link for online play.
- **Confusing:** "WebGPU, no fallback" conflicts with the hub's advice to ship a WebGL fallback (resolved with `hub:webgpu required`), the bracketed filename template, and the request for a cost estimate the CLI doesn't expose.
- **Hardest:** the breadth, a full vertical slice with audio, UI, AI, online and attract mode, built and checked without a real GPU.
- **One test I wish I'd run:** a headed playthrough on a real GPU with a physical DualSense, using the hub's `scripts/hub-check.mjs` and its emulated pad.