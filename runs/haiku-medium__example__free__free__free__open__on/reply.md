The game is built and bundled into a single self-contained HTML file in the folder root:

`StarcrossedVulpes-SOURCE-claude-haiku-5-5-medium-20261020-1450.html` (679 KB, no external URLs). Dev source is in `StarcrossedVulpes-SOURCE-claude-haiku-5-5-medium-20261020-1450/`, and `npm run build` regenerates the file.

**Title:** I brainstormed 50 candidates and drew one with `shuf` on `/dev/urandom`. The draw landed on **Starcrossed Vulpes**. The candidate file actually had 53 lines; the draw used only the first 50.

**What's in it**
- **Flight:** Arwing on-rails sectors with a 2D play area. Stick, D-pad and keyboard all work; barrel roll (LB/RB or Q/E) gives brief invulnerability. Holding fire locks onto up to six targets, and releasing fires homing volleys. Bombs, shields, spare ships and pickups.
- **Stages:** Lylat Plains (air, then a Landmaster ground push, then the Gatekeeper midboss). The route then branches into Asteroid Belt or Fortress Trench (laser gates, pillar cannons), and both lead to the three-phase Dreadnought.
- **Scoring:** Gold rings per stage, medals, and a results screen.
- **Attract:** Idle 10 s on the menus starts an AI-played demo cycling the sectors. Any key, button, click or stick movement exits it.
- **UI:** Controller-first 10-foot menus, with options to invert each stick axis and set the deadzone. A touch-only device gets "Controller or keyboard required" with only a Settings button.
- **About:** The About & Credits screen includes the Source, Engine and Prompt sections, and the same block sits as an HTML comment at the top of the file.

**Choices I made**
- Stick inversion applies to menus as well as flight, so the fix covers both.
- The bomb is on X (pad) and B (keyboard); B on the pad is Back.
- Medal rules: gold needs every ring plus at least 80% of kills; the Dreadnought medal depends on spare ships lost.
- The Dreadnought is scaled 1.5× and placed close enough to read.

**Verification (headless Chromium, WebKit viewports)**
- Menu navigation by keyboard and by a fake gamepad, including stick inversion, which flips the flight direction.
- Each stage cleared under the autopilot, with cheats for the later stages. The Dreadnought goes through all three phases to its death.
- Ring pass detection, lock-on with homing release, barrel-roll timing, and attract start and exit by key, pad and touch.
- Touch-only gate on a phone-sized emulated device.
- `viewport-matrix` in WebKit on eight phone, tablet and landscape sizes: all clean, no overflow or errors.
- Real-time screenshots of every stage, with the visual problems I found and fixed along the way (dark Dreadnought, washed-out fortress, a hidden Landmaster, a backwards boss).

**Not verified**
- No physical controller and no real iOS Safari; the WebKit check covers only the first screen.
- Balance and difficulty were tuned only against the autopilot, not human play.
- Audio is unheard here. Browsers may keep audio suspended until a keyboard or mouse input, if the first input is a gamepad button.

## Source Information
- Date: 2026-10-20 14:50
- Source: Starfox 64 for N64
- Tech: three.js 0.186.1 (WebGL, shadows, UnrealBloomPass via EffectComposer); esbuild 0.28.2 bundled into one HTML file; vanilla ES modules; Web Audio API; DOM UI
- Art Direction: low-poly, flat-shaded, N64-inspired; sunset Plains, gunmetal Fortress, deep-space Asteroid Belt and Dreadnought; neon accents and bloom
- Animation: procedural (critically damped flight and camera smoothing, instanced particle pool, shockwave and flash pools, timed boss sequences)
- Testing: the prompt placed no restriction on testing
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: unknown

## Engine Feedback
- **What did you like most?** three.js gives shadows, fog and bloom with little setup, and procedural geometry removes the need for assets.
- **Did you get stuck or guess wrong?** Tone mapping and color space for custom shaders and post passes; the output pass is needed once bloom is on. I also guessed wrong on emissive strips, which blew out the fortress.
- **Most important thing you built yourself?** The stage runtime (event timeline), lock-on and homing, medal rules, boss phases, and the input layer.
- **Hardest part?** Keeping the DOM HUD in step with the three.js frame, such as projecting target boxes after the camera moves.
- **One thing to remove or overhaul?** Nothing core. Per-frame allocations in projection and steering helpers are the first thing I'd tighten.
- **One change?** A built-in screen-projection helper that stays in sync with the camera.

## Prompt Feedback
- **What did you like most?** The 10-foot controller-first brief and the explicit "no TODOs or stubs" completion rule. Both make the finish line concrete.
- **What was confusing?** Whether the CDN allowance and the single-file rule both held. I inlined everything so the file works offline.
- **Hardest thing to do?** Fitting a feature-complete demo (route, boss, attract, settings, medals) into one bundle without a real controller to test.
- **One test I'd want?** A real PlayStation or Xbox pad in Chrome and Safari, checking stick inversion and lock-on feel by hand.