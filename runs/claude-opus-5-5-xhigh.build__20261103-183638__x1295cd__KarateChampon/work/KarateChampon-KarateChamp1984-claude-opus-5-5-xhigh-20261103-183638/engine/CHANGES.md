# Engine changes for Karate Champon

This copy of the my-3D2dge v0.85.2 handoff package was changed in five places (all in `my-3d2dge.js`; each is marked
`EC1`..`EC5` in the source). `node kits/test.mjs fighting arcade` still passes after them.

| | Change | Why |
|---|---|---|
| EC1 | **Right-stick codes.** `Input.tick` turns the right stick into four codes, `PadRAxisUp/Down/Left/Right`: a 4-way gate on its dominant axis, pressed past 0.5, released below 0.35 (hysteresis). They are labelled `R stick ↑` and so on, sit in `FIXED_CODES` (they stay bound when a player rebinds), and are released when the pad goes. | Karate Champ is a two-stick game: the right stick is the technique stick. Before this the right stick existed only as `input.padAim` and could not be bound to an action or shown in a prompt. |
| EC2 | **Standard-setting defaults.** `new E.Game({ defaults: { glyphs: 'playstation' } })` overrides a standard setting's default; Restore defaults returns to it. | TASK.md asks for PlayStation glyphs by default with an Xbox option; `STANDARD_SETTINGS` is internal and defaulted to `auto`. |
| EC3 | **Font glyphs.** ✕ ○ □ △ added to the 5x7 font. | A fallback for prompts written as text (the game draws its own coloured badges for the icons). |
| EC5 | **Music look-ahead covers the output latency.** `_frame` records how far the heard audio trails the context's clock (`audio._lat`, from `getOutputTimestamp`); `_ahead` schedules notes that far further ahead. | The music clock anchors notes to the time they are heard; with an output latency above the 0.15 s look-ahead (Bluetooth headphones, 150-250 ms; headless Chromium reports about 0.26 s) every note was scheduled in the past and skipped, so the music went silent while effects and voices played. Found by measuring the real output in the browser. |
| EC4 | **Live pause.** With `game.live = true`, `_step` keeps stepping the scene while the game is paused (the menu is open). | In an AI Hub shared-world session the world must never stop: a guest opening its menu must not freeze the host's bout. The game neutralizes that player's input while its menu is open. |

Nothing else in the engine was changed. Game-side extensions (not engine edits): custom views `kcside` and `kctatami`
(scale 1.2), karate poses by wrapping `rig.solvePose` (bow, seiza, kamae, blocks, referee signals, judges' flags), the
spins by animating the rig's facing angle, the voice bus as a GainNode on `audio._master`.

(One comment, not code: the build-stamp note "a placeholder in the repo" now reads "a stand-in value in the repo", so a
search of the shipped single file for leftover placeholder text finds nothing.)
