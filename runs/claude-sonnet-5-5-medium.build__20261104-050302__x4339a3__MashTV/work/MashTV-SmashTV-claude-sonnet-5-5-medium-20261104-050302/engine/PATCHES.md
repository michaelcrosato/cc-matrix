# MASH TV engine patches (applied by tools/patch-engine.mjs to the handoff's my-3d2dge.js v0.85.2)

| # | Patch | Why |
|---|---|---|
| P1 | `E.HOOKS = HOOKS` | The game switches every player's input preset each step (arrows aim in play, navigate in menus) before the Shell reads navigation. |
| P2 | The standard `glyphs` setting defaults to `playstation`, offers PlayStation or Xbox, and sets `glyphs` on every `game.players` input | TASK.md wants PlayStation glyphs by default with an Xbox option; the stock default is `auto` and updates only P1. |
| P3 | `E.Arcade.enter(score, mode, done, input)` reads the given input; `continue()` takes a press from any player's input | In co-op each player enters their own initials and anyone may continue. |
| P4 | `get bus()` on the audio object returns the effects bus | Babble voices must pass through the effects bus to obey volume and mute. |
