# Engine changes (my-3D2dge v0.85.2, handoff copy) made for Operation Wolfpack

Every edit to `engine/my-3d2dge.js`, and why.

1. **Mode 7 views reuse whole-degree pitches** (`Mode7.view`). The view a billboard is drawn with was keyed by the
   camera's exact pitch, so a bobbing camera (the river op's boat) made a new `E.View` every frame, and every shape
   sprite cached on a view was rebuilt every frame. The pitch is now rounded to whole degrees for the drawing view.
2. **Stereo pan for sound effects** (`audio.sfx(voice, { pan: -1..1 })`). A `StereoPannerNode` per call between the
   voices and the effects bus, so gunfire, rotors and explosions sit left or right of the screen. Without `pan` nothing
   changes.
3. **PlayStation glyphs by default** (the standard `glyphs` setting). The task designs for a DualSense first, with an
   Xbox option: the setting now defaults to `'playstation'`, offers PlayStation and Xbox only, and applies to every
   local player's input.
4. **Settings rows on any Shell screen** (`shell.show(name, { rows: [[heading, [keys]]] })`). A screen of the game's own
   can list settings rows (sliders, toggles, selects) drawn by the Shell's own `_row`, with pad, key and mouse focus: the
   dev screen's live sliders are settings in a group of their own.
5. **Hidden setting groups** (`E.Shell.hiddenGroups = ['Dev']`). The standard Settings screen skips those groups, so the
   dev sliders live in `game.settings` (saved, checked, reset by `settings.reset('Dev')`) without crowding Settings.
6. **PlayStation button symbols in the 5x7 font** (✕ ○ □ △, the middle dot · and a check ✓). `input.label()` returns them for a
   DualSense, but the pixel font had no glyphs for them, so every canvas prompt drew "?".
