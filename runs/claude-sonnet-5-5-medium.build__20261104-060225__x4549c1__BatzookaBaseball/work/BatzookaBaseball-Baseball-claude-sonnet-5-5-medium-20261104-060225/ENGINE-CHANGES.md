# Engine changes (my-3D2dge v0.85.2 handoff, engine/my-3d2dge.js)

1. **Button symbols setting** (`SETTINGS.glyphs`, marked `// BATZOOKA:`): the default is now `'playstation'` and the options are PlayStation (X O Square Triangle) and Xbox (A B X Y) only, as TASK.md asks. Before, it defaulted to `'auto'` with five families.

Everything else the plan listed as an engine change was done in game code instead, so the engine stayed otherwise untouched:
- the bat is the engine's `staff` weapon with `colors.staff` / `colors.orb` set to wood, plus the game's own swing specs;
- hats are the engine's `cap` and `helmet`; no mitt (the glove is implied by the pose);
- the PlayStation / Xbox / key / mouse prompts are drawn with `px` shapes in `src/32-input.js` because the 5x7 font has no X O Square Triangle glyphs.
