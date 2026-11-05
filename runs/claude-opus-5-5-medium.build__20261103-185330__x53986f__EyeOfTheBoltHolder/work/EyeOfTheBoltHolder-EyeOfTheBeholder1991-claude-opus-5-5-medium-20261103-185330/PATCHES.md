# Engine changes (my-3D2dge v0.85.2)

Every change to the engine copies in `engine/`, what it does and why. Each is marked `(patch)` in the source.

## engine/my-3d2dge.js (2D engine)

1. **Voice bus.** `ChipAudio._init` makes a third gain bus, `_voiceBus`, beside the sfx and music buses; `applyVolume`
   sets it from `audio.voiceVolume` (0.8 by default). A new `audio.bus(name)` returns the `'sfx'`, `'music'` or `'voice'`
   gain node. Why: the babble voice synth (50-audio.js) needs its own route and its own volume setting (Settings,
   Sound, Voices volume).
2. **Panned sound effects.** `audio.sfx(name, { pan })` routes the voices through a StereoPannerNode. Why: hits from the
   flanks, monster sounds and doors are placed by their bearing from the party.
3. **Button symbols.** The Controller setting *Button symbols* offers PlayStation (the default) and Xbox only. Why: the
   game is designed around a DualSense; the Xbox letters are the one alternative the brief asks for.
4. **Beards.** `E.Humanoid` takes `beard: 'full' | 'braided'`, drawn in the hair colour over the jaw before the mouth (a
   braid hangs from the chin). Why: dwarves need beards, in the portraits and on the cards.

## engine/my-3d2dge-3d.js (3D engine)

No changes. Secret and illusory walls are `world.box` blocks given the level's own wall style and colours (the box
material and the wall material are baked by the same function, at the same 16 pixels a metre), so they match the walls.
