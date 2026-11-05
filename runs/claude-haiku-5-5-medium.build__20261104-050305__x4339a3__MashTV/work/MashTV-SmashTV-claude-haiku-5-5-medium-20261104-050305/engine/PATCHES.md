# Engine patches (my-3d2dge v0.85.2)

`engine/my-3d2dge.js` is the handoff's full engine (`dist/handoff/my-3d2dge.js`) with these patches applied by
`tools/patch-engine.mjs`, which fails unless each target text matches exactly once. Each patch is marked in the source
with `MASH TV PATCH`.

| # | Where | Patch | Why |
|---|---|---|---|
| P1 | after `const HOOKS = …` | `E.HOOKS = HOOKS;` | The game switches every player's input preset (arrows aim in play, navigate in menus) from an input hook before the pause menu reads navigation. The hook list was private. |
| P3 | `Arcade.enter`, `Arcade.update`, `Arcade.continue` | `enter(score, mode, done, input)` reads the given input for the initials (each player enters their own); the entry and the continue read `game.players` (any player may continue). | Co-op initials and a continue that any player can take. |
| P4 | the audio object | `get bus()` returns the effects bus after `_init()` | Babble voices pass through the effects bus, so volume and mute apply to them. |

Not patched (the game does it itself): the glyph setting (the game reads the engine's `glyphs` setting and treats anything
but `xbox` as PlayStation), the pause menu items (the engine's `menu.items`), and the arcade table (`cab.drawTable`).

Known engine notes, not changed: `audio.layer` prints a warning when the playing song has no such track (the game checks
first, so the warning should not appear in play).
