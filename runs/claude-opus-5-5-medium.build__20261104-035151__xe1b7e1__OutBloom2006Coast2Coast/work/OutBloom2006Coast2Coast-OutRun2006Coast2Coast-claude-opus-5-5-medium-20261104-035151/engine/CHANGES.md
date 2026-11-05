# Engine changes for OutBloom 2006: Coast 2 Coast

All in `my-3d2dge.js` (v0.85.2, commit 4390a98), each marked `OutBloom E#` in the source. The plan's E1/E2 (road junctions and dressing) were built in the game instead (`src/10-road.js`), as a forking renderer of its own.

| # | Change | Why |
|---|---|---|
| E3 | `input.analog(action)` (0..1 from the pad's button values, 1 for a held key) and `input.setAnalog(action, v)`; `input.padValues` | Throttle and brake on R2/L2 must be progressive; the engine read pad buttons as on/off only. |
| E4 | While `AIHub.active`, Options (Pad9) is ignored while Create (Pad8) is held | The hub protocol reserves Create + Options for its corner bar. |
| E5 | The `glyphs` setting defaults to PlayStation, with Xbox as the only other choice | TASK.md: PlayStation glyphs by default, a Settings option for Xbox. |
| E6 | Music tokens take chords (`C4+E4+G4`) and accents (`C4!`); tracks take `decay` (plucked notes), `detune` (a unison voice), `lowpass`, `attack`; drum tokens `p` clap, `r` rim, `g` conga, `b` cowbell, `z` shaker, `m` timbale, `y` ride | Latin fusion, city pop and Eurobeat need chords, plucks and percussion that bare chip voices can't carry. |
| E7 | `audio.loop(spec)`: continuous oscillators and noise with `set()` and `stop()`, silent while paused | A car needs a living engine note, tyre squeal and wind; the engine only had one-shot sounds. |
| E8 | `new E.Game({ shellTheme, shellCss, shellScreens })`: the engine's own pause/settings/controls shell takes the game's theme variables, extra CSS (larger type, taller buttons) and Help screen | The standard HTML screens must read at TV distance (10-foot UI) and carry the game's palette and help, without replacing the standard menus. |
