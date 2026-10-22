**Star Furrow** is built as a single HTML file at the root of this folder, but I have never run it, so whether it works is unknown. The task forbade tests. The only checks were a syntax-only parse of the bundled script with `node --check` and confirming the CDN file paths exist. Expect some first-run bugs, especially around the WebGPU, TSL and Rapier API details I wrote from memory.

**File:** `StarFurrow-Starfox64-claude-sonnet-5-5-medium-20261020-1915.html` (about 211 KB). Dev files are in `StarFurrow-Starfox64-claude-sonnet-5-5-medium-20261020-1915/` (`src/` modules, `style.css`, `build.mjs`). Three.js and Rapier load from the jsDelivr CDN, so it needs an internet connection and a WebGPU browser.

**Title:** I wrote 50 title puns and picked **Star Furrow** with Python's `secrets` module. The farm theme follows from it: Furrow Squadron defends harvest worlds from the Blight Armada.

**What's in the game:**
- **Stages:** two stages plus tutorial prompts, Orchard Belt (space) and Dustbowl Gorge (canyon). Each ends in a multi-part boss, the Blight Gunship and the Colossus Crawler.
- **Flying:** rail flying with steering, tap laser, hold-to-lock homing volleys, Nova Bombs, boost/brake, and a barrel roll that reflects enemy shots. Laser upgrades, shield and gold rings, and wingmen who get chased and need rescuing.
- **Infrastructure:** designers can add stages by appending data to `LEVELS` in `src/08_levels.js`. There are checkpoints, continues, difficulty levels, results with medals, and saved scores.
- **Controller-first UI:** menus work with a DualSense or keyboard, button glyphs switch with the device, and settings are split into short pages.
- **Settings and kiosk behaviour:**
  - Invert horizontal and invert vertical toggles for the gamepad stick, with a live input test next to them.
  - Attract mode starts after 10 seconds idle on the title or menu. An AI with infinite shield and bombs flies a looping playlist of both stages and both bosses, and any input exits it.
  - Touch-only devices see "Controller or keyboard required" and a Settings button.
- **About screen:** the Source Information, Engine Feedback and Prompt Feedback sections are in the in-game About screen and in an HTML comment at the top of the file.

---

## Source Information
- **Date:** 2026-10-20 19:15
- **Source:** Starfox 64 for N64
- **Tech:** Three.js r180 (`three/webgpu` WebGPURenderer, TSL node materials, PostProcessing + BloomNode); Rapier 0.19.3 (`@dimforge/rapier3d-compat`); Web Audio API (fully procedural SFX, engine hum, voice babble, sequenced music); Gamepad API (DualSense-first, with rumble); vanilla ES-module JavaScript with a DOM/CSS UI; single HTML file with CDN dependencies via an import map.
- **Art Direction:** Cel-shaded. A 4-band toon gradient on `MeshToonNodeMaterial`, inverted-hull ink outlines, flat gradient skies, additive particle bursts, soft bloom, and a chunky ink-outlined UI.
- **Animation:** Procedural and code-driven. Damped-spring steering and banking, sinusoidal rigs on named model parts (wings, flames, legs, turrets, boss plates), per-enemy state machines, Rapier rigid-body debris, and CSS keyframes for the HUD.
- **Testing:** The prompt said "Write no tests, do no tests, testing will be done separately." None were written or run. The only checks were a syntax-only parse (`node --check`) and confirming CDN paths exist. FPS and performance were out of scope.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown (no token or cost counters were exposed to the session)

## Engine Feedback
- **What did you like most about the engine?** TSL and the ready-made node materials. `MeshToonNodeMaterial` gave real cel-shading in a few lines, and TSL handled the sky gradient and outline push without hand-written shaders. Rapier's `intersectionsWithShape` suited swept shot tests, pickups and ramming.
- **Did you get stuck or guess wrong?** Yes. With testing forbidden, API details came from memory or the CDN type files. I guessed wrong that Rapier ships `rapier.es.js` (the file is `rapier.mjs`). I was also unsure about the PostProcessing/BloomNode import paths, per-instance colour on `InstancedMesh` with node materials, and whether mutating the Rapier world inside a query callback is safe (it isn't, so hits are gathered first).
- **What was the most important thing you had to build yourself?** The game framework on top of the renderer. That meant the rail runtime and event timeline, entity/AI/boss systems, lock-on shots, controller-first menus, and the whole procedural audio and music engine.
- **What was the hardest part about using the engine?** Outlines. WebGPURenderer has no drop-in outline effect, so I built inverted-hull outlines with merged-vertex smooth normals and managed geometry disposal for streamed scenery.
- **If you had to remove or overhaul one thing from engine, what would that be?** The `three` / `three/webgpu` / `three/tsl` entry-point split, and addons that only work with one build. It's easy to import the wrong one, and names like PostProcessing change between releases.
- **If you could change one thing about the engine, what would it be?** A documented, first-class TSL toon and outline pipeline for WebGPURenderer.

## Prompt Feedback

[PROMPT] *(the prompt left this placeholder empty)*

- **What did you like most about this prompt?** The "feature-complete vertical slice" framing with concrete reference demos, the 10-foot controller-first philosophy, and specific checkable quirks (10-second attract mode, invert-axis toggles, touch-only message).
- **What was confusing?** The empty `[PROMPT]` placeholder, "SOURCE" used as a variable in several places, "single html" next to "dependencies don't have to be included", and a Usage cost/token request that can't be answered from inside the session.
- **What was the hardest thing to do?** Delivering a very large game with no testing allowed, so balance, camera feel and API correctness had to be reasoned out blind.
- **If there was one test you could have run, what would that test be?** A headless Chromium WebGPU smoke test. Load the file, let attract mode run 60 seconds across both stages, fail on any console error, and screenshot the title, a mid-stage frame and a boss frame.