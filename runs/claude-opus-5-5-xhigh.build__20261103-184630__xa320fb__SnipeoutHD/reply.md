**Snipeout HD** is built. It's an original anti-gravity combat racer based on Wipeout HD, and every feature in TASK.md is in.

- **Game file:** `SnipeoutHD-WipeoutHD-claude-opus-5-5-xhigh-20261103-184630.html` (1.98 MB) in this folder's root, with the source in the subfolder of the same name. It contains no TODO, FIXME or placeholder text. A final check loaded it from file:// in headless Chromium: it reached the title screen with no errors, using the WebGL 2 fallback.
- **Tests:** `node tests/run.mjs` ran **634 checks, all passed** (605 in Node, 25 in the browser, 4 in the real AI Hub harness). After the last text-only edits I re-ran only the quick suites (357 passed), plus that final load check.
- **exit-interview.json** in the root parses and answers every field. The in-game About and Credits screens are built from the same data file.

## Source Information
- **Date:** 2026-11-03 18:46:30
- **Source:** Wipeout HD (Studio Liverpool / Sony Computer Entertainment, 2008)
- **Plan:** PLAN.md
- **Genre:** Arcade anti-gravity combat racing, plus a survival score-attack mode (Overclock) and a combat-points mode (Snipeout)
- **Perspective:** Third-person chase camera (near and far), cockpit view and look-back view. Trackside TV cameras for the intros, replays, spectating, podium and attract mode.
- **Tech:**
  - my-3D2dge v0.85.2 engine with its 3D add-on (World3D)
  - three.js r182 (WebGPU, falling back to WebGL 2) and Rapier 0.19.3, both from the jsDelivr CDN
  - AI Hub session client 1.4.0
  - Plain JavaScript in one HTML file
- **Art direction:** The engine's own style: low-resolution pixel 3D with toon and lambert lighting, bloom, and pixel HUD, fonts and menus. New procedural craft, banked neon tracks, tunnels, pads, gantries and sponsor boards. Four themed worlds (coast, desert, night city, arctic) plus the black-and-neon Overclock look.
- **Animation:**
  - From the engine: rigs drawn as cards and live portraits, tweens and timers.
  - New procedural animation: craft banking, barrel rolls, airbrake flaps, engine glow, boost flames, exhaust trails, shield flashes, explosions with hull shards, the rescue drone, pads, start lights, scenery (Ferris wheel, turbines, trains, traffic, aurora) and HUD and menu motion.
- **Audio:** All made in code:
  - six original electronic songs, in layers that follow the race
  - stings and a full sound-effect catalogue
  - an engine hum for each craft, with Doppler and pan
  - Animalese/Simlish-style gibberish voices for the announcer, pilots and team principals, with subtitles
- **Online:** AI Hub ghost sessions for 1 to 4 players (everyone races the same seeded event and sees the others as ghosts), plus local 2-player split-screen Versus.
- **Testing:** One command, `node tests/run.mjs`:
  - **Node:** unit and physics checks, a matrix of 32 AI races, weapons, modes with an academy drill bot, menu flow, a scripted playthrough of the whole season, audio, and a mock AI Hub.
  - **Browser:** Playwright runs the bundle from file://: keyboard, a simulated DualSense with analog L2, mouse hover and click, a touch-only phone, and split screen.
  - **AI Hub harness:** 2 players; 4 players with latency, jitter and packet loss; and the host leaving.
- **Research:** None beyond the plan. I read the engine docs, the World3D header and the AI Hub README.
- **Environment:** Claude Code CLI (headless) on Linux. Target browser unknown; tested in headless Chromium 1243 through Playwright 1.63.0.
- **Model:** Anthropic claude-opus-5-5, reasoning effort xhigh.
- **Usage:** Cost and tokens unknown (no usage meter was available in this session). About 2 h 45 min of wall-clock time (18:46 to about 21:30).

## Testing Feedback
1. **How many issues did testing catch?** About 30.
   - **17 real defects from the test scripts:**
     - a method and a field both named `place`, which crashed every race
     - bump damage applied on every step of a collision
     - replays drifting out of sync
     - the TV camera director reading an out-of-date shot
     - Snipeout results ordered by finish time instead of points
     - a rescue loop at the gorge
     - "Win now" during the countdown never ending the race
     - a season callback leaking into Quick Race
     - the academy's mine line leaving no gap, and its gates too tight
     - the AI ignoring each team's handling
     - AI pace and damage to the player too harsh at Normal
     - attract mode never showing weapons
     - menu tiles freezing behind dialogs
     - mouse clicks only registering after the first draw
     - a 4-player AI Hub session getting ready too slowly
   - **About 13 look problems from screenshots,** such as the hangar camera sitting outside its walls, a missing font symbol, and overlapping or overflowing text.
2. **How many were critical or game-breaking?** Six: the `place` collision, the replay drift, the TV director error, the gorge rescue loop, the leaked season callback (Quick Race started the season) and the per-step bump damage.
3. **Most helpful test:** The scripted whole-season playthrough (`tests/node/season.mjs`). A bot plays from the prologue through ten events and four Grand Prix rounds to the ending and credits, using the real screens. It found the AI pace and handling problems that no unit check could, and it proves every screen, unlock, save and dialog leads to the next. The 32-race AI matrix was a close second.
4. **Least helpful test:** The first screenshots with forced SwiftShader WebGPU flags. They came back white because of the headless setup, not the game. With default flags the renderer falls back to WebGL 2 and draws correctly.

## Engine Feedback
1. **What did you like most?** The standard features came free: pause menu, settings, rebinding, saves, the boot screen and `input.label()`. The exact fixed time step and headless `game.advance()` made the whole game testable in Node. World3D's streamed terrain and smoothed fixed camera carried the 3D side.
2. **Did you get stuck or guess wrong?** Yes, a few times:
   - A headless game must `await game.booted` before advancing.
   - The headless browser runs a few frames a second, capped at 50 ms of game time per frame, so tests have to wait in game time, not real time.
   - The pixel font had no PlayStation symbols or middle dot.
   - The pause menu is HTML, so dev mode has to resume the game and hold the race itself.
   - `explosion()` adds a hit-stop freeze by default.
3. **Most important thing you built yourself:** The track system and its physics. The spline is cut every 2 m into banked slices, with track-relative coordinates that stay correct where the track passes over itself. It handles drops, gaps, tunnels, open edges, pads and the pit lane, plus the racing line and a speed profile for each team. The AI, weapons, replays and HUD are all built on it.
4. **Hardest part:** Building three.js geometry in the engine's left-handed axes (the axis swap, triangle winding and normals, the camera roll direction), and checking the picture in a headless browser running at a few frames a second.
5. **What did you change in the engine, and why?** Five edits, each marked `SNIPEOUT EDIT`:
   - Button symbols default to PlayStation, with the choice in Settings → Display, and players who join inherit it. The game is designed around a DualSense.
   - PlayStation symbols and a few marks added to both pixel fonts, so button labels print.
   - `input.value(action)` to read analog buttons, so L2 and R2 work as gradual airbrakes.
   - Synth extensions for the electronic music: filter envelopes, detuned voices, pan, accents, clap and sub-boom drums, and ducking under the kick drum.
   - A World3D option to set where particles land, so sparks hit the track deck rather than the terrain far below.
6. **One thing you would change:** Add a banked ribbon track to World3D, with jumps, tunnels and overpasses built in, so 3D racing games don't have to rebuild the hardest part.

## Prompt Feedback
1. **What did you like most?** The definition of done. Every requirement can be checked (one file, no stubs, dev-mode sliders, a 10-second attract mode, controller-first prompts, touch-only behaviour, the hub harness), and the plan was detailed enough to build and test against.
2. **What was confusing?** Names:
   - PLAN.md was written for another run (its file names end `max-20261103-174728`), while TASK.md asks for this run's xhigh name.
   - TASK.md says to pick a title with a random number generator, while STAGE.md says to use the plan's title.
   - I used the plan's title (Snipeout HD) with TASK.md's file names.
3. **Hardest thing to do:** Keeping the full scope complete with no stubs (eleven modes, a season with a Grand Prix and an ending, an eleven-drill academy, split-screen versus, replays, attract mode, dev mode, AI Hub), then balancing the AI and combat so both a perfect bot and a person can win medals at Normal.
4. **What would you change?** Leave run-specific names to TASK.md, or generate them together with the plan. Name a target browser and GPU for visual checks, since headless Chromium here couldn't show the WebGPU path. And state the time budget for the build.