**Hard Shells in Hard Times** is built and runs headless. I haven't played it with a real controller or by hand. The tests were headless Chromium with software WebGPU, the official ai-hub harness at 1 and 2 players (both pass), and scripted AI playthroughs. The AI clears all three stages, but with cheats on and none of it at human speed.

The single file is `HardShellsInHardTimes-TurtlesInTime-claude-sonnet-5-5-medium-20261029-0803.html` (222 KB) in this folder's root. The dev files are in the matching subfolder: modules in `src/`, build and test scripts in `tools/`.

## What you get
- **Game:** a 3D beat 'em up with a lane-based side view, built around four heroes that play differently.
  - **Moves:** a 4-hit combo, jump dive-kick, sprint tackle, invincible roll, grab and throw, and a Special.
  - **Screen smash:** hold down and throw a foe toward the camera for the signature screen smash.
  - **Time meter:** a full meter triggers Time Stop.
- **Content:** 3 stages (Rooftop Rumble 2026, Barnacle Bay 1717, Neo-Tick Tower 2999), a surf section in stage 2, and 3 bosses (Gus, Barnacle Bill, Professor Tock).
  - **Enemies:** 5 types with 3 tiers each.
  - **Pickups and hazards:** breakable crates, explosive barrels, snacks, Time Shards and telegraphed ground attacks.
  - **Flow:** lives, 3 continues, stage tally, ending and credits.
  - **Voices:** Animalese-style gibberish dialogue in a Saturday-morning tone.
- **UI:** controller-first menus with keyboard mapped onto the same actions.
  - **Menus:** title, character select with up to 4 local players, pause, a moves screen, and About/Credits.
  - **Settings:** volumes, invert-horizontal and invert-vertical toggles, deadzone, difficulty, shake, rumble and hints.
  - **Touch-only devices** show "Controller or keyboard required" and a Settings button.
- **Attract mode:** after 10 seconds idle on the title, two AI heroes play a looping set of clips, and any input exits.
- **AI Hub:** side-by-side `parallel` mode with hello sent before the heavy load, progress, result, probe and the seeded deal. It also has a time-up handler and an end handler.
- **Tech:** it needs WebGPU and has no fallback, so the hub meta tags declare it required. Three.js r180 and Rapier 0.19.3 load from jsDelivr, and a Bun build bundles everything else.

## Source Information
- Date: 2026-10-29 08:03 (session start)
- Turtles in Time → "Hard Shells in Hard Times". I picked the title with a real RNG: index 26 of 50 brainstormed titles.
- Tech: Three.js r180 (WebGPU, TSL), Rapier 3D 0.19.3, Gamepad API, WebAudio, ES modules bundled with Bun, ai-hub session client 1.3.0.
- Art Direction: cel-shaded, with a toon gradient ramp, rim light, ink outlines, hard shadows and comic pop-up text.
- Animation: a procedural keyframe and pose-blend rig system, with Rapier-driven tumbling on thrown bodies.
- Audio: all code-written music and SFX, plus Animalese-style gibberish voices.
- Online: ai-hub side-by-side session mode, plus local 4-player co-op.
- Testing: headless Chromium with SwiftShader WebGPU, the ai-hub harness at 1 and 2 players, and scripted AI full-stage playthroughs.
- Environment: Claude Code CLI (headless); Linux; browser unknown.
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.
- Usage: unknown, and session time unknown.

## Testing Feedback
- **Issues caught:** 7.
- **Critical or game-breaking:** 5. Two Rapier panics (freed world, removed body), the hub hello sent too late, enemies wedging against props, and the tally screen not advancing.
- **Most helpful test:** the scripted AI playthrough of all three stages. It found the wedged-enemy soft lock.
- **Least helpful test:** a title-screen render-target snapshot, which came back black before the scene was ready.

## Engine Feedback
- **Liked most:** TSL made cel-shading, outlines and animated water short, and Rapier's collision groups and character controller wired up quickly.
- **Stuck or guessed wrong:** Rapier's bare "unreachable" panic on a stale handle. The controller also treats dynamic props as hard walls, so enemies wedged until I gave them their own collision group.
- **Built myself:** the rig and animation system, combat and enemy/boss AI, the audio engine, the UI, and the attract AI.
- **Hardest part:** verifying WebGPU headless. Canvas screenshots are blank there, so I added a render-target readback hook.
- **Overhaul:** the opaque Rapier error messages.
- **Change one thing:** built-in toon and outline support in the WebGPU renderer.

## Prompt Feedback
- **Liked most:** a clear done-state, controller-first UX rules, and the explicit hub protocol with a harness to test against.
- **Confusing:**
  - "Unlimited performance" next to "lightweight testing".
  - The hub suggests a WebGL fallback while this prompt says none.
  - The hub's 15-minute round cap against a demo that should show everything.
- **Hardest thing:** fitting a full vertical slice, attract mode, hub integration and in-file reports into one run.
- **One test I'd add:** an emulated DualSense pass through menus and a full stage, including axis inversion.

The same three sections are also in the in-game About screen and the HTML comment at the top of the file.