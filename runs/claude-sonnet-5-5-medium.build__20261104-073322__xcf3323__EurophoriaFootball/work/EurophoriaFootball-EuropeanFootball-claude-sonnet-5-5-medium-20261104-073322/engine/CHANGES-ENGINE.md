# Engine changes (my-3D2dge v0.85.2 handoff)

1. `E.Dialog.update` (search `EF: voice may be a function`): `voice` may now be a function `voice(letterIndex, dialog)`, called on every second newly typed letter, instead of only a preset name or a sfx voice object. Why: the game's Animalese-style babble voices need a pitch and rhythm per speaker and per letter, which a single fixed sfx voice cannot give.

Everything else in the game (views, glyph prompts, shirt patterns, crowd audio, babble) is built on the engine's public API without changes.

2. `E.Humanoid` shirt branch (search `EF: kit patterns`): a new option `kit: { pattern: 'hoops' | 'stripes' | 'halves' | 'sash' | 'plain', color2, number, numberColor }` paints the pattern in `color2` on the torso plate (bands lerped between shoulder and hip lines) and the shirt number on the back when the rig faces away from the camera. Why: football is recognised by its kits; plain single-colour shirts made hoops, stripes and sashes (and so whole clubs) impossible to tell apart at 28 px tall.

3. `E.Humanoid` (search `EF: whole-body tilt`): the `update` state `tilt: { axis: 'forward' | 'right', angle, lift }` turns every joint (and hair/cape points) about the hips, then lifts the body to clear the floor. Why: goalkeeper dives, diving headers and bicycle kicks need a real sideways or backward body angle; the lying-down pose and the forward roll could only approximate them.
