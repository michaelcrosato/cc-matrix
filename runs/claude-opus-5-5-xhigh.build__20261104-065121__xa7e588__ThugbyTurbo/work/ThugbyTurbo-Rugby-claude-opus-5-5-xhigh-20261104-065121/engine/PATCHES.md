# Engine patches (my-3D2dge v0.85.2, handoff package)

`engine/my-3d2dge.orig.js` is the engine as handed over; `engine/my-3d2dge.js` is it with these patches. Each is marked
in the source with `THUGBY TURBO patch N`.

| # | Where | What | Why |
|---|---|---|---|
| 1 | the 5x7 font (`G57`) | glyphs for `✕ ○ □ △` (and `·`, `◂`) | `input.label()` returns them for a PlayStation pad; the font drew them as `?` |
| 2 | `Input.halfKeys(preset, side)` | uses `preset.halves[side][action]` (a non-enumerable property) when a preset carries its own half-keyboard layouts | two players on one keyboard get sensible keys (WASD + Space/F/C/R/Q/E/Shift; arrows + . / ; ' K L ,) instead of the buttons dealt out in turn |
| 4 | `E.Dialog.update` | calls `dialog.onLetter(ch, index, dialog)` for each letter typed | per-letter Animalese babble voices for every speaker |
| 5 | `E.Dialog._dims` | an optional box width (`dialog.w`) and left edge (`dialog.x`) | the commentary lower-third fits between the bottom corners' player cards |

Patch 3 of the plan (a font scale for `E.Menu`) was not needed: the game's 10-foot menus are its own (`TT.ui.BigMenu`).
