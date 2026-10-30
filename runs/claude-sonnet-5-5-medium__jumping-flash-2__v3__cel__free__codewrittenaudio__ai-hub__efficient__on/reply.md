**Hoppity Hyperflash** is built as a single file in the folder root: `HoppityHyperflash-JumpingFlash2-claude-sonnet-5-5-medium-20261029-0753.html` (178 KB). The title was drawn at random from 50 candidates.

The AI Hub harness automatic check passes (conformance PASS at 1 player, and no failed checks at 3 players with latency, jitter and loss). I did not run the host-leave scenario. Running the attract-mode bot, it cleared the Meadow stage and reached the boss arena, and I confirmed the title, HUD, dialogue, pause and results screens by screenshot. One thing is unconfirmed: I never saw the boss defeated, and the demo bot's boss hit-points dropped faster than expected. The bot cheats (god mode, teleport when stuck), so none of this shows a human can reach every pod or beat the boss, and nothing was tried on a real controller or GPU.

The game is a first-person triple-hop platformer with four stages (including a boss) and a race course for AI Hub sessions. `three` and `rapier` load from the jsDelivr CDN, so the file needs internet. There are no TODOs or placeholders in the file.

## Source Information
- **Date:** 2026-10-29 07:53
- **Source:** Jumping Flash! 2
- **Tech:**
  - Three.js r180 (WebGPURenderer, MeshToonMaterial, no WebGL fallback).
  - Rapier 3D 0.19.3 (`@dimforge/rapier3d-compat`) for physics.
  - Gamepad API and Web Audio.
  - AI Hub Session Protocol v1 client 1.3.0 (`session.js`, unmodified).
  - ES modules bundled with Bun, `three` and `rapier` via an import map.
- **Art Direction:** Cel-shaded: 4-step toon lighting, inverted-hull ink outlines on every object, flat saturated palettes, procedural canvas patterns, gradient sky domes, toon clouds, shadow maps.
- **Animation:** Fully procedural: a spring solver (squash and stretch, ear wobble, recoil), sine rigs, keyframe camera tracks for the stage intro, state machines for enemies and the three-phase boss.
- **Audio:**
  - All code-written, no audio files.
  - Synthesised sound effects.
  - A seeded step-sequencer composing 7 music tracks from data.
  - Animalese-style gibberish voices, one pitched formant blip per letter, with per-character voice profiles.
- **Online:**
  - AI Hub race mode (1–4 seats) on the Hyper Hop Rally course, built from the hub seed.
  - 15 Hz state messages, interpolated rivals in seat colours, hub progress, result and awards.
  - Declares `hub:webgpu` as required.
  - The game also plays fully on its own.
- **Testing:** Allowed: efficient, lightweight testing. I used headless Chromium with SwiftShader WebGPU, scripted sim stepping, and the AI Hub harness automatic check.
- **Environment:** Claude Code CLI (headless); Linux (WSL2); browser unknown (tested in headless Chromium).
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium.
- **Usage:** unknown. The session does not expose token counts or cost, so I did not estimate.

## Testing Feedback
- **How many issues did testing catch?** 7:
  - GPU read-back rows were padded, which garbled captures.
  - The title logo overlapped the menu.
  - The first-person ears and blaster were oversized.
  - The boss arena floor showed shadow acne.
  - The attract bot lost hull to falls despite god mode.
  - The results panel overflowed and hid its buttons.
  - My first harness run was polluted by stale files in a shared temp folder.
- **How many were critical or game-breaking?** None in the shipped build. The harness timeout was a test-setup problem, and a clean folder passed.
- **Most helpful test:** Running the real attract-mode bot through the stages with manual sim stepping. It exercised physics, jumping, enemies, pods, gates and the boss. The harness check was a close second.
- **Least helpful test:** Waiting on wall-clock fade timers while stepping the sim manually, and my first screenshot approach, which returned blank WebGPU canvases.

## Engine Feedback
- **What I liked most:**
  - `WebGPURenderer` took a normal scene graph.
  - `MeshToonMaterial` with a gradient map gave a cel look with almost no setup.
  - Rapier's kinematic character controller was quick to get solid, moving-platform-friendly movement from.
- **Stuck or guessed wrong:**
  - The character controller needs a small constant downward velocity before it reports grounded.
  - Snap-to-ground has to be switched on and off around jumps.
  - GPU read-back needs 256-byte-aligned row widths, which the docs do not mention.
- **Most important thing I built myself:**
  - The jump feel: apex-timed sweet hops, coyote time, input buffering and the landing guide.
  - The UI layer, the music sequencer and the Animalese voice.
- **Hardest part:** Checking visuals headlessly. WebGPU canvases screenshot blank under SwiftShader, so I built a render-target capture hook. Software rendering is also slow enough that tests had to step the simulation by hand.
- **What I would remove or overhaul:** The silent WebGPU-to-WebGL2 fallback inside `WebGPURenderer`. To meet the no-fallback requirement I had to check the backend myself. An option that throws would be clearer.
- **What I would change:** A documented outline or cel post-process, so ink lines do not need duplicated inverted-hull meshes.

## Prompt Feedback
- **What I liked most:** The 10-foot controller-first framing and the inverted-axis toggle requirement gave concrete, checkable UX targets. The AI Hub protocol and harness made the multiplayer work well specified and testable.
- **What was confusing:** The hub docs say to provide a WebGL2 fallback, but this task says WebGPU with no fallback. I resolved it by declaring `hub:webgpu` required. The source game has no multiplayer, so picking a mode was open.
- **Hardest thing:** Scope. A feature-complete slice (four stages, boss, attract mode, settings, voices, music, hub race) had to fit in one sitting with only light testing.
- **One test I would have run:** A real DualSense on a real GPU, with a human timing the triple-hop gaps. That would tune jump distances and stick feel, which the bot and SwiftShader cannot judge.

The same text is in the in-game About screen and the HTML comment at the top of the file.

Development files are in the `HoppityHyperflash-JumpingFlash2-claude-sonnet-5-5-medium-20261029-0753/` subfolder; `tools/build.mjs` rebuilds the single HTML file.