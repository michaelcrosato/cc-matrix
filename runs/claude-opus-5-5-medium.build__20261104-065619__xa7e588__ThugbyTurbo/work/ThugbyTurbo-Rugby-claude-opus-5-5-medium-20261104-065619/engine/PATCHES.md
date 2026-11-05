# Engine patches (my-3D2dge v0.85.2, engine/my-3d2dge.js)

1. **PlayStation face-button glyphs in the 5x7 font** (`G57`: `✕ ○ □ △`). `input.label('x')` returns `✕` on a
   PlayStation pad and the font drew it as `?`.
2. **`Input.halfKeys(preset, side)` honours `preset.halves[side]`** (a non-enumerable per-action code list), so two
   players on one keyboard get rugby layouts (WASD + Space/F/C/R/Q/E/Shift; arrows + . / ; ' K L ,) instead of the
   engine's fixed button order.
3. **`E.Dialog` per-letter hook** (`dialog.onLetter(ch, index, text)`), so each speaker gets an Animalese-style
   babble voice (one syllable per letter) instead of the single shared blip.

Planned patch 3 (an `E.Menu` font scale) was not needed: the game draws its own 10-foot `BigMenu`.
