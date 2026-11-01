**Synthpunk 2084** is built: `Synthpunk-2084-cyberpunk-2077-claude-opus-5-5-medium-20261031-2047.html` (1.2 MB, one file) is in the run folder's root. The dev files are in `Synthpunk-2084-cyberpunk-2077-claude-opus-5-5-medium-20261031-2047/`, and `node tools/build.mjs` rebuilds the bundle. The title was picked by a secure random draw from 50 riffs on the name. The sources contain no TODOs, placeholders or stubs.

**What's in it:** "The Halo Job", one rainy neon night in Lotus Row, Halcyon Sprawl.
- **Story:** a 9-zone open district. You pick a lifepath (Street Rat, Ex-Corpo or Nomad), which opens extra dialogue options. Some choices are timed. Madame Ozu, a fixer, sends you to steal a chip from Ironjaw Krupa's gang yard. Krupa can be fought or talked past three non-violent ways. The chip holds Silas Vane, a dead rockerboy's mind. There are three endings.
- **Combat:** first-person pistol, smart SMG (rounds curve to targets), shotgun and katana; loot with rarities; grenades.
- **Stealth and hacking:** detection meters, lethal or non-lethal takedowns, a scanner that slows time, quickhacks on enemies, cameras and turrets, and a Breach Protocol puzzle.
- **Systems:** Sandevistan (time-slow), a ripperdoc and a gun vendor, a drivable car you can summon, street traffic, police heat, XP, levels and three perk trees, two side gigs, data shards, and save/load with autosave.
- **Modes:** after 10 seconds idle on the title, a bot plays with cheats on, driving and then fighting. Gig Rush is the arcade mode and the AI Hub round.
- **Controls and UI:** controller-first menus that keyboard and mouse can also drive, with PS button prompts. Settings has Invert Horizontal Axis and Invert Vertical Axis for the gamepad. Touch-only devices get "Controller or keyboard required" and a Settings button.

**Not verified:** all testing was headless software rendering (WebGL 2). I haven't tested a real GPU, the WebGPU look, or a physical DualSense. The harness skips the emulated-gamepad part of its own check. Headless ran the game at a fraction of real speed, so feel, aim assist and attract-mode timing still need checking on real hardware.

## Source Information
- **Date:** 2026-10-31 20:47
- **Source:** Cyberpunk 2077 (original homage; no assets taken)
- **Tech:** my-3D2dge v0.85.1 (2D and 3D engines), three.js r182 (WebGPURenderer, WebGL 2 fallback) and Rapier 3D 0.19.3, both loaded from the jsDelivr CDN; Web Audio; HTML/CSS for the UI; AI Hub session client 1.3.0
- **Art Direction:** comic cel shading (flat light bands, ink outlines, bloom) on a rainy neon night city; lit-window towers, neon signs and holograms are drawn by code
- **Animation:** the engine's procedural Humanoid rigs as 3D puppets (walk, aim, crouch, hurt, die, melee). The first-person weapons are code-animated (sway, bob, recoil, reloads, katana swings). No motion-capture clips were loaded.
- **Audio:** all written in code: synthwave songs (title, street, yard, combat, rush, ending), synthesized sound effects, rain and city ambience, and gibberish voices under every subtitle
- **Online:** AI Hub side-by-side mode (Gig Rush: seeded start, progress, results with stats and awards, probe); no game traffic
- **Testing:** headless Chromium (Playwright, SwiftShader) screenshots, scripted runs through the main quest and an ending, and the AI Hub harness at 1 and 2 players and with a player leaving. All pass.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown; session time about 1 h 05 min

## Testing Feedback
- **Issues caught:** 14.
- **Critical / game-breaking:** 4.
  - The cel filter plus the engine's first-person overlay rendered a black screen.
  - The Breach Protocol screen was invisible.
  - Key taps were lost between engine ticks, which stalled dialogue.
  - Hub progress was never sent at low frame rates, which fails the hub's check.
- **Most helpful test:** screenshots of real play states. They exposed the black frame, the oversized gun model and the invisible menus.
- **Least helpful test:** watching attract mode headless in real time. The slow simulation never got the bot out of the car.

## Engine Feedback
- **Liked most:** the 3D engine's header works as its whole manual, and the level is a text map. One string gave collision, enemy pathfinding, the ground and the minimap; the character controller, cars and rigs came free.
- **Stuck / guessed wrong:**
  - `world.filter` must be given every field, or the picture silently goes black.
  - The first-person overlay plus a filter gives a black frame.
  - Camera FOV is vertical, not horizontal.
- **Most important thing I built:** the first-person layer (a weapon model that never sinks into walls, controller input with axis invert, aim assist, the camera) and a full HTML UI readable from a couch.
- **Hardest part:** debugging a black frame with no error message.
- **Remove / overhaul:** how the overlay pass interacts with filters. It fails silently.
- **Change one thing:** let `world.filter` accept a partial object, and add a first-person weapon API that works with filters.

## Prompt Feedback
- **Liked most:** the explicit "Done" criteria and the concrete axis-inversion issue to build a fix for.
- **Confusing:**
  - The art and animation repos are pipelines and tools, not runtimes you can drop in.
  - The run-name hints (art-cel, ani-free) differ from TASK.md.
  - "Feature-complete" pulls against "keep testing lightweight".
- **Hardest:** fitting a Cyberpunk-scale feature list into one coherent, controller-first slice in a single session.
- **One test I'd have run:** a real-GPU playthrough with a real DualSense at 60 fps, on both WebGPU and WebGL 2.