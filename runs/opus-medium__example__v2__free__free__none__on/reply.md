I've built **Sparfox 64**, a spiritual successor to Starfox 64, as a single file: `Sparfox64-Starfox64-claude-opus-5-5-medium-20261020-1915.html`. The development modules and `build.py`, which rebuilds the bundle, are in the subfolder of the same name. The title was picked by a random number generator from 50 brainstormed riffs.

**It has never been run in a browser.** The task said no tests, so I only checked that the bundled code parses (`node --check`) and ran a lint for undefined names, which found none. I also checked the Three.js and Rapier exports and signatures against the published packages. I fixed several logic bugs by reading the code, including inside-out mirrored wings and a pause button that reopened the pause menu. Whether the WebGPU shaders compile and the game runs is unknown until someone loads it in a WebGPU browser.

**What the demo contains:**
- **Flight on rails:** you fly a fixed track over sea, coast and a city. Moves are bank, barrel roll (deflects shots), boost and brake on a shared meter, and a somersault that drops you behind pursuers.
- **Weapons:** laser upgraded from single to twin to hyper, lost when a wing breaks. Holding fire charges a homing lock-on shot with multi-kill bonuses. Smart bombs can be detonated early by pressing again.
- **Branching route:** fly through all 5 gates in the city to open a hidden canyon route with floating mines; otherwise you take the skyscraper route.
- **Bosses:** a mid-boss attack carrier you must break apart part by part, then a free-flight arena boss with a radar, U-turns and a three-phase fight.
- **Wingmen:** three wingmen with radio chatter and animated portraits. They get chased and need rescuing, react to friendly fire, and can be knocked out of the mission.
- **Progression:** silver and gold rings, a shield upgrade, extra lives, item drops, a hit counter, squadron bonuses, a checkpoint, game over and continue, and a results screen with a medal.
- **Menus and controls:** built for a PS5 controller first, with the keyboard mapped onto the same layout. Settings include invert horizontal/vertical toggles, sensitivity, dead zone, difficulty, aim assist, volumes, rumble, screen shake, HUD size and large subtitles. There are pause, controls and About/Credits screens.
- **Attract mode:** after 10 seconds idle on the title or menu, a cheating AI plays looping clips of every section, both routes and the boss. Any input exits.
- **Touch-only devices** get the "Controller or keyboard required" message with a Settings button.
- **Look and sound:** cel-shaded with ink outlines and bloom; all models, animation, music and sound effects are generated in code.

---

## Source Information
- **Date:** 2026-10-20 19:15
- **Source:** Starfox 64 for N64
- **Tech:** Three.js r180 (0.180.0), WebGPU only with no fallback, using its built-in toon outline and bloom effects; Rapier 3D 0.19.3 for collision and debris physics; Web Audio for synthesized sound effects, voice chatter and music; Gamepad API with rumble; plain JavaScript modules bundled into one HTML file; Google Fonts from a CDN.
- **Art Direction:** Stylised cel-shading: three-step toon lighting, flat-shaded low-poly models built in code, ink outlines, a banded sky, banded animated water, glowing effects with bloom, and a different color palette for each zone.
- **Animation:** Driven by code: smoothed transforms for banking, rolls, somersaults and U-turns; formation flight patterns; pooled particle explosions; physics-simulated debris; talking radio portraits; scripted cutscene cameras.
- **Testing:** The prompt said "Write no tests, do no tests, testing will be done separately." Nothing was run in a browser.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** Cost and token totals are unknown (no meter was available). Session time was about 35 minutes.

## Engine Feedback
- **What did you like most about the engine?** Three.js r180's WebGPU build has toon outlines and bloom built in, so the whole cel-shaded look took a few lines. Rapier's ray casts, shape overlaps and collision groups made a clean hit-detection layer.
- **Did you get stuck or guess wrong?** I guessed the toon outline effect was a separate add-on. Its add-on path returns 404; it's actually in the core build. I had to check Rapier's type definitions for the ray-hit field name (`timeOfImpact` vs `toi`). Without running anything, two things are still educated guesses: whether ray casts hit sensor colliders, and whether pre-compiling shaders works alongside post-processing.
- **What was the most important thing you had to build yourself?** The rail system: a flight path with branching routes, enemies positioned relative to the rail, and an event timeline keyed by distance. All models, music and sound also had to be generated in code.
- **What was the hardest part about using the engine?** Keeping the number of shader variants stable (a fixed pool of lights instead of spawning new ones) and judging outline gaps on flat-shaded models without seeing them.
- **If you had to remove or overhaul one thing from engine, what would that be?** The split between the WebGPU build, the shader-language build and the add-ons, which all need a hand-written import map. One entry point would remove a whole class of loading errors.
- **If you could change one thing about the engine, what would it be?** Per-material outline thickness and color (it's one global value now). In Rapier, an explicit way to refresh query data for colliders that were moved without a physics step.

## Prompt Feedback
- **What did you like most about this prompt?** The concrete bar for "feature-complete demo" (MGS2 Tanker, Doom E1, THPS Warehouse). Also the specific UX requirements: controller-first 10-foot UI, attract mode, and the axis-inversion quick fix.
- **What was confusing?** "Write no tests, do no tests" conflicts with the machine-wide instructions to check UI across viewports. "Single HTML file" sits oddly with "dependencies can be downloaded". The Prompt Feedback header contains a literal `[PROMPT]` placeholder.
- **What was the hardest thing to do?** Building a full vertical slice without running it once: rail and free flight, two routes, mid-boss, boss, wingmen, menus, attract mode and music.
- **If there was one test you could of run, what would that test be?** Load the HTML in a WebGPU browser with a DualSense controller and let attract mode loop once. Then play from the title through the checkpoint, the hidden canyon and the boss to the results screen, watching the console for shader compile errors.