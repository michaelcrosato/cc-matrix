# Engine patches (my-3d2dge v0.85.2, handoff copy)

Every change to `my-3d2dge.js`, with its reason. The bundle inlines this file.

1. **PlayStation button symbols by default.** `STANDARD` settings table, `glyphs`: the default is `'playstation'`, the
   options list PlayStation first, then Xbox (TASK.md: PlayStation glyphs, with a Settings option for Xbox A B X Y).
   The input's own default (`this.glyphs`) matches. Checked by `tests/input.test.mjs`.
2. **Mouse-wheel codes.** The canvas `wheel` listener queues `'WheelUp'` or `'WheelDown'` per notch (also when the
   camera zoom is off); `tick` presses the queued code for one step and releases it on the next. `codeLabel` gives
   "Wheel up" and "Wheel down". The play presets bind them to previous and next weapon (TASK.md: wheel for weapon
   switching is in the plan's controls table).
