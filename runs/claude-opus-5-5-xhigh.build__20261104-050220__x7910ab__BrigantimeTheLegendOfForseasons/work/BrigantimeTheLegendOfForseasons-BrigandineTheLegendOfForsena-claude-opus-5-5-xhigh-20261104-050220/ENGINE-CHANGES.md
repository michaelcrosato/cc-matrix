# Engine changes

Engine: my-3D2dge v0.85.2, full edition, copied into `engine/`. The handoff's `dist/my-3d2dge.js` is the base.

## Core patches (engine/my-3d2dge.js)

1. **Dialog: per-letter function voice.**
   - What changed: in `Dialog.update`, if `voice` is a function, it is called as `voice(ch, index, dialog)` for each letter the typewriter reveals. String voices still play an SFX on every other letter, as before.
   - Why: the Animalese babble voices pick a syllable per letter, so they need the actual characters as they appear.
2. **Audio: `sfxBus` getter.**
   - What changed: `get sfxBus()` returns the effects gain node under the master volume, or null before the first sound.
   - Why: the game's own Web Audio voices (babble, creature cries, music layers) connect through it, so they follow Volume, Effects volume and mute.

## New module (engine-ext/beasts.js)

`E.Beast` and `E.Wings` are procedural creature rigs for the four body plans the core does not have:
- quadruped
- drake
- bird
- serpent

The module provides:
- presets: hound, wolf, horse, cat, boar, lizard, griffin, two- and four-legged drakes, avian and serpent;
- gaits, IK legs, tail springs and flight;
- named attacks and hurt, down and pose states;
- depth-sorted parts and cached portraits.

It loads after the engine and uses only its public API (`E.SPX`, views, the canvas).

Why: 22 of the 30 monster species are not humanoid. The engine animates only Humanoids and Blobs.

## Registered from game code (no core change)

- `E.VIEWS.board`: a tilted overhead camera for the hex board (`src/63-scene-battle.js`).
- `E.WEATHER.petals`: spring blossom weather (`src/35-art-shapes.js`).

## Not changed

Input, saves, scenes, the renderer, the font and the AI Hub session client (`vendor/hub/session.js` ships unmodified as the first script).
