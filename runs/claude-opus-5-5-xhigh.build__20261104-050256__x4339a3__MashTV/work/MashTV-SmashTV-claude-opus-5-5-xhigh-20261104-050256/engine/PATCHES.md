# MASH TV engine patches

`engine/my-3d2dge.js` is the handoff's full engine (my-3D2dge v0.85.2, commit 4390a98) with four small patches, applied by
`node tools/patch-engine.mjs` (which reads `handoff/my-3d2dge.js`). Each is marked `// MASH TV PATCH Pn` in the source.

| # | Patch | Why |
|---|---|---|
| P1 | `E.HOOKS = HOOKS;` right after the hook lists are declared | The game must switch every player's input preset each step, after `input.tick` and before the Shell reads navigation: the arrow keys aim in play (8-way fire) but move the focus in menus, the pause screen and our overlays. The hook lists were private. |
| P2 | The standard `glyphs` setting defaults to `'playstation'`, offers PlayStation or Xbox, and its `apply` sets `glyphs` on every `game.players` input; `addPlayer` copies player 1's glyphs to a player who joins | TASK.md asks for PlayStation glyphs by default with a Settings option for Xbox. The stock default was `'auto'` (Xbox for an unknown pad) and only player 1 was updated. |
| P3 | `E.Arcade.enter(score, mode, done, input)` reads the given input (default `game.input`); `continue()` takes a press from any `game.players` input | In co-op each contestant enters their own initials with their own controller, and any player may continue. |
| P4 | `get bus()` on the audio object: the effects bus (null before the first sound) | The Babble voices and the crowd are built from raw Web Audio nodes; routing them through the effects bus makes them obey the volume, effects and mute settings. |

No other engine code was changed. Everything else (the game's own HUD, UI kit, glyph icons, 10-foot CSS for the Shell,
netcode, voices) lives in the game's source.
