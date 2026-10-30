**Goof Swoop** is finished. The real RNG picked that title from 50 candidates. The game is a single file in the work folder root, `GoofSwoop-GoofTroop-claude-opus-5-5-medium-20261029-0201.html` (about 250 KB). Three.js and Rapier load from the jsDelivr CDN. Dev sources and the build script are in the `GoofSwoop-GoofTroop-claude-opus-5-5-medium-20261029-0201/` subfolder.

I couldn't watch it run on real WebGPU. Headless Chrome under SwiftShader starts WebGPU but loses the device within about a second, even for a minimal three.js page. So all visual checks used a test-only copy forced onto three.js's WebGL2 backend (`test-webgl.html` in the dev folder). The shipped file stays WebGPU-only: without WebGPU it shows a "needs WebGPU" screen.

**What's in it**
- **Story and characters:** Duffy and his son Rex chase Captain Squall, whose parrot swooped off with their grumpy neighbour Mort. The characters and dialogue are original, written in a Saturday-morning-cartoon tone, with gibberish voices.
- **Seven rooms**, built from a text-grid level format a designer can edit, with a chest item, sign or quip in each:
  - a beach to clear of pirates
  - a kick-block switch puzzle with a reset rune
  - a lagoon crossed with the Grapple Hook
  - a pier with pits you bridge with a reusable Plank
  - dunes where you dig X marks with the Shovel to find a key for a locked door
  - a brig where the Dinner Bell lures a giant guard away from the exit
  - a two-phase boss fight on a ship, with a parrot that drops barrels and bombs you can throw back
- **Moves:** lift and throw barrels, pots, bombs and dizzy pirates; kick blocks; dash. Your gear is shared by the team and you swap between items. Plus hearts, fruit, gems, extra tries, game over with Continue, a save/Continue on the title, an ending scene, and a results screen with a rank.
- **Menus (controller-first, big text):** title, How to Play, Settings (three volume sliders, invert horizontal and vertical, screen shake, text speed, camera, button prompts, reset), About & Credits, and a pause menu with Regroup and Restart Room. Button glyphs follow your last device. Touch-only devices get "Controller or keyboard required" with a Settings button.
- **Attract mode:** after 10 seconds idle on the title, two cheating bots play the whole demo, using all four items and beating the boss. Any input exits.
- **Multiplayer:**
  - **Local:** 2-player co-op on one screen, with two controllers or a split keyboard.
  - **AI Hub:** co-op for 1–4 players, where the host runs the shared world. Rounds hosted by a server with no player also work.

**Tests run**
- A scripted mechanics test of every puzzle, item, knock-out and the boss: 32/32 pass.
- A fast-forwarded attract run that reached the boss and won.
- The AI Hub harness passes:
  - 2 players
  - 4 players with 150 ms latency and 5% packet loss
  - host leaves mid-round
  - server-hosted round
  - with an emulated DualSense
  - the real WebGPU file at 2 and 4 players
- One earlier run failed the controller Options-menu checks because frames are very slow under SwiftShader; a rerun passed.

## Source Information
- **Date:** 2026-10-29 02:01
- **Source:** Goof Troop (Capcom, SNES, 1993)
- **Tech:** Three.js r180 (WebGPURenderer, TSL node materials, WebGPU only with no fallback), Rapier 0.19.3 (`@dimforge/rapier3d-compat`: character controllers, collision groups, thrown objects with collision events), Gamepad API, Web Audio API, AI Hub session client 1.3.0
- **Art Direction:** stylized cel shading: a 3-step toon ramp, black ink outlines, a flat saturated palette, and comic word pops ("BONK!", "KA-BOOM!")
- **Animation:** procedural: characters built from simple shapes with code-driven walk cycles, squash and stretch, carry/throw/kick/dance poses, spin-launch slapstick, and particles
- **Audio:** music written in code (steel-drum calypso, puzzle and boss themes), synthesized sound effects (slide whistles, bonks, booms), and Animalese-style gibberish voices for each character
- **Online:** AI Hub Session Protocol v1 in co-op mode (1–4 players, host runs the world, server-hosted rounds supported), plus local 2-player co-op
- **Testing:** lightweight: a syntax check, level-grid validation, headless Chrome through Playwright with visuals checked on the WebGL2 test copy, the scripted mechanics test, the fast-forwarded attract run, and the AI Hub harness
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** about 1 h 20 min of session time (02:01–03:19). API cost and token counts: unknown.

## Testing Feedback
- **How many issues did testing catch?** 15. They included:
  - a crash while building the level
  - the dig list being overwritten, so the key never appeared
  - the brute's collider being wider than his corridor, so the bell couldn't lure him
  - pressed keys not being cleared after a failed frame, so menus re-toggled
  - two attract-mode stalls
  - idle and co-op timers that depended on frame rate
  - smaller layout and lighting problems
- **How many were critical or game-breaking?** 3: the level-build crash, the missing key (a dead end at the locked door), and the menu re-toggle.
- **Most helpful test:** the scripted mechanics run through every room. It found the worst bugs in one pass.
- **Least helpful test:** headless WebGPU screenshots, which always came back blank because of the device loss.

## Engine Feedback
- **What did you like most?** TSL node materials: the ink outline took one line, and the animated cel water took a few. Rapier's character controller and collision groups were also very handy, for example letting pirates avoid pits while thrown barrels fly over water.
- **Did you get stuck or guess wrong?** Yes, in three places:
  - `MeshToonNodeMaterial` ignores `flatShading` when you pass it to the constructor.
  - `readRenderTargetPixelsAsync` failed on a fresh render target.
  - Headless WebGPU kept losing its device.

  Also, WebGPURenderer silently switches to WebGL2 when WebGPU is missing, so "no fallback" needs an explicit backend check.
- **Most important thing I built myself:** the cel-shading setup (including outlines on instanced meshes), every model and animation rig, the tile-grid level format, the netcode, and the music sequencer.
- **Hardest part:** checking WebGPU output without a GPU, and keeping Rapier queries in step with the fixed-timestep simulation on both host and client.
- **Remove or overhaul one thing:** WebGPURenderer's silent automatic WebGL2 fallback. Make it opt-in.
- **Change one thing:** ship an official toon outline pass that works with instanced meshes, and a simpler Rapier JS API for characters that are a collider without a rigid body.

## Prompt Feedback
- **What did you like most?** The exact deliverable name, the clear controller-first 10-foot brief, and concrete asks like attract mode and the invert toggles.
- **What was confusing?** The AI Hub docs ask for a WebGL2 fallback and short rounds, but the prompt says WebGPU with no fallback and a long demo. I declared WebGPU as required for the hub and made one full-length co-op round. "Testing parameters allowed" was also unclear.
- **What was the hardest thing to do?** Fitting a full vertical slice (puzzles, four items, a boss, story, attract mode, local and online co-op) into one pass and still being able to verify it.
- **If there was one test you could have run, what would it be?** A real-GPU playthrough with a DualSense on a TV, plus a real 4-device AI Hub session, to tune game feel, text readability and netcode smoothness.