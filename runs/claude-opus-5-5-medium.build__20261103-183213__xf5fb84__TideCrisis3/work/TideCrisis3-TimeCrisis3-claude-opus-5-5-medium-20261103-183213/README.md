# Tide Crisis 3 (dev folder)

An original arcade light-gun rail shooter on the my-3D2dge engine (v0.85.2, patched: `engine/PATCHES.md`).

## Commands
```sh
node tools/build.mjs                 # build/game.js, the single HTML beside this folder, and exit-interview.json
node tests/run.mjs                   # fast headless suites: prints only failures and one count line
node tests/run.mjs playthrough       # bot playthroughs: every stage on Normal, ARCADE to the credits, Training
node tests/run.mjs --all             # everything, plus the browser check (4 sizes) and the AI Hub harness (4 scenarios)
```
Dev deep links on the built page: `#play=2:2-B&bot` (a scene, with the bot), `&p2` (a P2 bot in split screen),
`&dev` (dev panel), `&god`, `#scene=menu`.

## Layout
`src/` holds the game as numbered fragments of one IIFE (each starts with what it owns): core and registries (00),
materials (02), the geometry builder (03), the Rail3D renderer (04), the Sim (20), enemies (21), combat (22), bosses
(25), the stage format and prefabs (30), the stages (31-34), story (40), voice (41), audio (42), the view (44-45),
input (46), HUD (50), screens (51), dev mode (52), the bot and attract (53), the session (60), AI Hub (62), main (90)
and the About data (99).

## Adding content
Everything is data in registries: `def('scene', id, {...})` in a stage file adds an area (an arrival rail, two slots
from `Frame.slots()`, cover points from `covers()`, waves, objects, cues); `def('enemy', ...)`, `def('boss', ...)`,
`def('cutscene', ...)`, `def('song', ...)`, `def('speaker', ...)`. The content suite runs the validators: every id
resolves, every cover point's exposed head is on screen and shootable, every objective and bonus target can be hit.
