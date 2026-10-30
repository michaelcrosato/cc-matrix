The hub's own `hub-check.mjs` now passes all four runs against the final build: 1 player, 2 players, host leaving, and the game on its own with the emulated controller and then the keyboard. I fetched the hub repo, ran its `scripts/hub-check.mjs`, and it showed two real bugs that I fixed:

- **Pad Options and Circle missed:** brief gamepad presses between slow frames were dropped. Gamepad buttons are now also sampled on a timer, so a short press still registers.
- **Pause blocked at start:** pressing Esc or Options right after Play did nothing while the intro dialog was showing. Pause now opens over the intro, and over any dialog.

The checked file is byte-identical to the deliverable `Deep-Drake-Trouble-claude-sonnet-5-5-medium-20261029-0753.html` in the folder root.

Everything I can run here has been run: the hub's own checker, the AI playing all three levels, the boss-to-ending flow, and the emulated controller and keyboard. Three things I cannot check from this machine:
- **A real DualSense:** feel and the audio mix are untested. The checker uses an emulated pad.
- **A headed GPU browser:** WebGPU was exercised only in software-rendered Chromium. That is also the only browser I tested in.
- **A subjective playthrough:** whether the levels are fun and balanced has not been judged.

The build has no TODOs, stubs or placeholders.

## Source Information
- Date: 2026-10-29 07:53
- Source game: Deep Duck Trouble Starring Donald Duck. I couldn't confirm its actual plot or mechanics, so the hero (Drake) and story are original.
- Tech: Three.js r180 (WebGPU renderer, TSL materials, no fallback), Rapier 0.19.3, Gamepad API, WebAudio, AI Hub session client 1.3.0. Libraries load from the jsDelivr CDN.
- Art Direction: cel shading (toon ramp, inverted-hull outlines, parallax 3D backdrops).
- Animation: procedural code-driven rigs and state machines.
- Audio: all code-written (chiptune music, synthesized effects, Animalese gibberish voices with subtitles).
- Online: AI Hub parallel (side-by-side) session mode only. Outside a session the game runs standalone.
- Testing: headless Chromium via Playwright: AI traversal of all 3 levels, the hub harness, the hub's own `hub-check.mjs`, keyboard and emulated-DualSense flows, idle attract mode, and the boss-to-ending flow.
- Environment: Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium).
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.
- Usage: unknown.

## Testing Feedback
- **Issues caught:** 12.
  - The player couldn't walk because the Rapier move had no `z`.
  - A level backdrop crashed.
  - Screenshots came back garbled from row-stride padding.
  - The attract AI stalled on NPC dialog.
  - The attract AI looped in pits and drained lives.
  - Rapier raised a world-free error on overlapping level loads.
  - Progress reports were missing in a session.
  - Esc was missed at low frame rate.
  - NPC auto-dialog blocked play in a session.
  - Key presses were lost between frames.
  - Pad presses were missed between slow frames.
  - Esc/Options were blocked by the intro dialog.
- **Critical:** 4: the `z` bug, the backdrop crash, the session auto-dialog and the missing progress reports.
- **Most helpful:** the hub's own `hub-check.mjs`, which caught two bugs my other tests missed. The AI traversal of all levels was a close second.
- **Least helpful:** raw WebGPU canvas screenshots, which came back blank or garbled.

## Engine Feedback
- **Liked most:** TSL node materials made cel shading and outlines tiny, and Rapier's character controller gave one-way platforms and crate pushing almost for free.
- **Stuck / guessed wrong:** Rapier's `computeColliderMovement` silently returns zero if the translation has no `z`; `readRenderTargetPixelsAsync` pads rows to 256 bytes; `WebGPURenderer` falls back to WebGL2 unless the backend is checked.
- **Built myself:** the tile-grid level format and geometry builder, the platformer feel layer, the boss state machine, and the menu/HUD/dialog UI.
- **Hardest part:** verifying visuals and input headlessly, because WebGPU canvases screenshot blank and run at 2–5 fps in software.
- **Overhaul:** Rapier's JS bindings failing silently instead of raising an error.
- **One change:** a built-in outline/cel material and a documented offscreen screenshot helper in `three/webgpu`.

## Prompt Feedback
- **Liked most:** a single clear deliverable, a concrete controller-first UX brief, and an AI Hub contract with a checker to prove it.
- **Confusing:** "no fallback" for WebGPU versus the hub's advice to add a WebGL2 fallback; the `[GameTitle-SOURCE-...]` filename placeholder.
- **Hardest:** fitting a feature-complete slice (3 levels, boss, UI, audio, attract mode, hub) into one session.
- **One test I'd run:** a headed WebGPU session with a physical DualSense.