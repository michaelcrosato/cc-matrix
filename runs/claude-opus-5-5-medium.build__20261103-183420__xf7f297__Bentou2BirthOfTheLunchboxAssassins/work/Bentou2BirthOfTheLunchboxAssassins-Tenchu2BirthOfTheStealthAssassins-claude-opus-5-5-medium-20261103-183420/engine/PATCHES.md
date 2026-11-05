# Engine patches (BENTOU PATCH n)

`engine/my-3d2dge.js` is the my-3D2dge v0.85.2 handoff engine with these small edits, applied by `node tools/patch-engine.mjs`
from the pristine `handoff/my-3d2dge.js`. Each edit is marked `BENTOU PATCH n` in the source.

1. Pixel font: the PlayStation face buttons ✕ ○ □ △ in the 5x7 font, so prompts render on canvas.
2. Button symbols setting: PlayStation by default, Xbox as the option.
3. Humanoid gear: cloth and oni masks (portraits too), jingasa and kabuto hats, yari (spear), bow, kanabo (club), an
   offhand blade, a sashimono banner.
4. Shell: custom screens may show settings rows (`rows: [keys]`); the 'Dev' group never shows in the player's Settings.
5. Shell: the mouse over a button or slider moves the focus there.
6. Shell: a 10-foot scale (`--ui`, by window height times the Interface size setting), larger base text and buttons.
7. Music: per-track `pluck` / `ring` (plucked notes ring and decay), `attack` and `release`.
8. Audio: `audio.voiceBus`, a gain for the gibberish voices (the Voices setting).
9. Pause: `E.pauseGuard(game)` may veto the pause press (the AI Hub owns Create + Options).
