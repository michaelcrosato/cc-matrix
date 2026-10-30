The game is finished: **Waddle of Trouble**, an original spiritual successor to Deep Duck Trouble. I picked the title by random draw from 50 candidates. The single file is `WaddleOfTrouble-DeepDuckTroubleStarringDonaldDuck-claude-opus-5-5-medium-20261029-0456.html` in the work folder root, and the dev modules are in the matching subfolder.

**What's in it:** You play Dudley Drake, a sailor duck with a short temper. Uncle Barnaby bought a cursed pendant, puffed up like a balloon and is floating away. To lift the curse you visit four stages from a 3D island map, each with a boss:
- **Coconut Coast** – Captain Pinchley, a crab.
- **Rumbling Ruins** – a boulder chase, then Totem Tonga. You beat him by kicking crates into him.
- **Frostbeak Peak** – slippery ice, falling icicles and wind gusts, then Baron Blubberstorm, a walrus.
- **Pufftoa's Shrine** – a climb with rising lava, then the Great Pufftoa, a two-phase final boss.

**Moves and pickups:**
- Dudley can run, dash, jump higher by holding jump, kick on the ground or in the air, and stomp.
- Kicked crates slide, knock over enemies and break cracked walls.
- Defeating enemies fills a Temper meter; when it's full you can throw a Tantrum and be unstoppable for 6 seconds.
- There are 11 enemy types, chests, springs, moving and falling ledges, checkpoints, and 3 hidden Golden Feathers per stage.

**Around the game:**
- A title screen, story scenes with gibberish voices, end-of-stage score screens, game over / continue, and an ending.
- Settings, including the invert-horizontal and invert-vertical stick toggles.
- How to Play and About & Credits screens.
- After 10 seconds idle on the title screen, a demo plays itself in a loop; any input exits it.
- Inside an AI Hub session it plays as a side-by-side round.

**How I tested it:**
- Testing ran in headless Chrome on software WebGPU at about 5–7 fps. I have not tested it on a real GPU, with a real controller, or with the audio actually heard.
- An AI player ran all four stages at sped-up speed. Every stage, both chases and all four bosses ran through to collecting the gem with zero errors, but that AI cheats (it can't be hurt), so it doesn't prove the stages are fair for a real player. I checked jump distances by calculation instead.
- The AI Hub harness passes every check at 1, 2, 3 and 4 players.
- An emulated PS5 controller worked for menus, movement, Options/Circle, and the invert toggle; Create+Options is left to the hub.
- On a touch-only device it shows "Controller or keyboard required" with a working Settings button.
- A headless browser can't screenshot a WebGPU canvas, so the game exposes a small snapshot function (`window.__snapshot`) and a few test handles. They are harmless.

## Source Information
- **Date:** 2026-10-29 04:56
- **Source:** Deep Duck Trouble Starring Donald Duck (SEGA, 1993, Master System / Game Gear)
- **Tech:** Three.js r180 (WebGPU renderer only, no fallback); Rapier 0.19.3 (character controller for Dudley, physics-driven crates, moving and falling ledges, ray casts); Gamepad API with standard mapping and rumble; Web Audio API; AI Hub Session Protocol v1, client 1.3.0; plain JavaScript modules loaded from the jsDelivr CDN; HTML/CSS for the interface.
- **Art Direction:** Stylized cel-shading: a hard 3-step toon ramp, dark ink outlines of even thickness, flat saturated colours per zone, gradient skies, banded toon water and lava, real-time shadows.
- **Animation:** All procedural, in code: squash and stretch, sine-driven run cycles, wind-up and follow-through on kicks, springy landings, blinking and breathing, particle bursts. No keyframe files.
- **Audio:** All written in code: a step sequencer plays 8 original tracks and 4 jingles; every sound effect is synthesized live; voices are Animalese-style gibberish made from pitched blips per letter.
- **Online:** AI Hub side-by-side mode: same seeded start for everyone, live score updates, final score with stats and awards, state probe for the harness. No other network features.
- **Testing:** Lightweight. Syntax and lint checks on the bundle; headless Chromium smoke runs with console-error capture and snapshots; scripted keyboard walks through every screen; emulated controller; touch-only emulation; sped-up AI runs of all stages; AI Hub harness at 1–4 players.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **How many issues did testing catch?** 11 in the game, plus 2 in the test setup itself (blank WebGPU screenshots, and an upside-down snapshot).
  - Ink outlines didn't show at all, and then were too thin.
  - The black fade stayed on screen through each stage's intro dialog.
  - One Esc press closed two menus at once.
  - Esc on the map went to the title screen instead of settings.
  - The map camera hid the Ruins stage behind the volcano.
  - The settings list overflowed its panel.
  - Quick key taps were lost when the frame rate was low.
  - Boss-defeat timing used real-world time instead of game time.
  - The demo AI got stuck in two stages.
  - The AI Hub probe missed input when frames were slow.
- **How many were critical / game-breaking?** 1: the black fade hiding the start of every stage.
- **Most helpful test:** The sped-up AI run of all four stages through to boss defeat.
- **Least helpful test:** Plain headless screenshots, which came back blank for WebGPU.

## Engine Feedback
- **What I liked most:** Rapier's character controller. It handles ground detection, sliding and snapping, and its filter hook made one-way ledges a few lines of code.
- **Did I get stuck or guess wrong?** Yes: getting outlines to render took two fixes. Using the world-space normal in the outline shader drew nothing; I had to push outward along the object's own normal and divide by its scale. I also had to check a few renamed Rapier 0.19 API names against its type definitions.
- **Most important thing I built myself:** The fixed-step update order (moving ledges, then the character controller, then the physics step), so riding ledges and kicked crates feel solid.
- **Hardest part:** Even ink outlines on stretched primitives under WebGPU without a post-processing pass.
- **If I removed or overhauled one thing:** Three.js's two parallel material families (the older ones and the WebGPU node ones), with docs split between them.
- **If I could change one thing:** A built-in toon outline or edge-detection pass for the WebGPU renderer.

## Prompt Feedback
- **What I liked most:** A clear definition of "done", with freedom over tech and art; the controller-first 10-foot rules and the attract-mode rule make it feel like a real product.
- **What was confusing:** The testing questions come up front but can only be answered at the end; "single file" versus "CDN allowed" leaves how much to bundle open.
- **Hardest thing to do:** A full vertical slice (4 stages, 4 bosses, map, story, demo mode, settings, hub mode) in one pass with only lightweight testing.
- **The one test I'd have run:** A full playthrough of every stage on a real GPU with a real controller, recorded, with frame timing.