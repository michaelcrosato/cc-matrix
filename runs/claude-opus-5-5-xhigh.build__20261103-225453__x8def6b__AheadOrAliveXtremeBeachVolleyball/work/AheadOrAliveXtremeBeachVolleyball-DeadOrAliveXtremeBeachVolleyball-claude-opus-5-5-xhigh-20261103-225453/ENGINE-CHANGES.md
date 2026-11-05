# Engine changes (my-3D2dge v0.85.2, `engine/my-3d2dge.js`)

Every change is marked `// AOA:` in the engine source. The scripts that applied the larger ones are in `tools/patches/`.

| # | What changed | Why | Tested by |
| --- | --- | --- | --- |
| 1 | The 5x7 font gained ✕ ○ □ △ ◀ ▶ ▼ ✓, the card suits ♠ ♦ ♣, `· … — ’ ²` and `¡ í é è ó á ñ ú` | `input.label()` returns PlayStation symbols the font could not draw; steppers need arrows; the writing uses Spanish and Norse names | data (every line fits the box), screenshots |
| 2 | The standard `glyphs` setting is "Button symbols" in the Game group: PlayStation (default) or Xbox, applied to every player | TASK.md: PlayStation glyphs by default, an Xbox option in Settings | ui |
| 3 | `Dialog`: a function `voice` is called for every letter typed (`voice(ch, i, text, dialog)`); `say()` takes a per-line `voice` and `nameColor` | the Animalese voices follow the text letter by letter, per speaker | story, browser |
| 4 | Audio: a third bus for voices with a Voices volume setting; `audio.bus(name)`; `audio.instruments` (PeriodicWave partials: steel, marimba, bell, organ); music tracks take `decay`, `filter` + `cutoff`, `detune` and an instrument as `wave` | a tropical score (steel drum, marimba, plucks, pads) and voices with their own level | data (songs build), browser |
| 5 | `Humanoid`: an `athletic` build; `outfit: 'swim'` with 7 cuts (one-piece, racer, halter, sport two-piece, tankini, rash guard, sarong) and 14 patterns filled pixel by pixel; `o.pattern` on shirts; `o.shorts`; hair `twinbuns`, `bun`, `braid`, `bob`, `puff`, `curly`; hats `sunhat`, `visor`; an `extras` hook (accessories drawn at head, face, neck, hair and wrist anchors, depth sorted); sandal straps (`colors.strap`) over bare feet; 14 held poses (vready, bump, set, toss, highfive, clap, facepalm, peace, lookback, stretch, sit, sunbathe, spikearm, blockup); explicit pose weights (`state.poseW`) and a timed arm and body overlay (`rig.arms`: hand targets, crouch, lean, twist) | the cast in swimsuits and accessories, and volleyball moves timed to the simulation | rig sheets (`tools/rigsheet.mjs cast|suits|poses|acc|clips`), every suite draws them in the browser |
| 6 | `input.reserveCombo = [8, 9]`: while Create is held, Options presses reach no action | the AI Hub's corner bar (Create + Options) | hub harness |
| 7 | `new E.Game({ touch: 'never' })`: no touch buttons or stick, no Touch settings group, the corner's menu kept | touch-only devices get a notice instead of touch controls | ui, browser (an emulated phone) |
| 8 | `E.onStep(fn)`: a hook on every step's input pass, through fades and pauses | the attract must end on any input, even during a scene transition | attract |
| 9 | `Input.halfKeys`: each action takes the next half-keyboard button that no earlier action in the preset already holds | a menu preset's `alt` and `extra` were given F and G (left half), the keys `confirm` and `cancel` already use, so Outfit and Ready were the same key in the Beach Match lobby. Gameplay presets don't change: their play buttons come before confirm, and sharing F there is intended | pads (a clash check on both halves) |

Game code also registers two views, `court` (Broadcast: yaw 12, pitch 30, scale 1.5) and `servecam` (yaw -90, pitch 46), in `E.VIEWS`.
