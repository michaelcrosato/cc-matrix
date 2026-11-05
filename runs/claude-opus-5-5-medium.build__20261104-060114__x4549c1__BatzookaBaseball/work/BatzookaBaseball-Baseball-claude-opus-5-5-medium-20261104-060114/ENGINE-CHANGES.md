# Engine changes (my-3D2dge v0.85.2 handoff copy, engine/my-3d2dge.js)

Every change is small and marked `BATZOOKA` in the source.

1. **`weapon: 'bat'` on `E.Humanoid`.** Added to the built-in weapon list (it used to warn and draw a sword), with a rest
   direction (the bat up over the back shoulder), a `tip()` length of 12, and a draw branch in both the HD and the
   classic styles: a tapered capsule (knob, thin handle, thick barrel) in `colors.bat`. Why: a baseball game needs a bat
   that swings with the engine's own attack specs.
2. **`mitt` option on `E.Humanoid`** (`'left'` or `'right'`, with `mittSize`): a leather mitt drawn over the glove hand
   in `colors.mitt`. Why: fielders and catchers read as baseball players at a glance.
3. **Font glyphs** `✕ ○ □ △ · ✓ ■ ● —` added to the 5×7 font. Why: `input.label()` returns PlayStation symbols and the
   UI uses a few marks the font lacked (they drew as `?`).
4. **The `glyphs` setting** (Controller, "Button symbols") now defaults to PlayStation and offers PlayStation or Xbox;
   `input.glyphs` starts as `'playstation'`. Why: TASK.md asks for PlayStation glyphs on any pad by default, with a
   Settings option for Xbox.
5. **Fixed my own first edit:** a `//` comment appended mid-line in the settings table swallowed the rest of the line
   (a syntax error); it is a `/* */` comment now. Caught by the first headless load.
