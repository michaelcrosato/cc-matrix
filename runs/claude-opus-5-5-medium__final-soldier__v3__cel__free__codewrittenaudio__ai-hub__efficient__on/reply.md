The game is built: `FinalSoldierEX-FinalSoldier-claude-opus-5-5-medium-20261029-0509.html` is in the folder root (215 KB), and the dev files are in the subfolder of the same name. Three.js r180 and Rapier 0.19.3 load from jsDelivr, so the page needs internet access.

**What's in it**
- **Title:** "Final Soldier EX", picked from 50 brainstormed titles with `secrets.randbelow`.
- **3 stages and 6 bosses**, voiced radio briefings, an intro crawl and an ending.
- **Weapon Edit like the original:** 4 capsule colours with 3 weapons each, 12 in total. Capsules cycle colour as they fall.
- **Armor:** your weapon level absorbs hits before you lose a life.
- **Bursts:** spend one weapon level on a colour super attack that clears bullets.
- **Also:** 2 option pods with 4 formations, 4 ship speeds, a chain score multiplier, extends and continues.
- **Caravan mode:** a 2- or 5-minute score attack with endless waves. Local high scores record the date and stage, not names.
- **Attract mode:** after 10 s idle on the title, an invincible AI pilot plays all 3 stages and finishes on the high-score table. Any input exits.
- **Menus are controller-first:** pause, settings (volumes, invert horizontal/vertical for the pad, auto-fire, hitbox, shake, rumble, difficulty, fullscreen), How to Play, and About/Credits. Button prompts switch between pad and keyboard. Touch-only devices get "Controller or keyboard required" and a Settings button.
- **AI Hub:** side-by-side mode is a 3-minute Caravan round. It follows the protocol and reports progress, a result with stats and awards, and a probe. The game still plays normally on its own.

**Caveats**
- One of the two Rapier crashes never reproduced, so I couldn't confirm its cause. The other (stage transition) is fixed. I added input guards and an automatic physics-world rebuild, and forcing a rebuild mid-stage kept the game running.
- I couldn't hear the audio. I only confirmed it runs without errors.
- The controller was emulated; no real DualSense was used.
- Boss difficulty was tuned only against the cheating AI pilot, not human play.
- Headless rendering was very slow, so nothing here says how it performs on real hardware.

## Source Information
- **Date:** 2026-10-29 05:09
- **Source:** Final Soldier (Hudson Soft, PC Engine HuCard, 1991)
- **Tech:** Three.js r180 (WebGPURenderer, TSL, toon outline and bloom post-processing), Rapier3D 0.19.3 (compat WASM), Web Audio API, Gamepad API, DOM/CSS UI, AI Hub session client 1.3.0, esbuild bundle
- **Art Direction:** stylized cel shading: 3-band toon ramps, inked outlines, flat-colour skies, bloom on energy effects
- **Animation:** procedural: code-driven transforms, banking and springs, path following, serpent segment trails, Rapier rigid-body debris
- **Audio:** all written in code: step-sequenced synth music (10 songs), synthesized sound effects, gibberish (animalese-style) formant voices for the radio and narration
- **Online:** AI Hub Session Protocol v1, side by side (parallel) 3-minute Caravan; no other network features
- **Testing:** lightweight, as allowed: headless Chromium WebGPU (SwiftShader) smoke, UI, emulated-gamepad and touch tests with screenshots; a fast-forward run of all stages and bosses; the AI Hub harness
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
- **Issues caught:** 11. Two Rapier WASM crashes, lost menu taps at low frame rate, UI timers tied to capped frame time, a boss overlapping the player's zone, a hidden boss weak point, an unreadable sea shader, an oversized planet, a clipped settings list, bosses that died too fast, and a toon-material warning.
- **Critical / game-breaking:** 2, the Rapier crashes, which froze the game. The details are in the caveats above.
- **Most helpful test:** a fast-forward run that drove the real game with the attract pilot through all 3 stages, 6 bosses and the ending, with and without invincibility.
- **Least helpful test:** the first headless screenshots with default WebGPU flags. They were blank and only exposed an environment problem.
- **Hub harness:** passes at 1 and 2 players, with a player leaving, and without the splash card.

## Engine Feedback
- **Liked most:** TSL node materials plus the built-in toon outline pass made the cel look nearly free.
- **Stuck / guessed wrong:** I assumed disabling a kinematic Rapier body between stages was safe, and it crashed the WASM world. I also checked the r180 source to confirm the post-processing class is `PostProcessing` (newer releases rename it `RenderPipeline`).
- **Built myself:** the shoot-'em-up runtime: bullet pools, stage timelines, boss controllers, the weapon system and a music sequencer.
- **Hardest part:** lining ground targets up on screen with the flight plane under a tilted perspective camera.
- **Would overhaul:** the outline pass only works with toon materials and ignores instancing, which constrains every material choice.
- **Would change:** add a built-in helper for 2D gameplay on a 3D plane and a cheap instanced-sprite system.

## Prompt Feedback
- **Liked most:** a clear deliverable and a concrete multiplayer contract that comes with its own test harness.
- **Confusing:** "single file" alongside "CDN dependencies are fine", and how much of the session protocol applies outside a session.
- **Hardest:** fitting a full shooter, 3 stages, attract mode and hub mode into one file with nothing left unfinished.
- **Test I wish I could have run:** a real DualSense on real WebGPU hardware with the hub harness running.