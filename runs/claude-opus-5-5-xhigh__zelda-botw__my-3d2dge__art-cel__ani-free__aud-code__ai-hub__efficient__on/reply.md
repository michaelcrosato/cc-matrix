I built the game and named it **Teeth of the Wild** (picked with a random number generator from 50 brainstormed titles). It is one HTML file in the folder root, `TeethOfTheWild-Zelda-BOTW-claude-opus-5-5-xhigh-20261031-2249.html` (1.6 MB), with dev files in the matching subfolder. three.js and Rapier load from jsDelivr; everything else is inline.

All testing ran in headless Chromium with software rendering (WebGL 2, about 3–6 fps). It has never run on a real GPU or with a real controller. On that setup:
- The opening, combat, climbing, gliding, swimming, cooking, a full shrine, the tower, both bosses and the ending credits all work end to end.
- The AI Hub harness passes all 20 checks with 1 and 2 players and with a player leaving. That includes a run against the bundled single file.
- The CDN version of the file boots.

**What's in the demo.** It's built on the Great Plateau model:
- **Opening and main quest:** you wake in a shrine, follow smoke to the Hermit, climb the Fanged Tower to reveal the map, and clear four rune trials (magnet, bombs, time-freeze, ice pillars). The Hermit's reveal gives you the glider, then you fight the Gloom Warden boss. Gliding off the edge rolls the credits.
- **Movement:** climb anything (slippery in rain), glide on fire updrafts, swim and drown, and take fall damage.
- **Combat:**
  - Weapons, bows and shields wear out and break.
  - Shield parries turn the Warden's beam back.
  - A last-moment dodge triggers Flurry Rush, and you get slow-motion aiming in the air.
  - Sneak attacks, throwing, lock-on and shield surfing.
- **Enemies:** camps that spot you and raise the alarm, skeletons and bats at night, a sleeping one-eyed giant, laser turrets, and wildlife and critters you can hunt or catch.
- **World systems:** cooking and elixirs with a recipe book, cold that drains hearts, a weather forecast, lightning that seeks metal gear, grass fire that spreads with the wind, a day/night cycle, and a Hunger Moon that respawns enemies.
- **Side content:** 12 seed puzzles, a shop, pocket upgrades, heart and stamina blessings, fast travel, map pins, quest tracking, saves and settings. Settings include the four invert-axis toggles (camera and movement, horizontal and vertical).
- **Required extras:** attract mode starts after 10 s idle on the title, phones show "Controller or keyboard required" with a Settings button, and every sound is synthesized, including gibberish voices.

Your engine renders the 3D world, but the HUD and menus are HTML laid over it, because its pixel-art canvas didn't suit a crisp interface for a TV across the room. I deleted the 5.5 GB of reference repos I had cloned into the dev folder.

## Source Information
- **Date:** 2026-10-31 22:49
- **Source:** Zelda-BOTW
- **Tech:**
  - my-3D2dge v0.85.1: its 2D engine runs the loop, input and boot; its World3D engine runs the open-world terrain, physics, characters and camera.
  - three.js r182 (WebGPURenderer, with automatic WebGL 2 fallback).
  - Rapier 3D 0.19.3 (simd-compat).
  - AI Hub session client 1.3.0.
  - Plain JavaScript, HTML and CSS.
- **Art Direction:** Anime Cel (from my-ai-3d-demo): two-tone toon shading, outlines tinted to the colour of what they outline, a bright sky with clouds, saturated greens.
- **Animation:** the CC0 clips catalogued in my-3danimations (Mesh2Motion and Quaternius: wall climb, glide, swim, bow, eat, shield, dodges, deaths) mapped onto the engine's procedural characters, plus the engine's own procedural attack moves. Animals, bosses and gear are posed by code.
- **Audio:** all code-written: a WebAudio synth with generated reverb, adaptive generative music, synthesized sound effects and ambience, and Animalese-style gibberish voices.
- **Online:** AI Hub Session Protocol v1, side-by-side mode (seeded start, live progress, scored result). No other network features.
- **Testing:** Playwright in headless Chromium on SwiftShader WebGL 2 (1280×720, plus an emulated phone), scripted input with condition waits and screenshots, ESLint for undefined names, and the AI Hub harness.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** cost and tokens unknown. Session time is about 2 hours (22:49 to about 00:50).

## Testing Feedback
- **Issues caught:** 16.
- **Critical:** 7.
  - A crash during boot.
  - The play scene never started.
  - A crash inside shrines only.
  - The hero fell through shrine floors on the first frame.
  - An edge-of-map push flung the hero around inside shrines.
  - The tower terminal was out of reach, which blocked the main quest.
  - In a hub session the game opened on the title screen.
- **Most helpful:** scripted runs that logged the hero's state over time (one showed his speed exploding inside a shrine), and the hub harness.
- **Least helpful:** fixed-time waits on a 3–6 fps renderer. They raced the game and gave false failures.

## Engine Feedback
- **Liked most:** World3D's streamed open-world terrain, and the mocap pipeline: captured clips on procedural characters with one call.
- **Stuck or guessed wrong:**
  - There's no public way to change the time of day, so the day/night cycle reaches into private sun, sky and light members.
  - Rays skip floors unless you pass `{ down: true }`.
  - A new level's floor isn't solid until its first physics step.
  - `game.go()` doesn't work until the boot finishes.
- **Built myself:** climbing, gliding, swimming, the invertible camera, water, the four rune powers, spreading fire, cooking, and the whole HTML interface.
- **Hardest part:** the engine's size, and that its pixel-canvas interface doesn't suit a 10-foot UI.
- **Overhaul:** the 3D world's dependence on the 2D engine's pixel canvas, which positions, the HUD and input are all measured in.
- **Change one thing:** a first-class open-world kit with water, climbing, gliding and time of day built in.

## Prompt Feedback
- **Liked most:** an ambitious, clear target with room to modernize, and concrete controller-first rules.
- **Confusing:**
  - my-3danimations sits beside an engine that already ships the same clips.
  - Does "multiplayer for the game on its own" mean a second netcode?
  - Testing Feedback is asked for but missing from the required sections.
- **Hardest:** fitting every pillar of the original into one complete, tested slice.
- **One test I'd run:** an hour on a real DualSense and real GPU, recording how input and camera feel.