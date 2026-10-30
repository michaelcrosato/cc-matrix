I built **Destruction Derby Too Dented** (the title was picked at random from 50 brainstormed options). It's a single file: `DestructionDerbyTooDented-DestructionDerby2-claude-opus-5-5-medium-20261029-0515.html` in the work folder root (209 KB, with Three.js and Rapier loaded from a CDN). The dev modules, build script and tests are in the subfolder of the same name.

**What's in it**
- **Venues:** three of them. Pine Valley Speedway has banked turns, a jump and a pit lane where you repair by stopping in a yellow box. Crossover Chaos is a figure-eight with a shared crossing. The Mud Hollow Bowl is the derby arena.
- **Modes:** wrecking race, stock race, destruction derby and time trial, plus a 3-round championship. Divisions run from 4 up to 1: the top 3 are promoted, the bottom 3 drop down, and progress is saved.
- **Damage:** four damage zones per car. Your front absorbs hits better than your sides and rear. Panels dent visibly, and the hood, bumpers, doors and wheels can tear off as separate physics objects. Damage makes the car pull, slow down, smoke and catch fire, and a wreck explodes.
- **Scoring:** spin a rival 180° for +4 or 360° for +10, roll them over for +8, wreck them for +10. A solid hit is +1, finishing positions score in races, and surviving the derby is +10 (+20 for last car running).
- **Presentation:**
  - Cel shading with ink outlines.
  - Music, sound effects and the gibberish-voiced announcer ("Buck Rivets") are all generated in code, with subtitles.
  - A big-screen, controller-first UI where the keyboard mirrors the pad, with both axis-invert toggles in Settings.
  - Attract mode starts after 10 s idle and any input exits it.
  - Touch-only devices get the "Controller or keyboard required" screen with a Settings button.
- **AI Hub:** the game supports a hub session in side-by-side mode. Each friend plays the same seeded 3-minute derby in the Bowl, and the hub ranks them by points. Outside a session it plays as a normal single-player game.

**Testing.** All of it ran in headless Chromium with software WebGPU, which needed SwiftShader flags and runs at about 3 fps. Nothing was run on a real GPU or with a real controller, and I never listened to the audio.
- **Hub check:** the AI Hub harness passes at 1 player and at 2 players with a player leaving.
- **Scripted tests:**
  - The smoke test walks through the whole menu flow, starts a race and a derby, opens and closes pause, and enters and exits attract mode, with no errors.
  - An autopilot test drives the player car through a full race, a derby and a championship round.

## Source Information
- Date: 2026-10-29 05:15
- Destruction Derby 2
- Tech: Three.js r180 (WebGPURenderer + TSL, WebGPU only, no fallback), Rapier 3D 0.19.3 (`@dimforge/rapier3d-compat`), Gamepad API, Web Audio API, Canvas 2D for textures; plain ES modules bundled into one HTML file, libraries from the jsDelivr CDN
- Art Direction: stylized cel shading. Three-band toon ramp, toon outline pass for ink lines, vertex-coloured track dressing, toon smoke and chunky sparks, gradient sky
- Animation: procedural and physics-driven. Custom raycast suspension on Rapier bodies, panels that dent vertex by vertex, flying parts as rigid bodies, instanced particles, skid marks and crowd, spring-damped chase/TV cameras with shake
- Audio: all synthesized in code. A step-sequenced rock band (menu, race, derby and results songs), synthesized engine, tyres, crashes, explosions, crowd and horn, and Animalese-style gibberish for the announcer with subtitles
- Online: AI Hub Session Protocol v1 (session.js 1.3.0), side-by-side mode with progress, result, stats and awards; no other networking
- Testing: headless Chromium via Playwright with a software WebGPU adapter, console capture, scripted input, screenshots, and the AI Hub harness (1 player, and 2 players with one leaving)
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort medium
- Usage: cost and tokens unknown (I have no meter); session time about 1 h 15 m (from 05:15 to the last build around 06:30)

## Testing Feedback
- **How many issues did testing catch?** 11 game issues, all fixed:
  - Pause closed the moment it opened, because Esc is also Back.
  - An old event was still being updated after a scene swap.
  - Damage was so high that races couldn't be finished.
  - The open pit lane trapped cars against its closing wall.
  - Car-to-car hits were credited to walls, losing wreck points.
  - The AI rammed someone every frame.
  - Derby cars got stuck in slow shoving matches and never wrecked anyone.
  - The hub probe's input reading depended on frame timing.
  - The probe reported "title" while on the main menu.
  - Smoke puffs were oversized next to the camera.
  - A missing-normals warning.

  There were also 2 test-environment problems: headless WebGPU needed SwiftShader flags, and other agents were already using my first two server ports.
- **How many would be considered critical or game-breaking?** 3: the pause menu, races nobody could finish, and the pit-lane trap.
- **Most helpful test:** the autopilot test, with the player car AI-driven through a full race and a derby while logging every impact.
- **Least helpful test:** frame-rate measurements on the software adapter, which say nothing about real hardware.

## Engine Feedback
- **What did you like most about the engine?** Three.js r180's built-in toon outline pass gives a convincing cel look in a few lines. Rapier's ray casts and contact queries made a custom arcade car simple to build.
- **Did you get stuck or guess wrong?** Only small API details:
  - Rapier forces stay applied until you clear them, so they have to be reset every step.
  - Ray hits give `timeOfImpact`.
  - The outline pass only draws on toon materials.
  - Headless rendering was black until I switched to SwiftShader flags.
- **What was the most important thing you had to build yourself?** The vehicle model, plus the pipeline that turns a sudden change in velocity into a damage zone, dents, flying parts and derby points.
- **What was the hardest part about using the engine?** Checking WebGPU visuals and timing on a software adapter running at about 3 fps.
- **If you had to remove or overhaul one thing, what would it be?** The split between the older WebGL-era materials and the node materials. It's easy to pick a material that the outline or post-processing pass quietly ignores.
- **If you could change one thing, what would it be?** A built-in arcade vehicle controller in Rapier's JavaScript API, with tunable tyre grip and per-surface settings.

## Prompt Feedback
- **What did you like most about this prompt?** A clear deliverable, an exact stack with versions, and a multiplayer contract that comes with its own test harness.
- **What was confusing?** "Follow the hub for multiplayer… as well as for the game on its own" could mean "also play standalone" or "also add local multiplayer". I chose standalone single player plus hub sessions, so there is no split-screen.
- **What was the hardest thing to do?** Fitting a full vertical slice into one file and keeping it testable headless: the damage model, three venues, four modes, a championship, attract mode, generated audio and the hub session.
- **If there was one test you could have run, what would it be?** A play session on real hardware with a DualSense, to tune handling, damage and rumble by feel.

All of the above is also on the in-game About & Credits screen and in the HTML comment at the top of the file.