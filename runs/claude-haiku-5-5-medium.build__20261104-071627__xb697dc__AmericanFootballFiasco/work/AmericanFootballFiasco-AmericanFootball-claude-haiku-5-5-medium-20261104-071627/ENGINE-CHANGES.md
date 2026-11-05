# Engine changes (my-3d2dge v0.85.2, commit 4390a9852fe0)

Base: `dist/handoff/my-3d2dge.js`, untouched copy kept in `.cache/engine/dist/handoff/`. Diff with `diff`.

| # | Change | Where | Why |
|---|---|---|---|
| E2 | The controller's button symbols default to PlayStation (`this.glyphs = 'playstation'`; the Controller setting's default is `playstation`; Settings still offers Auto, Xbox, Nintendo and Positions) | `Input` constructor; the `glyphs` setting | TASK.md: PlayStation glyphs first, with a Settings option for Xbox |
| E5 | `E.Dialog`'s `voice` may be a function: `voice(shownCount, dialog)` is called for each newly typed letter instead of `audio.sfx(voice)` | `Dialog.update` | Animalese voices need a pitch per letter (§13.4 of the plan) |
| E1 | The 5x7 pixel font `G57` gains the PlayStation symbols `✕ ○ □ △` (the rest of the pad's labels stay as they were) | the PIXEL FONT section (`const G57 = {`) | `input.label()` returns these for a PlayStation pad; the font drew `?` for them |
