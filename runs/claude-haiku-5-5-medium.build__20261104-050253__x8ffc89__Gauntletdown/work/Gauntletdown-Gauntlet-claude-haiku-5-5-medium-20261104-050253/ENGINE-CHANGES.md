# Engine changes (my-3D2dge v0.85.2)

No engine files were changed. `my-3d2dge.js` in this folder is the handoff copy, unmodified.

The plan asked for eight engine changes (E1 to E8). None were made. Each was worked around in the game code:

| Plan | What it asked for | What was done instead |
|---|---|---|
| E1 | A multi-source flow field | One `E.FlowField` per living hero; each monster follows the field of its nearest hero |
| E2 | Axe, bow, shield, pan and other gear on Humanoid rigs | Not made. Heroes use the sword, staff or no weapon the engine supports, and the standard hats |
| E3 | Bullets that bounce off walls, and `onWall` | Not made. Shots stop at walls; cracked walls are not in this build |
| E4 | Ignore Pad9 while Pad8 is held | Not made. Ghost sessions do not need it: each copy runs its own game |
| E5 | PlayStation symbols by default, a Settings choice for Xbox | Done in game code: `game.input.glyphs` is set at start-up from the saved choice |
| E6 | TV scale, row widgets for any screen, hidden Dev groups | Not made. The game draws its own menus at its own size |
| E7 | Per-player initials entry on the arcade table | Not made. Initials are filled from the class tag |
| Hub | Shared-world netcode (not an engine change) | Built in the game code (61-session.js): the host runs the world, the others send intents, snapshots at eight a second |
| E8 | A voice bus with its own volume | Not made. There are no voices in this build |

Test for the one change made in code: `tests/run.mjs dev` checks the controller symbols with the default and with Xbox.
