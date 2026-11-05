# Engine changes (my-3D2dge v0.85.2 handoff) for Brigantime

1. **`E.Dialog` per-letter voice** (`engine/my-3d2dge.js`, `Dialog.update`): `voice` may now be a function
   `(ch, index, dialog)`, called once for every character typed. The Animalese babble follows the text letter by
   letter (vowels become formant-filtered tone bursts, consonants noise ticks). The default `'text'` blip is unchanged.
   Why: the engine's voice was one sound effect every other letter, which cannot follow the text.
2. **Effects bus**: no change needed. `game.audio._sfxBus` (a GainNode under the master gain) already existed; the babble
   voices connect to it, so they follow volume and mute. It is private by name; a public `audio.sfxBus` would help.
3. **`engine-ext/beasts.js`, a new module**: `E.Beast` procedural creature rigs (quadruped presets hound, wolf, horse,
   cat, boar, lizard, griffin; two- or four-legged drakes with bat wings; birds; serpents that follow their own path),
   drawn as projected, depth-sorted, outlined and E.tones-shaded parts in every view, with the Humanoid's interface
   (`update`, `draw`, `drawPortrait`, `mouth`, `tip`) and actions (bite, claw, gore, breath, tail sweep, roar, pounce,
   dive, coil, stomp). `E.Wings` adds insect or feather wings to a Humanoid. Why: the engine has Humanoids and Blobs
   but no four-legged, winged or serpentine bodies, and a monster-binding game needs them.
4. **A custom view by name**: no engine change; registering `E.VIEWS.board = new E.View('board', 'Board', 0, 50, 1)`
   before the game starts lets scenes say `view: 'board'`.
5. **Idle time for the attract mode**: no engine change; the game tracks it from `input.anyPressed()`, held codes, the
   pointer and the stick.
