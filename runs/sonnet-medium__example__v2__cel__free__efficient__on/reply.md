**Star Paw 64** is built and bundled as one HTML file: `StarPaw64-Starfox64-claude-sonnet-5-5-medium-20261026-1350.html` (about 235 KB). The title was picked by a real RNG from 50 brainstormed riffs on Starfox 64.

It loads Three.js r180 and Rapier 0.19.3 from the jsDelivr CDN, so it needs internet and a WebGPU browser. The dev modules, `build.py` and `info.txt` are in the same-named subfolder. Run `build.py` there to regenerate the HTML.

I never looked at a rendered frame, because screenshots and visual review were out of scope. Layout, colours, lighting values and camera framing are reasoned, not seen. Real DualSense hardware and a real GPU browser were also untested. Testing used headless Chromium on software WebGPU (SwiftShader) with a mocked gamepad.

## What's in it
- **Stage 1, Catnip Coast (rail):** a coast, canyon, doghouse town and factory with arches, beams, turrets, walkers, missiles, a carrier, a rescue-Pip chase, and the three-phase Gnarlbot Mk-IV boss.
- **Stage 2, Dread Belt (all-range):** free flight with U-turn, loop, tail warnings and a radar. It ends with the rival ace Night Claw.
- **Controls and mechanics:**
  - Barrel-roll shot reflection
  - Charge and multi-lock-on bursts
  - Nova bombs
  - Boost and brake
  - Three laser tiers and pickups
  - Wingmen
- **Multiplayer:** 2–4 players, with a shared rail screen in stage 1 and split-screen in stage 2.
- **Attract mode:** starts after 10 seconds idle on any menu, with two cheating AI pilots looping both stages. Any input exits it.
- **10-foot UI and input:**
  - Controller-first menus with keyboard and mouse mapped onto the same actions.
  - Settings with invert-horizontal and invert-vertical axis toggles, plus a live stick test.
  - Touch-only devices see "Controller or keyboard required" and a Settings button.
- **Presentation:** SF64-style radio chatter with drawn portraits, plus briefing, results, medals and finale screens.

## Testing
- **Played:** both stages end to end (including the boss and Night Claw) at 1 and 4 players, keyboard menu flows, a mock gamepad, and touch emulation.
- **Result:** no console errors on the final file.
- **Bugs found and fixed:** a boss-part name that clobbered the physics body and crashed the loop; a Settings crash; Enter double-advancing screens; Game Over and Results screens ignoring input; the solo all-range HUD never drawing; and title music not starting while audio was locked.

## Source Information
- Date: 2026-10-26 14:30
- Source: Starfox 64 for N64
- Game: Star Paw 64
- Tech: Three.js r180 (WebGPURenderer, TSL node materials, WebGPU only, no fallback); Rapier 0.19.3 physics; Web Audio API (procedural SFX and sequenced music); Gamepad API; vanilla ES modules; Canvas 2D HUD; DOM menus
- Art Direction: Stylized cel-shading with 3-band toon gradients, inverted-hull ink outlines, stepped sky gradient and flat-colour explosions
- Animation: Procedural, code-driven (damped follow rigs, sine-based part rigs, tween timelines, data-driven flight patterns)
- Testing: Lightweight only: syntax check, headless WebGPU smoke tests with console-error capture, stepped simulations of both stages at 1 and 4 players, scripted keyboard and mock-gamepad menu flows, touch-only emulation. No screenshots, visual review, judge/adversarial reviews or subagents.
- Environment: Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium)
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: Cost unknown (no billing data). About 0.32M tokens by the session counter, with no input/output/cache breakdown. About 40 minutes (13:50 to 14:30).

### Testing Feedback
- **Issues caught:** 8 (5 by headless runs, 3 by reading code while writing tests).
- **Critical:** 3. The boss-part crash, the Settings crash, and Game Over/Results never receiving input.
- **Most helpful test:** a stepped headless simulation with AI pilots through both full stages at 1 and 4 players, capturing console errors.
- **Least helpful test:** the first keyboard menu test with fixed waits. Slow software rendering made it fail falsely until it waited on animation frames.

## Engine Feedback
- **Liked most:** TSL node materials made the cel look cheap to build (toon gradient, stepped sky, patterned ground, outline hull). Rapier's scene queries with collision groups gave reliable hit detection, and viewport/scissor made split-screen easy.
- **Stuck or guessed wrong:** the viewport Y origin (I checked the source: top-left on WebGPU), the Rapier hit property names (I used a fallback), outline gaps on hard-edged meshes until I welded the hull normals, and my own `boss.body` name clash.
- **Most important thing built myself:** the whole game layer. That covers rail and stage scripting, camera rigs, focus-based menus, the HUD, and the audio sequencer.
- **Hardest part:** verifying a GPU-rendered game without visual review. Errors are asynchronous, and headless WebGPU needs SwiftShader flags.
- **Overhaul one thing:** the implicit WebGL2 fallback in WebGPURenderer, which has to be actively disabled and the backend checked.
- **Change one thing:** a built-in outline pass that handles hard edges, and a first-class headless test mode with clear pipeline errors.

## Prompt Feedback
- **Liked most:** the clear scope and feel target (10-foot, controller-first), the attract and 4-player requirements, and the axis-inversion twist.
- **Confusing:** the `GameTitle-SOURCE` filename placeholders, Testing Feedback sitting under the Source Information heading, and asking for a cel-shaded look while banning visual review.
- **Hardest thing:** delivering a full, polished slice (two stage types, boss, rival, multiplayer, attract mode, menus) blind to the rendered result.
- **One test I'd add:** a single automated frame capture per scene for black-screen and HUD-overlap checks, plus a run on a real DualSense.