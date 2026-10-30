The current build runs fine: a drawing-enabled race with snapshot showed no errors, and AI cars finished their laps. The multi-player harness scenarios are still unverified, because the browser keeps closing mid-run on this machine, so I can't tell a slow run from a failure.

**Checked in this last round:**
- **Leftover markers:** a search found no TODO, FIXME or stub markers. I removed the oddities it did find (`|| true`, several `void` no-ops).
- **Gamepad:**
  - Cross navigated from the title into a race.
  - The left stick and R2 drove the car.
  - The invert-horizontal setting flipped the steering.
  - Options opened and closed the pause menu.
  - This used an emulated pad, not a real DualSense.
- **Touch-only gate:** a touch device sees "Controller or keyboard required", and tapping Settings opens the settings menu.

**Not verified:** the 4-player run, the host-leave and server scenarios, and a re-run of the 2-player harness on this last build. The 2-player harness did pass on the earlier build. These need a machine with a real GPU or the AI Hub repo's own `scripts/hub-check.mjs`.

The game is `RockNRollRockets-RockNRollRacing-claude-sonnet-5-5-medium-20261029-0748.html` in `/home/micha/dev/cc-matrix/runs/claude-sonnet-5-5-medium__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/`. The source modules and `build.mjs` are in the folder of the same name next to it.

**Source Information**
- Date: 2026-10-29 07:48
- Source: Rock n' Roll Racing (original spiritual successor; no assets, code or names reused).
- Game: Rock n Roll Rockets (title picked by a random number generator from 50 brainstormed titles).
- Tech: Three.js r180 (WebGPURenderer, no fallback, TSL ink outlines), Rapier 3D 0.19.3, WebAudio, Gamepad API, AI Hub session.js 1.3.0. Plain ES modules bundled into one HTML file by a small Node script.
- Art Direction: cel-shaded (toon gradient materials, inverted-hull ink outlines, hard sun shadows).
- Animation: procedural rigid-part animation (wheels, suspension, body roll and pitch, head sway, flame flicker), pooled particles, camera shake and hit-stop. No skeletal clips.
- Audio: all code-written. Four rock songs from WebAudio synths, synthesised sound effects and Animalese-style gibberish voices for the announcer and drivers. No samples.
- Online: AI Hub session protocol v1, race mode, 1–4 players, computer rivals fill empty seats. No other networking.
- Testing: lightweight; headless Chrome with WebGPU on SwiftShader, the AI Hub harness (2-player pass on an earlier build), an emulated gamepad, a touch-device context, and a fast-forward hook that steps the simulation.
- Environment: Claude Code CLI (headless); Linux; browser unknown.
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.
- Usage: unknown (the agent cannot see token, cost or session-time counters).

**Testing Feedback**
- Issues caught: 3 real and 1 false alarm. The real ones were key taps lost between frames at low frame rates, a HUD bug and a rival-taunt crash, the last two found on review before the first run. The false alarm was blank headless screenshots of the WebGPU canvas, which turned out to be a capture limit.
- Critical issues: 1. The lost key taps made menus unusable at low frame rates.
- Most helpful test: the AI Hub harness, plus the fast-forward hook that steps whole races headlessly.
- Least helpful test: plain page screenshots of the WebGPU canvas, which come back white.

**Engine Feedback**
- Liked most: Three.js WebGPU with TSL makes cel shading easy (a toon material plus an inverted-hull node material), and Rapier gives stable car-versus-wall and car-versus-car contacts.
- Stuck or guessed wrong: I assumed the white screenshots meant over-bright lighting. Reading pixels back from a render target showed it was the capture path.
- Had to build myself: arcade car handling, the track and spline builder, AI drivers, weapons, particles, audio synthesis, menus, HUD and the AI Hub netcode.
- Hardest part: testing WebGPU headlessly. The software adapter runs at about 1 fps, so multi-player harness runs would not finish.
- Remove or overhaul: nothing in the engines, though WebGPURenderer's automatic WebGL fallback needs a clearer off switch.
- One change: an official headless screenshot helper for WebGPU canvases.

**Prompt Feedback**
- Liked most: the clear goal, the controller-first rules and the explicit attract-mode spec.
- Confusing: Source Information is requested in three places with slightly different lists, and the hub README welcomes a WebGL fallback while this prompt says no fallback.
- Hardest: fitting a complete game with career, shop, AI and netcode into one pass.
- One test I wish I had run: a real DualSense on a real GPU, for feel and frame rate, plus the full 4-player harness.