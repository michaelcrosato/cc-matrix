# Engine changes (my-3D2dge v0.85.2, patched for Gauntletdown)

`my-3d2dge.js` here is the handoff's engine with the changes below, applied once by `tools-dev/patch-engine.mjs`
(each replaces one exact string and fails loudly if the engine changed). The unpatched copy is not kept; the handoff
on GitHub is the original. After the patches the handoff's own `node kits/test.mjs` still passes (all 22 kits).

| # | Change | Why | Test (`node tests/run.mjs sim`) |
|---|---|---|---|
| E1 | `FlowField.updateMany(points)`: a multi-source BFS (each cell's distance to the nearest point, `src[i]` which point), rebuilt only when a point's cell or the map changes; `flow.distAt(x, y)` | Hordes head for the *nearest* hero with one field for all (the engine's field takes one target) | "E1: a field to several points is the nearest of each" |
| E2 | Humanoid gear: weapons `axe`, `bow`, `club`, `pan`, `scythe`, `fork`, `dagger` (HD style, held like a sword, with tip lengths), `offhand: 'shield'`, `hat: { style: 'horned' }` | The heroes' and monsters' identities (the Berserker's axe and horns, the Shieldmaiden's shield, the Ranger's bow, the Gnasher's club, the Fryar's pan, the Tithe's scythe, the King's fork) | "E2: the new weapons, the shield and the horned helmet pose"; screenshots |
| E3 | `Bullets`: `bounce: n` (reflects off TileMap walls on the axis that entered the wall) and `onWall(b, cx, cy)` names the wall cell | The Ricochet amulet; shots that break cracked walls | "E3: a bouncing bullet comes back", "E3: onWall names the wall cell" |
| E4 | Input: a gamepad's Options (button 9) is ignored while Create (button 8) is held | AI Hub rule: Create + Options is the hub's | "E4: Options is ignored while Create is held" |
| E5 | The `glyphs` setting defaults to PlayStation, applies to every player, and joining players take it (and the dead zone) | TASK.md: PlayStation glyphs by default, a Settings option for Xbox (A B X Y) | "button symbols: PlayStation by default", "the Xbox option shows RT and A" |
| E6 | Shell: `theme.scale` (a number or a function of the window) zooms the menus for a TV; `spec.rows` makes a screen of setting rows ('#Heading' for a heading); groups starting with `Dev` stay off the Settings screen; the button symbols row also on the Settings screen | The engine's HTML menus are 13-14 px: too small at 10 feet. Dev Tools needs the row widgets on its own pages | "E6: a screen of setting rows"; 1920x1080 screenshots of Settings, Pause, Dev Tools |
| E7 | Arcade: `cab.enter(score, mode, done, { input, extra })` reads that player's input and keeps extra fields beside the name and score | Each qualifying player names themself with their own controller; the table shows the class and the floor reached | "E7: player 2 types their own initials; extra fields kept" |
| E8 | Audio: `audio.bus('sfx' | 'music' | 'voice')`, a voice bus under the master volume, and a standard **Voices** volume setting | The Babble voices follow the player's volume and mute | "E8: audio.bus answers headless without error" |
| E9 | `Input.halfKeys`: the keyboard's left half keeps the mouse buttons | Player 1 still aims and fires with the mouse when player 2 takes the keyboard's right half | "E9: the keyboard's left half keeps the mouse" |

Nothing else in the engine changed: its fixed step, scenes, standard menus, renderer and views are as shipped.
