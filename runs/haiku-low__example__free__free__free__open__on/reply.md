The game is built and bundled: `Gravity-Kestrel-SOURCE-claude-haiku-5-5-low-20261020-1448.html` is in the work root, and the dev source is in the `Gravity-Kestrel-SOURCE-claude-haiku-5-5-low-20261020-1448/` subfolder (`game.js`, `template.html`, `build.py`). I ran it in headless Chromium: no console errors, and the title, gameplay, pause, boss, attract, and touch-only screens all rendered and responded.

**Title:** Gravity Kestrel. I drew it at random with Python's `SystemRandom` from a list of 51 candidates.

**What's in it:**
- **Stages:** Plains of Corvex (ground convoy), Ember Asteroid Belt (asteroids and a frigate), and the Gravity Core boss (destroy four orbiting pods to expose the core).
- **Controls:** left stick flies, A fires (hold), Y or RB launches lock-on missiles, X is the smart bomb, B is barrel roll, RT boosts, LT brakes, Start pauses. Keyboard mirrors all of it.
- **Lock-on and aim assist:** lasers converge on the enemy nearest the reticle, and missiles lock on up to six targets.
- **Menus:** Start Mission, Stage Select, Settings (invert horizontal and vertical stick, screen shake), and About & Credits.
- **Attract mode:** after 10 s idle on the title, an AI pilot plays with cheats on. Any input returns to the title.
- **Touch-only devices:** show "Controller or keyboard required" with a Settings button.
- **Feedback:** the About screen and the HTML comment carry Source Information, Engine Feedback and Prompt Feedback.

**Choices I made where the prompt left room:**
- The filename's literal `SOURCE` token is kept as written. If it was meant to be replaced with the source name, the file needs renaming.
- Invert toggles apply to the gamepad stick only, not to keyboard input.
- Score comes from kills multiplied by a combo, and each stage ends with a rank (S to C).

**Not verified:**
- No real PS5 controller, no real phone, and no WebKit run. Headless Chromium uses software rendering, so frame rates are low there.
- The boss difficulty is untested by a human player. My test pilot never dodged, and it died to the boss before the pods went down.
- Pilot-side tapping of two keys in the same frame counts as one press.

## Source Information
- Date: 2026-10-20 14:48
- Source: Starfox 64 for N64
- Tech: Three.js r160 (ES module via jsDelivr CDN), vanilla JavaScript, Web Gamepad API, Web Audio API, HTML/CSS overlays
- Art Direction: low-poly stylised space, procedural geometry, dusk-lit plains, neon accents, Arwing-inspired silver and blue ship
- Animation: per-frame delta-time simulation via requestAnimationFrame; procedural motion (sine paths, exponential smoothing, barrel-roll rotation); pooled additive point particles; CSS transitions for UI
- Testing: prompt says "No restriction on testing"
- Environment: Claude Code CLI (headless); Linux (WSL2); browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort low
- Usage: unknown

## Engine Feedback
- **Liked most:** the Three.js scene graph and its built-in shadows, fog and tone mapping. An import map meant no build tooling was needed.
- **Stuck or guessed wrong:** ship nose and enemy facing conventions (the nose points -z, enemies face +z), and shadow camera bounds for a moving ship.
- **Most important thing built myself:** lock-on, the attract AI, the wave scheduler, the scrolling terrain height model, and unified keyboard and gamepad input with edge detection.
- **Hardest part:** no physics or collision helpers, so distance checks were hand-rolled. Fast shots tunneled through targets at low frame rates until I added swept hit tests.
- **Remove or overhaul:** the lack of a built-in input abstraction. A gamepad helper with edge events would save time.
- **One change:** ship-in-scene helpers for orientation and bounds, so game-space code is less error-prone.

## Prompt Feedback
- **Liked most:** the explicit "done" criteria and the controller-first, 10-foot rules.
- **Confusing:** the unexplained SOURCE token in the filename, the "CRTICAL" typo, and a usage field that asks for token counts I can't see.
- **Hardest:** fitting a full feature-complete demo (menus, attract, three stages, boss, settings) into one low-effort pass.
- **One test I'd run:** a scripted full playthrough on a real controller, plus a phone-size touch emulation, checking the attract timer and the invert toggles.