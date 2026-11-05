# Engine patches (MASH TV)

Each patch is marked `MASH TV PATCH Pn` in `my-3d2dge.js` (v0.85.2, commit 4390a98).

| # | Patch | Why |
|---|---|---|
| P1 | `E.HOOKS = HOOKS` right after `HOOKS` is declared | The game switches every player's input preset each step, before the Shell reads navigation: arrows aim in play but navigate in menus. |
| P2 | The `glyphs` setting defaults to `playstation`, offers PlayStation or Xbox, applies to every `game.players` input; a player who joins later inherits it | TASK.md wants PlayStation glyphs by default with an Xbox option; stock default is `auto` and only P1 was updated. |
| P3 | `E.Arcade.enter(score, mode, done, input)` reads the given input; `continue()` accepts a press from any player | In co-op each player enters their own initials, and anyone may continue. |
| P4 | `get bus()` on the audio object returns the effects bus | The Babble voices go through the effects bus to obey volume and mute. |
