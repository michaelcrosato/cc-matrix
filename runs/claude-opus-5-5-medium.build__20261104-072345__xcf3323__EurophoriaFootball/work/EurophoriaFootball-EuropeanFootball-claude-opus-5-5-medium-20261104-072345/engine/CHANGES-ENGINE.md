# Engine changes (my-3D2dge v0.85.2 handoff copy)

Each change is marked `// EF:` in `engine/my-3d2dge.js`.

1. **Dialog voices that babble** (`Dialog.update`). `talk.voice` may now be a function: it is called once for every newly
   revealed letter with `(char, index, pageText)`, instead of a preset blip on every second letter. The game's
   `EF.babble.voiceFor(speaker)` returns such a function (Animalese-style formant syllables). Why: the commentary, the
   story and the PA need per-letter gibberish voices with pitch contours, and the stock voice could only play an SFX.
2. **Kit patterns and shirt numbers** (`Humanoid` torso painter). A rig option `kit: { pattern: 'hoops' | 'stripes' |
   'halves' | 'sash' | 'plain', color2, number, numberColor }` paints bands clipped to the torso plate after the base fill,
   and the shirt number (tiny font) on the back when the rig faces away from the camera. Why: football kits are the
   clubs' identity; plain shirts with trim could not show Kipperton's hoops or Opulence's stripes.

Not changed (done in game code instead, using engine internals): the crowd and voice audio buses connect to
`game.audio._master` and use `game.audio._noise` (the plan's `audio.bus()` idea); goal nets collide in game code instead
of TileMap walls (walls render as solid blocks); the PlayStation glyph default is a game setting that replaces the
standard `glyphs` setting (no engine change needed).
