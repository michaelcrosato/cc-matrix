I've built **Brave Spencer Musashi** and bundled it into the single file `BraveSpencerMusashi-BraveFencerMusashi-claude-opus-5-5-medium-20261029-0651.html` in the folder root. Dev files are in the matching subfolder.

**Verification caveat:** I never saw the game rendered. In this headless environment the WebGPU device is lost at startup (a plain three.js test cube does the same), so screenshots came back blank. My tests checked game state, flow and console errors only. The art, camera and game feel still need a look on real GPU hardware.

The title was picked by `secrets.randbelow` from 50 riffs (#14). It's also the joke: the princess tried to summon the legendary Musashi and got Spencer, who insists on his name all game.

**What's in it:**
- **Combat:** a 3-hit combo, hold-to-charge Spin Slash, dodge roll, lock-on, Focus to fill BP, and hit-stop.
- **The Gobbler:** throw the sword into a foe and mash △ to steal its power. Six powers: Fizz Dash, Cork Guard, Spring Jump, Zap, Lullaby and Glow.
- **Solara:** the long sword, with a Blaze Scroll and a Gale Scroll used by holding R2.
- **World:** a day/night cycle with drowsiness, inns and nap mats that also save. Night-only Glowgeists appear. Five townsfolk are trapped in crystals, and there are six hidden Tin Pal collectibles.
- **Shop and progression:** a shop, plus abilities that open the way: cliff, shrine switch, brambles, windmill drawbridge.
- **Boss:** a two-phase fight with Boilerplate, the Kettle Kaiser, then an ending and an end card.
- **Attract mode:** after 10 s idle on the title, an AI with cheats tours five showcase segments, including the boss. Any input exits.
- **Glimmer Rush:** a 4-minute score mode, which is also the AI Hub side-by-side mode.
- **Controls and settings:** controller-first menus with DualSense glyphs and full keyboard/mouse mapping. Settings has toggles to invert the stick's horizontal and vertical axes, plus camera invert. Touch-only devices get the "Controller or keyboard required" screen with a Settings button.

**Test results:** the official AI Hub harness passes 20/20 checks at 1 and 2 players and with a player leaving. A scripted run walked the whole quest chain from intro through the ending, plus game over, the pause screens, Glimmer Rush and a full attract loop. The final build has no console errors and no TODOs or stubs.

To rebuild, run `npm i && node build.mjs` in the subfolder. I deleted `node_modules` to keep the shared directory light.

## Source Information
- **Date:** 2026-10-29 06:51
- **Source:** Brave Fencer Musashi
- **Tech:**
  - Three.js r180 (three@0.180.0): WebGPURenderer, WebGPU only with no fallback; `toonOutlinePass` and `BloomNode` post-processing.
  - Rapier 0.19.3 (`@dimforge/rapier3d-compat`): character controllers, trimesh terrain, dynamic barrels, raycasts.
  - Web Audio API, Gamepad API (with rumble), Pointer Lock.
  - AI Hub session client 1.3.0, unmodified.
  - esbuild 0.28.2 for bundling; three and Rapier load from the jsDelivr CDN.
- **Art Direction:** stylized cel-shading: MeshToonMaterial with a hard 4-step ramp, toon ink outlines, bloom, vertex-coloured terrain, chunky characters built from primitives, a day/night sky with stars, sun and moon.
- **Animation:** procedural. Joint rigs built from primitives, with state-driven poses blended per joint using exponential damping. Also squash-and-stretch, hit-stop, and secondary motion on the scarf and headband.
- **Audio:** all synthesized at runtime:
  - 8 sequenced songs.
  - About 45 procedural sound effects.
  - Animalese-style gibberish voices: formant-filtered blips per character, each speaker with their own pitch and timbre.
- **Online:** AI Hub Session Protocol v1 in side-by-side (parallel) mode: seeded start, seeded enemy waves, live progress, one result with stats and awards, the harness probe. No other networking.
- **Testing:** lightweight, automated headless Chromium (Playwright 1.64) on localhost, reading game state; plus the official AI Hub harness. No pixel checks were possible and there was no human play-test.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown. Wall-clock session time was about 65 minutes (06:51–07:56). The in-game About screen says all usage figures are unknown; I added the session time only here.

## Testing Feedback
- **Issues caught:** 9.
  1. The dialogue box and title filled the whole screen, hiding the game view.
  2. Key taps shorter than one frame were dropped.
  3. The prompt to take the Solara sword never appeared, so the story couldn't progress.
  4. Pressing a key didn't exit attract mode.
  5. The attract AI could kill the boss and trigger the real ending, leaving the demo stuck.
  6. The game only contacted the AI Hub after loading finished, so a slow copy failed the hub's checks.
  7. Shader pre-compilation left unhandled errors when the GPU device was lost.
  8. An out-of-range scroll index could crash the HUD.
  9. HUD and attract-mode text overlapped.
- **Critical / game-breaking:** 5 (#1, #3, #4, #5, #6).
- **Most helpful test:** the scripted run through the whole quest chain. It found the Solara blocker.
- **Least helpful test:** screenshots, because WebGPU canvases came back blank here.

## Engine Feedback
- **Liked most:** in three.js, `toonOutlinePass` outlines every toon material automatically and bloom is a single node, so the cel look was quick to get right. Rapier's character controller handled slopes, steps and ground snapping for the hero and every enemy.
- **Stuck or guessed wrong:** I checked several API names against the installed packages instead of trusting memory: r180's `PostProcessing`, where `toonOutlinePass` lives, and Rapier's raycast filter signature. The headless WebGPU device loss cost real test time.
- **Most important thing I built myself:** the Gobbler loop (throw, stick, mash, steal a power), the procedural animation rigs, and the controller-first menu system.
- **Hardest part:** keeping character movement, hand-placed colliders and the shared terrain height function in agreement, so cliffs, the river and gates block progress as designed.
- **Remove or overhaul:** WebGPURenderer's silent fallback to WebGL. A WebGPU-only game needs an explicit opt-out.
- **Change one thing:** ship an official WebGPU cel-shading preset (ramp, outline and rim light together).

## Prompt Feedback
- **Liked most:** the clear "feature-complete vertical slice" bar, and UX requirements that are easy to verify (attract mode, invert toggles, the touch-only screen).
- **Confusing:** the file-name format doesn't say how to write SOURCE (spaces, CamelCase or hyphens). Also, the AI Hub guide asks for a WebGL 2 fallback while this prompt says WebGPU with no fallback. I resolved it with the hub's `hub:webgpu = required` tag.
- **Hardest:** fitting the whole Musashi loop plus attract mode and hub mode into one coherent, bug-free file without being able to play it.
- **One test I'd want:** ten minutes of human play with a real DualSense on real GPU hardware.