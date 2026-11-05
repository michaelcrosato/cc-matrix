# Engine changes (my-3D2dge v0.85.2)

`tools/patch-engine.mjs` applies every change to a pristine copy of the handoff engine and writes
`engine/my-3d2dge.js`. Each patched spot carries an `AOA:` comment. Each change has a headless test.

| # | Change | Why | Test |
| --- | --- | --- | --- |
| 1 | `✕ ○ □ △ ◀ ▶` added to the 5x7 font `G57` | `input.label()` returns PlayStation symbols the font could not draw; steppers need arrows | ui suite (glyphs) |
| 2 | `glyphs` setting moved to the Game group, PlayStation by default, options PlayStation / Xbox; applied to every player | TASK.md: PlayStation glyphs by default with a Settings option for Xbox | ui suite |
| 3 | `Dialog`: a function `voice` is called for every newly shown letter | Animalese voices letter by letter, in sync with the text | story / location dialogs |
| 4a | A voice bus under the master, `audio.voiceVolume`, `audio.bus(name)` | the Voices volume setting | dev Voice Lab |
| 4b | Music and sfx voices accept `wave` = a name in `audio.instruments` (PeriodicWave tables), `decay` (pluck envelope), `cutoff` (lowpass), `detune` (a second oscillator) | steel drum, marimba, pluck, bell, organ and pad for the tropical score | data suite builds every song |
| 5 | Humanoid: `o.swim.shorts` draws swim shorts on the thighs; `rig.swimDraw(g, P)` is called inside the torso plate with its projected corners | swimsuit cuts and patterns without rewriting the HD draw | data suite dresses every suit |
| 6 | `input.reserveCombo = [8, 9]`: Options (button 9) is ignored while Create (button 8) is held | an AI Hub rule (Create + Options opens the hub's bar) | hub harness |

Touch-off mode (plan patch 7) needed no engine change: the game never asks for touch buttons and turns the touch stick
off on touch-only devices, which keeps the corner's menu button.
