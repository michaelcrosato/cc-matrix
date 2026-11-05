# Engine changes for Karate Champon (my-3D2dge v0.85.2 handoff)

- **EC1 Right-stick codes** (`Input.tick`, `FIXED_CODES`, `CODE_LABELS`): `PadRAxisUp/Down/Left/Right` are pressed when the right
  stick passes .5 on its dominant axis (a 4-way gate) and released below .35. Before, the right stick existed only as
  `input.padAim` and could not be bound to actions, so a twin-stick "technique stick" (Karate Champ's two joysticks) was impossible.
- **EC2 Standard-setting defaults** (`Settings` constructor): `new E.Game({ defaults: { glyphs: 'playstation' } })` changes a
  standard setting's default, and Restore defaults returns to it. The task asks for PlayStation glyphs by default.
- **EC5 Voice bus** (`Audio._init`, `applyVolume`, `bus()`, a standard `voices` slider in Sound): speech (the gibberish voices)
  gets its own GainNode and volume under master and mute.
