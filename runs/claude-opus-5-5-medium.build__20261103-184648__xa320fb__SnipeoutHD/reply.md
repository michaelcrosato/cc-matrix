I played the game in a real browser using only real keyboard, mouse and touch events, with nothing in the game driven by code. That play found and fixed one more real bug. On the final build, the full test command reports **486 passed, 0 failed** (exit code 0) and the per-requirement audit passes 26/26.

The real-input playthrough is now part of the test suite (`tests/browser/realinput.test.mjs`, 19 checks). It covers the features the hook asked about:
- **Attract mode:** with no input it starts after the idle time. An unbound key (M) returns to the title.
- **Academy:** Enter on the title, the arrow keys down to ACADEMY, Enter to start, then Enter on the drill card. Holding W passes the THRUST drill.
- **Dev mode:** Esc pauses, and clicking "Dev mode" opens the panel. E switches to the tuning tab, the arrow keys move a live slider, and Enter on RESET ALL restores every default. Esc closes back to the pause menu, and Quit with its confirmation returns to the menu.
- **Season:** a mouse hover and click on SEASON opens the team pick. Clicking CONFIRM plays the prologue with ORACLE's emblem portrait, and Enter pages through it to the season hub. Enter on ACADEMY plays its briefing and starts season event E1.
- **Touch-only:** on an emulated phone the game detects a touch-only device and draws no touch controls. Tapping SETTINGS opens the settings screen.

The bug it found: pressing Esc inside the Dev mode panel was also caught by the engine's own pause key. That paused the game underneath with the panel still flagged open. The panel now handles Esc itself while it's open and then reopens the pause menu properly.

`exit-interview.json` parses, every field is answered, and it contains no "unknown" values.

## Source Information
- **Date:** 2026-11-03 18:46:48
- **Source:** Wipeout HD (Studio Liverpool / Sony Computer Entertainment, 2008)
- **Plan:** PLAN.md
- **Genre and Perspective:** anti-gravity combat racing (arcade), plus a survival mode (Overclock) and a combat-points mode (Snipeout). Third-person chase camera (near and far), cockpit view and look-back. Trackside TV cameras for intros, spectating, replays and attract mode.
- **Tech:** my-3D2dge v0.85.2 handoff engine (with marked edits) and the my-3D2dge 3D add-on v0.85.2 (World3D). three.js r182 (WebGPU, falling back to WebGL 2) and Rapier 0.19.3 from the jsDelivr CDN. AI Hub session client 1.4.0. Plain JavaScript. Node and Playwright 1.63.0 for tests.
- **Art Direction:** the engine's native style: pixel-resolution 3D with toon and lambert lighting, bloom, and the engine's pixel fonts and HUD. New procedural assets: six liveried craft designs, neon-walled banked tracks, tunnels, pads, gantries, sponsor boards, four themed worlds and a neon-grid Overclock skin.
- **Animation:** the engine's rigs (pilot cards, live portraits, podium poses) and tweens. New procedural craft animation: banking, barrel rolls, airbrake flaps, engine glow, trails, shield flashes, explosions and the rescue drone. Animated scenery and weather.
- **Audio:** six original electronic songs written as code for the engine's tracker, which I extended with filter envelopes, unison, pan, accents, claps, sub booms and sidechain. Layers come in at GO and on the final lap. About 60 synthesized sound effects, engine hums with Doppler and pan, and Animalese/Simlish-style gibberish for the announcer, pilots and team principals.
- **Online:** AI Hub ghost-mode sessions for 1–4 players, and local 2-player split-screen Versus.
- **Testing:**
  - headless Node suites using game.advance and game.debug: unit, physics, race, weapons, modes, flow, audio, hub mock, and a scripted playthrough of the whole game
  - Playwright browser checks of the single file
  - a real-input playthrough driven only by keyboard, mouse and touch events
  - the real hub harness in 3 scenarios
  - the per-requirement audit (`tools/task-audit.mjs`) and screenshot reviews
  - all behind one command that prints failures only and a one-line count
- **Research:** none beyond PLAN.md, the engine's API card and World3D header, and the AI Hub README.
- **Environment:** Claude Code CLI (headless); Linux; browser: headless Chromium build 1243 (Playwright 1.63.0, WebGL 2 backend) for every browser test and screenshot.
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** about 0.48 MB of code and tests written, which is roughly 140K output tokens for code and about 200K output tokens in all. Input tokens and API cost in USD weren't visible to me, so I haven't estimated them. Session time is about 2 h of wall clock (18:47 to 20:45 MST).

## Testing Feedback
1. **How many issues did testing catch?** About 33 real issues. The headless suites, bot-driven scripts, the real-input playthrough, screenshot reviews and the requirement audit found them. Examples:
   - Esc in the Dev mode panel also being taken by the engine's pause key (found by real-input play)
   - two scene fields named `view` and `res` that the engine silently treats as scene options
   - a crash on entering the menu
   - replays going out of sync (three separate causes)
   - the hub round never starting
   - craft popping up onto the far side of the gorge instead of crashing into it
   - the railshot missing at range
   - mouse hover not moving the focus
   - menu buttons losing their hit areas
   - mirrored sign boards
   - weapons eliminating five of eight craft per race
   - REPLAY offered after the Academy
   - four overlap problems found in the screenshot review
2. **How many were critical?** About 8:
   - Esc in the Dev mode panel leaving the game paused under it
   - the menu crash
   - the academy crash on entry
   - the hub session never starting
   - replay desyncs (two separate causes)
   - the team screen's CONFIRM button missing and unclickable
   - unbound keys not leaving attract mode
3. **Most helpful test:** the scripted playthrough of the whole game. It caught balance problems, drill limits that were too tight, and state leaking between modes. The real-input playthrough came close: it found the Dev mode Esc bug that tests calling the game directly couldn't see.
4. **Least helpful test:** the screenshot brightness check. It mostly flagged the deliberately black Overclock skin. Real visual problems were found by looking at the screenshots.

## Engine Feedback
1. **What I liked most:** everything around the game came for free and worked: fixed time steps, headless testing with game.advance, the boot screen, pause menu, settings, key rebinding, saves, per-player input and split screen. World3D let me add my own three.js meshes and cameras under the same pixel HUD, fonts, dialogs and portraits.
2. **Did I get stuck or guess wrong?** Yes:
   - scene fields named `view` and `res` are read as engine options
   - `game.go` takes the fade as its third argument
   - moving the mouse doesn't change `input.lastDevice`
   - the mouse wheel is only reported where a scene allows zoom
   - the engine's pause key keeps acting while the game's own overlay is open, and its HTML pause menu only clears itself while the scene is pausable
   - text came out mirrored because of the axis swap between the engine and three.js
   - headless WebGPU loses its device, so browser tests need `?backend=webgl`
3. **Most important thing I built myself:** hover physics that work in track space on a banked spline, with the track mesh builder and the terrain carving around it. World3D's own track and vehicle can't handle Wipeout speeds, tunnels, drops, gaps or overpasses.
4. **Hardest part:** coordinate conventions. The engine's axes map to three.js by a mirror flip, which reverses triangle winding, the camera roll sign and text direction. I had to check each one with screenshots.
5. **What I changed, and why:** five marked edits:
   - PlayStation button symbols by default, with the option in Display settings
   - PlayStation symbols added to both pixel fonts
   - analog trigger values, for the airbrakes
   - synth extensions, for an electronic soundtrack
   - a game-supplied particle ground, so sparks land on the track deck
6. **One thing I'd change:** a built-in ribbon track for World3D with track-relative queries, banking, tunnels, gaps and overpasses. Smaller alternative: keep scene options in their own object so they can't collide with a scene's own fields.

## Prompt Feedback
1. **What I liked most:** the done criteria are concrete and testable, the hub harness proves the integration, and the one-command testing rule kept the feedback loop fast.
2. **What was confusing:** the brief says to build on `dist/handoff`, but its 2D views can't show a banked 3D track, while the add-on that can lives outside that folder. The plan also used another run's folder and file names.
3. **Hardest thing:** the breadth in one pass — eleven modes, a season, the academy, attract, dev mode, split screen and hub sessions, all tested — while judging 3D only from screenshots.
4. **What I'd change:** say how to trade scope against polish when time is short, give a reference TV resolution, and say plainly whether engine add-ons count as part of the engine.