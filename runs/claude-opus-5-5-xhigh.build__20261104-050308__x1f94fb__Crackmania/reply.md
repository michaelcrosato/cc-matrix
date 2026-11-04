I've fixed the split-screen bug I'd left open and added an audit that checks each TASK.md requirement directly. Every test run passes on the final code:

- **Headless:** 810 checks in 16 suites, including the new audit (104 checks) and the scripted whole-game playthrough.
- **Browser:** 44 checks of the built file. New ones confirm a replay plays, its camera cycles and it pauses. Also that on a touch-only phone there are no touch buttons and tapping SETTINGS opens the settings.
- **AI Hub harness, real (not a fake):** all three configurations pass — 2 players; 4 players with latency, jitter and loss; and the host leaving.

The final build differs from the harness-tested one only in two lines of About text (the session time).

The bug was in the engine: with split screen stacked top and bottom, each player saw the other player's camera, and the top view lost its distant scenery. The engine placed viewports from the bottom of the screen, but three.js's renderer measures them from the top. I fixed it (engine change E9, listed in `engine/CHANGES.md`) and checked it with player 2 on the hood camera: each half now shows its own player's view with full scenery. I also hid another player's ghost car when it sits on top of your own, which happens at the start line.

The audit (`tools/tests/features.mjs`, first in `node tools/test.mjs`) checks:

- **Deliverables:** the exact file name, AI Hub's tags with its client as the first script, and no audio files anywhere.
- **Modes:** every mode reachable from the main menu.
- **Dev Mode:** reachable from the pause menu with its tools, and Reset restores all 34 tuning sliders.
- **Attract mode:** starts after 10 seconds idle, loops through all six segments without errors, and any input exits.
- **Controls:** PlayStation glyphs by default with the Xbox option, PC keys, mouse labels, analog triggers.
- **Touch-only:** no touch controls in any scene.
- **About and exit interview:** all four sections on the About pages, `exit-interview.json` parsing and matching them, and no TODO/FIXME/stub markers in the source.

Files are in `work/`:
- Crackmania-TrackMania2003-claude-opus-5-5-xhigh-20261104-050308.html
- exit-interview.json
- Crackmania-TrackMania2003-claude-opus-5-5-xhigh-20261104-050308/ (dev folder)

## Source Information
- **Date:** 2026-11-04 05:03:08
- **Source:** TrackMania (2003, Nadeo)
- **Plan:** PLAN.md
- **Genre and Perspective:** Arcade racing (time attack) with a track-building puzzle mode. Third-person chase camera (far, close, hood) in races; an orbiting three-quarter camera in the editor and puzzles; trackside TV cameras in replays.
- **Tech:** my-3D2dge v0.85.2 (the 2D engine runs the game, the 3D engine draws the worlds), three.js r182 (WebGPU with WebGL 2 fallback), Rapier 0.19.3 (ray and shape casts; the car is a custom kinematic model), AI Hub session client 1.4.0. Built with esbuild 0.25 into one HTML file; tested with Node 24 and Playwright 1.63.
- **Art Direction:** The engine's native low-resolution toon 3D with ink outlines, pixel-art textures baked in code, and saturated trackside colour across three environments: desert, countryside and alpine dusk.
- **Animation:** The engine's rigs, poses and tweens (crowd, Monsieur Drapeau's flag routine, dialog portraits), plus animation driven in code: suspension, wheel spin and steering, lean, flames, roll-overs, windmills, pumpjacks, cows, tumbleweeds, start lights, confetti and fireworks.
- **Audio:** Eight synthesized songs in layers, stings, a WebAudio engine sound per car with a five-speed gearbox and tyre/wind/scrape noise, UI and race effects, and Animalese-style gibberish voices.
- **Online:** AI Hub Session Protocol v1 in ghost mode: up to 4 players, a 3-minute time attack, each other shown as ghost cars. Locally: hot seat (2–8) and split screen (2–4).
- **Testing:** One command. 810 headless checks in 16 suites, including the requirement audit and a scripted whole-game playthrough. `--browser`: 44 Playwright checks of the built file. `--hub`: the AI Hub harness in its three configurations. Testing was unrestricted.
- **Research:** No web research during the build; TrackMania facts came from PLAN.md. I read the engine and AI Hub repositories (manuals, API card, protocol README, harness).
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** Cost and token counts: unknown (not visible to me). Session time: about 2 hours 5 minutes (05:03 to about 07:08).

## Testing Feedback
- **How many issues did testing catch?** 15 real defects:
  - Split-screen views swapped by the engine.
  - Rapier normals read in the wrong frame, so cars stuck to the rails.
  - An upside-down car fell through the road.
  - Cars topped out under their rated speed.
  - Menu buttons existed only once drawn.
  - The focused button carried over between screens.
  - Lower-skill bots out-drove the author bot.
  - Survival rivals were faster than Coco's own time.
  - The editor touched a freed course after a test drive.
  - A split-screen camera with no target crashed.
  - `#replay/last` crashed with no saved replays.
  - A broken line in Survival.
  - Missing font glyphs.
  - Menu tiles overflowing the screen.
  - The hood camera inside the car.
- **How many would be considered critical / game breaking?** 6: cars sticking to rails, falling through the road, unwinnable Survival gauntlets, the split-screen crash, the swapped split-screen views, and the replay crash.
- **What was the most helpful test you ran?** The bot suite (the author bot driving all 15 tracks and 6 puzzles under the real race rules) together with the whole-game playthrough through the real menus.
- **What was the least helpful test you ran?** The block-geometry suite. It never failed, because the plan had already validated those numbers.

## Engine Feedback
- **What did you like most about the engine?** Everything around the game came free and worked headless: fixed steps, scenes, input with rebinding and glyphs, the pause menu and settings, the boot screen, the synth, and `game.advance` for exact tests. The 3D pen made code-drawn cars and props quick to write.
- **Did you get stuck or guess wrong?** Yes:
  - Rapier's `castShape` gives `normal2` in the cast shape's own frame.
  - The engine placed split-screen viewports from the bottom, while three's WebGPURenderer measures them from the top.
  - `onDraw` runs once per viewport.
  - Added cameras start without a target.
  - The font lacks some glyphs.
  - Menu focus built only in draw doesn't exist in headless runs.
- **What was the most important thing you had to build yourself?** The kinematic car that holds loops at speed and falls off when slow; the block catalogue with its ribbon mesher and colliders; and the bot that sets medal times, drives rivals and plays the attract mode.
- **What was the hardest part about using the engine?** Taking over the camera and world layout. A block track over a terrain with 60 m chasms, loop-safe camera poses and split-screen cameras all went through `onDraw` workarounds.
- **What did you change in the engine, and why?** Nine changes, listed in `engine/CHANGES.md`:
  - E1: `pen.frame`, to draw a car in any orientation.
  - E2: camera poses with their own up vector and look-at point, for loops.
  - E3: translucent ghost-car batches.
  - E4: analog trigger values.
  - E5: PlayStation glyphs by default, Xbox as the option.
  - E6: the toon bands exported for track materials.
  - E7: a particle ground override.
  - E8: the missing font glyphs.
  - E9: split-screen viewports measured from the top, so each player gets their own view.
- **If you could change one thing about the engine, what would it be?** A first-class custom-track and camera API: a ribbon builder with loops and banking and its own colliders, and camera poses with an up vector.

## Prompt Feedback
- **What did you like most about this prompt?** Clear deliverables and rules (a failures-only test command, exact file names, the exit interview), a detailed plan with validated numbers, and permission to change the engine.
- **What was confusing?** The plan was written for another run, so its file names carry a different model and date; "TASK.md wins" settled it. That the attract mode should also start on menu pages was clear only from the plan.
- **What was the hardest thing to do?** The scope (nine modes, an editor, puzzles, online, attract mode and Dev Mode in one build), and testing a WebGPU/WebGL game headlessly, where software rendering runs slower than real time.
- **What would you change in this prompt?** Generate the plan with the run's own names, and give a priority order of what to cut first if time runs short.