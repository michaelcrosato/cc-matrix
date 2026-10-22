Starfern 64 is built as a single self-contained HTML file in the folder root. I did not run it in a browser, because TASK.md says to write and do no tests. The only check I made was a JavaScript syntax parse of the bundle, which passed. Runtime bugs are therefore possible.

The only "placeholder" hits in the file are the word in my Prompt Feedback text. The code has no TODOs or stubs.

**File:** `Starfern-64-Starfox-64-for-N64-claude-sonnet-5-5-low-20261020-1426.html`. Dev modules and the bundler are in the same-named subfolder.

**What's in it**
- **Title:** "Starfern 64" came from a crypto RNG run over 50 brainstormed riffs (index 18 of 50).
- **Gameplay:**
  - Two sectors: Frondfall Canyon and Sporecloud Drift, each with a Thornwalker or Sporedreadnought boss.
  - Weapons and moves: tap lasers, hold-to-lock homing shots, barrel roll that reflects bullets, bombs, boost and brake.
  - Pickups and score: laser upgrades, healing rings, combo scoring, medals and saved best scores.
  - Wingmen and checkpoints: three wingmen who get chased and need rescuing, plus checkpoints and lives.
- **Attract mode:** after 10 seconds idle on the menus, a cheating AI plays both sectors on a loop. Any gamepad, key or mouse input exits it.
- **Controller-first UI:**
  - Large menus with dynamic PlayStation or keyboard prompts, and a full controls screen.
  - Settings include invert horizontal and invert vertical for the stick, plus deadzone, volumes, shake, rumble, lock-on assist, difficulty, subtitles, hints and prompt style.
  - Touch-only devices see "Controller or keyboard required" and a Settings button.
- **Dependencies:** none; it does not use a CDN. It runs on Canvas 2D with a custom software 3D renderer, and the audio is synthesized with Web Audio.

## Source Information
- Date: 2026-10-20 14:26
- Source: Starfox 64 for N64 (this is an original spiritual successor, "Starfern 64")
- Tech: Vanilla JavaScript (ES2020), HTML5 Canvas 2D with a custom software 3D mesh renderer (painter's algorithm, flat shading, fog), Web Audio API (synthesized SFX and procedural music), Gamepad API. No external libraries or CDN dependencies.
- Art Direction: Low-poly flat-shaded "N64-style" vector 3D with neon additive glow, an overgrown fern-jungle canyon and a purple spore nebula.
- Animation: Code-driven procedural animation. This means delta-time simulation, sine- and path-driven enemy formations, interpolated banking and barrel roll, and particle bursts with additive glows. There are no keyframe or skeletal assets.
- Testing: The prompt said to write no tests and do no tests; testing is done separately. I wrote and ran none.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort low
- Usage: cost unknown. The session's token counter fell by about 0.11M during the work. Session time unknown.

## Engine Feedback
- **Liked most:** There is no build step, and a small amount of projection math gives a convincing rail-shooter look. The data-driven stage scripts (`STAGES` in `data.js`) make adding sectors cheap.
- **Stuck or guessed wrong:** Sorting by depth with large objects (bosses, walls) is approximate, so I used generous hit boxes instead of true collision. I also couldn't check anything visually, so layout and balance values are guesses.
- **Most important thing I built myself:** The mesh renderer, the event-script spawner with checkpoints, the lock-on and homing weapon system, and the menu and input layer with gamepad-first navigation.
- **Hardest part:** Making a 2D canvas feel like 3D without a depth buffer. Mapping gamepad, keyboard and mouse onto one interaction model was the other hard part.
- **Remove or overhaul:** The software renderer. A WebGL or three.js layer would give real depth testing, lights and shadows for the same content.
- **Change one thing:** A built-in input-action mapping layer with prompt glyphs and axis inversion, so every project doesn't rebuild it.

## Prompt Feedback
- **Liked most:** The clear 10-foot controller-first rules, the attract-mode requirement, and the explicit axis-inversion fix. They gave concrete UX targets.
- **Confusing:** The filename template mixes GameTitle and SOURCE placeholders. I read SOURCE as `Starfox-64-for-N64`. "Source Information" is also requested in three places with slightly different expectations.
- **Hardest thing:** Delivering a "feature-complete vertical slice" with no testing allowed, so everything has to be right by construction.
- **One test I would have run:** A headless playthrough with a gamepad emulator that clears both sectors and bosses, checking for console errors and softlocks.