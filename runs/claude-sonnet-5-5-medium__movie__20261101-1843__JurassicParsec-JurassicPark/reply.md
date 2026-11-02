The game is built and every TASK.md feature is implemented. I can't verify the real-hardware parts from this environment, and I'm not claiming them as verified.

**Deliverable:** `JurassicParsec-JurassicPark-claude-sonnet-5-5-medium-20261101-1843.html` in the work folder root, with dev files in the subfolder of the same name.

- **What passed, headless:** The AI Hub harness automatic check passes at 1, 2, 3 and 4 players on the final build. A full scripted run goes from start to escape. A mocked DualSense works through menus, play, pause and the invert toggles. Touch-only emulation, attract-mode start and exit, and the real WebGPU backend boot all work.
- **What was checked only in software:** Online, controller input and rendering ran under mocked input and software rendering. The Esc/settings in-session check that failed once at 1 player passed on repeat runs at 1, 2, 3 and 4 players after the fix.
- **Never tested:** a physical DualSense, a real GPU, hearing the audio, or a live hub with real friends. Closing those gaps needs hardware I don't have here. Further headless tests would only repeat what the harness and the scripted run already cover.

## Source Information
- Date: 2026-11-01 18:43
- Source movie: Jurassic Park (1993). The title "Jurassic Parsec" was picked at random by code from 50 brainstormed riffs.
- Genre and Perspective: third-person stealth/survival action with tranquilizer darts. Third person is the main view, and R3 / V switches to first person or orthographic top-down.
- Tech: Three.js r180 (WebGPURenderer with automatic WebGL2 fallback), Rapier 0.19.3, Web Audio, Gamepad API, esbuild bundling. Three.js and Rapier load from jsDelivr.
- Art Direction: engine-native low-poly primitives with standard PBR materials, shadows and fog.
- Animation: THREE.AnimationMixer with code-built AnimationClips, layered upper/lower body for the player, crossfades for creatures.
- Audio: all synthesized in code. Generative music, procedural sound effects, Animalese-style gibberish voices with subtitles. No audio files.
- Online: AI Hub Session Protocol v1, `parallel` mode, 1–4 players, `session.js` unmodified. It also plays fully on its own.
- Testing: headless Chromium (software rendering) with Playwright, as listed above. Not tested on real GPU hardware or a physical controller, and the audio was not heard.
- Research: none beyond the AI Hub README and harness.
- Environment: Claude Code CLI (headless); Linux (WSL2); browser unknown (headless Chromium used for tests).
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown. Token counts and cost are not exposed in the session. Wall clock was about 55 minutes.

## Engine Feedback
- **Liked most:** WebGPURenderer falls back to WebGL2 by itself. AnimationMixer with code-built clips needs no art assets. Rapier's kinematic character controller made collisions easy.
- **Stuck or guessed wrong:**
  - CylinderGeometry height is the full height, not the half.
  - Rotation signs on limbs and necks were easy to flip.
  - The Rapier file is `rapier.mjs`, not `rapier.es.js`.
  - Render-target readback is flipped on the WebGL backend.
- **Built myself:** the three-perspective camera rig, creature AI, menus and HUD, the audio synth, save and checkpoints, the hub glue, and the attract bot.
- **Hardest part:** judging lighting and performance without a GPU.
- **Remove or overhaul:** the split between `three`, `three/webgpu` and `three/tsl` entry points.
- **Change one thing:** a consistent, documented orientation for render-target readback across backends.

## Prompt Feedback
- **Liked most:** the clear definition of done, the 10-foot controller-first rules, and the ready-made AI Hub harness.
- **Confusing:** the literal template words (SOURCE, GameTitle) mixed with real instructions, the typo "CRTICAL", and "engine" wording for a library.
- **Hardest:** a complete vertical slice, with hub integration and an attract mode, verified only under software rendering.
- **One test I'd add:** a 10-minute soak on real hardware with a physical DualSense and four live hub players.