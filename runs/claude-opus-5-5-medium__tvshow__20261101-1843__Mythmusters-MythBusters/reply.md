I built **Mythmusters**, an original physics-experiment game inspired by **MythBusters**. It's the single file `Mythmusters-MythBusters-claude-opus-5-5-medium-20261101-1843.html` in this folder. The dev files, test tools and screenshots are in the matching subfolder. Three.js and Rapier load from the jsDelivr CDN.

The final checks all passed:
- **AI Hub harness:** passes at 1 player, 2 players and with a player leaving.
- **Full gamepad playthrough:** from the menus through a test, the replay, the explosion and back to the range.
- **Attract mode:** loops through all four myths on its own.
- **Balance sweeps:** every myth can end Busted, Plausible or Confirmed depending on the settings.
- **Console:** boots on WebGPU with no errors.

All testing was headless on software rendering. Nobody has played it on a real GPU with a real controller yet, so frame rate, audio mix and controller feel are unchecked.

**What's in it**
- **Four myths:**
  - **Cannonball through the wall:** fire at a brick wall with Bucky the crash-test dummy behind it.
  - **Domino Doom:** place a chain of ever-bigger dominoes to topple a door-sized slab.
  - **Six-Bus Jump:** drive the car yourself and hit the ramp.
  - **Water Heater Rocket:** build pressure and listen for the tank creaking before a seam splits.
- **How each myth plays:** a short briefing, then you set the dials and run the test. A slow-motion "high-speed camera" replay follows, then a stamped verdict and three bonus goals. You can retest, or blow the rig up anyway ("Make it happen").
- **The range:** a walkable hub (the Shop) with a whiteboard per myth that shows your result, plus barrels and crates to kick around.
- **Cameras:** chase cam is the main view; Triangle / C switches to first person or an orthographic "Blueprint" side view.
- **Modes:** Episode, Quick Test, a 2–4 player pass-the-controller Showdown, and AI Hub sessions in side-by-side mode. The game's 5-minute hub rounds are the four myths.
- **Required extras:**
  - Attract mode starts after 10 s idle on the title.
  - Settings include invert controller X/Y.
  - Touch-only devices get the "Controller or keyboard required" screen with a settings button.

Two choices to know about:
- **Brick walls:** loose stacked bricks just absorbed the cannonball, so impacts use a simple "mortar" model. The ball spends energy to break the bricks in its path.
- **Multiplayer "on its own":** I read this as local hot-seat (Showdown), not online play.

## Source Information
- **Date:** 2026-11-01 18:43
- **Source:** MythBusters (TV series, 2003–2018)
- **Genre and Perspective:** physics experiment / sandbox puzzle with light driving and walking. Main view is a third-person chase camera; you can switch to first person or the orthographic Blueprint view.
- **Tech:** single HTML file; Three.js r180 (WebGPU renderer with automatic WebGL 2 fallback; the sky uses a TSL node material); Rapier 0.19.3 (rigid bodies, joints, fast-projectile collision, character controller, vehicle controller); Web Audio; Gamepad API; AI Hub session client 1.3.0.
- **Art Direction:** Three.js's standard look: PBR materials, soft shadows from one sun, hemisphere light, fog, generated textures, models built from primitives.
- **Animation:** Three.js AnimationMixer clips (idle, walk, run, cheer, shrug, point, jump) with cross-fades; physics-driven props; recorded transforms replayed in slow motion.
- **Audio:** all written in code: a step sequencer playing four original tracks, synthesized sound effects, and gibberish "Animalese" voices for the narrator, the hosts Dot and Moss, and Bucky.
- **Online:** AI Hub side-by-side sessions (seeded start, live progress, result with stats and awards); local hot-seat Showdown; nothing else.
- **Testing:** headless Chromium (Playwright) on SwiftShader WebGPU/WebGL with CDN files served locally; frame-by-frame stepping; parameter sweeps; the AI Hub harness.
- **Research:** only the AI Hub protocol README and Rapier's type definitions; the show's format from memory.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** session time about 1 h 55 min. API cost and token counts: unknown.

## Testing Feedback
- **Issues caught:** about 19, including:
  - cannonballs stopping dead in the brick wall
  - the car driving backwards
  - ceiling planks jamming the water heater
  - a Rapier crash from stale references
  - a crash from disposing a texture
  - the AI Hub hello arriving too late
  - timer-based fades stalling the stepped tests
  - attract mode skipping myths
  - the Blueprint view blocked by scenery
  - menu overflow
- **Critical / game breaking:** 7 — the camera method collision, the Rapier crash, the texture crash, the hub hello timeout, the reversed car, the jammed heater and the stalled fades.
- **Most helpful test:** running a myth at many dial settings with rendering off and printing the verdicts.
- **Least helpful test:** render-target screenshots on the WebGPU backend; they hid the real texture crash at first.

## Engine Feedback
- **Liked most:** Rapier's vehicle and character controllers; WebGPURenderer's automatic WebGL 2 fallback.
- **Stuck or guessed wrong:** the vehicle's forward axis (the car first drove backwards), and a sleeping body that didn't wake when pushed from below.
- **Most important thing built myself:** the experiment framework (dials, measured verdicts, goals), the slow-motion replay recorder, and the brick-breaking model.
- **Hardest part:** Rapier's "unsafe aliasing" error. One bad remove leaves the world unusable, and the stack trace points at a later, innocent call.
- **Remove or overhaul:** WebGPU texture lifetime. Disposing a texture that was already rendered crashes a later frame instead of failing at dispose.
- **One change:** breakable joints in Rapier.

## Prompt Feedback
- **Liked most:** free choice of show and genre, paired with concrete technical constraints.
- **Confusing:** "pick a famous tv show" is pasted literally into the Goal and narrative lines. "Multiplayer for the game on its own" doesn't say local or online.
- **Hardest:** tuning the physics so every verdict can be reached and none is guaranteed.
- **The test I'd have run:** a real GPU with a physical DualSense, to judge feel, frame pacing and the audio mix.