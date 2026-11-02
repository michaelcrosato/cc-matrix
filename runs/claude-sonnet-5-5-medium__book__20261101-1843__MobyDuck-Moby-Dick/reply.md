Moby Duck is built and works. The single-file deliverable is `MobyDuck-Moby-Dick-claude-sonnet-5-5-medium-20261101-1843.html` in this folder's root, with the dev files in the same-named subfolder.

All three acts, every menu, attract mode, the game's touch-device behaviour and the hub run all worked in headless Chromium. I haven't tried it on a real GPU or a real DualSense, and I couldn't listen to the audio. I only checked that every sound, mood and voice plays without errors.

You play Ishmael in a whaleboat. Three.js r180 WebGPU renders it (falling back to WebGL 2) with Rapier 0.19.3 physics. A harpoon sets a rope joint, so a hooked whale tows the boat.
- **Acts:** The Fishery (3 spouters), The Gale (2 bulls plus a spouter, lightning and rogue waves), then The Chase against Moby Duck. He is a white whale with a duck's bill, in three phases with telegraphed slam, ram, breach and duckling attacks.
- **Perspectives:** third-person chase is the main view. Top-down and bow first-person are one button away.
- **Controls:** DualSense first, with keyboard and mouse mapped onto the same actions. Settings include invert horizontal and vertical axes.
- **Extras:** the Spouter-Inn upgrade shop, saved progress, and an About/Credits screen.
- **Attract mode:** after 10 seconds idle, a bot plays all three acts in a loop, and any input exits it.
- **Touch-only devices:** show "Controller or keyboard required" with a Settings button, and attract mode still runs.
- **AI Hub:** side-by-side mode for 1–4 players. The harness gives PASS at 1, 2 and 4 players.

I wasn't given an API cost or token count, so Usage is "unknown". Wall-clock time was about 45 minutes.

## Source Information
- Date: 2026-11-01 18:43
- Book: Moby-Dick; or, The Whale (Herman Melville). Game title: MOBY DUCK, picked by RNG from 50 brainstormed riffs.
- Genre and Perspective: arcade whaling action with a rope-towing sleigh-ride and a three-phase boss. Main view is third-person chase (PerspectiveCamera), switchable to top-down (OrthographicCamera) and first-person bow.
- Tech: Three.js r180 (WebGPURenderer, WebGL 2 fallback), Rapier 0.19.3, Web Audio, Gamepad API, ES modules bundled with Bun 1.3.14. Three and Rapier load from jsDelivr via an import map. AI Hub session client 1.3.0 is inlined unmodified.
- Art Direction: engine-native flat-shaded low-poly procedural meshes with standard PBR materials, shadow-mapped sun, fog, ACES tone mapping and a vertex-displaced sea. No textures or imported assets.
- Animation: three.js AnimationMixer with procedurally authored AnimationClips for the crew, harpoon throw, whale swim and thrash, tail slam and Moby's quack. Boats and whales ride the same summed-sine wave function as the water mesh.
- Audio: all written in code.
  - Six procedural sea-shanty moods from a Web Audio scheduler.
  - About 30 synthesized sound effects plus a wind bed.
  - Animalese-style gibberish voices per speaker, synced to typewriter subtitles.
- Online: AI Hub session protocol v1, side-by-side (parallel) mode for 1–4 players. It sends hello at once, deals the level from `AIHub.rng`, reports progress and result, and registers the probe. There is no custom networking.
- Testing: headless Chromium with Playwright (SwiftShader, both WebGL 2 and WebGPU).
  - AI Hub harness conformance at 1, 2 and 4 players.
  - Full-voyage runs by the attract bot, plus keyboard and emulated-DualSense checks.
  - Touch emulation, an audio smoke test, and the defeat, retry and victory paths.
- Research: read the AI Hub `lib/hub` README, session client and harness, and the Rapier 0.19.3 typings. No web research on the book; quotations are public-domain text from memory.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown (no estimate available). Session time about 45 minutes.

## Testing Feedback
- **Issues caught:** 11, from the checks listed in the file's About screen. One more (a spyglass key that never fired) came from reading the code.
- **Critical or game-breaking:** 5. The canvas was never rendered, menu Back recursed until the stack overflowed, the hub hello was sent too late (the hub would reject the game), attract mode never exited on input, and the spyglass key was dead.
- **Most helpful:** the AI Hub harness, which exposed the hello-timing bug a normal run never shows. The bot playing whole acts through a step hook was close behind.
- **Least helpful:** static screenshots under software GL, which are slow and not representative of real lighting.

## Engine Feedback
- **Liked most:** WebGPURenderer falls back to WebGL 2 with the same scene code. Standard materials, shadows, fog and AnimationMixer worked straight away. Rapier gave a rope joint, ray casts and contact events in a few lines.
- **Stuck or guessed wrong:** Rapier's rope joint has no `setLength`, so I rebuild it when reeling. A camera looking down +Z has its right-hand side on -X, which flipped my first aim maths. WebGPU canvases screenshot blank, so visual checks used the WebGL path. The `three` and `three/webgpu` import-map aliases needed care.
- **Most important thing I built myself:** the gameplay layer. That covers unified input and menus, the three-perspective camera rig, whale and boss AI with telegraphs, the shared wave function, instanced particles, the procedural audio engine and the DOM UI.
- **Hardest part:** there is no built-in water, particles or UI. The large webgpu module graph also loads slowly, so anything the hub needs early (the hello) has to live outside the module.
- **Remove or overhaul:** the split between the `three` and `three/webgpu` entry points.
- **Change one thing:** a built-in cheap instanced particle and water helper.

## Prompt Feedback
- **Liked most:** the concrete controller-first rules (with the axis-invert escape hatch), the attract-mode spec, the AI Hub link, and treating performance as unlimited.
- **Confusing:** the "Pick a famous book" and SOURCE tokens read as both a choice and a name. The filename brackets were unclear. "Single html file" sits oddly beside "dependencies need not be included". The 50 KB hub README conflicts with "do not read files you don't need".
- **Hardest:** meeting every requirement in one file without being able to hear the audio or feel the controller, while keeping hub timing and controller-only menus correct.
- **One test I'd run:** a headed, real-GPU playtest with a physical DualSense and audible output, recording frame pacing and audio levels.