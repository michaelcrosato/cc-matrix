# Engine changes for Operation Big Bad Wolf (my-3D2dge v0.85.2)

1. **Dialog voice as a function** (`Dialog.update`): when `voice` is a function it is called once per typed letter as
   `voice(ch, index, dialog)` instead of playing an sfx every other letter. This is the hook for the gibberish voices.
2. **Shell rows screen** (`Shell._render`, `Shell._settingsRows`): `shell.show(name, { rows: [[heading, [keys]]] })`
   draws settings rows (sliders, toggles, selects) on any screen, and the standard Settings screen skips the groups in
   `E.Shell.hiddenGroups` (the game sets `['Dev']`), so the dev sliders live on the dev screen only.
3. **Glyph setting**: the standard `glyphs` setting defaults to PlayStation, with PlayStation and Xbox as its options
   (the task asks for PlayStation glyphs with an Xbox option).
4. **E.store keeps the visit's data where storage is blocked** (`store` in the core): `set` also keeps a copy in memory
   and `get` falls back to it, so high scores, unlocks and seen tips last the visit in Node, sandboxed frames and
   browsers that block storage (before, a blocked store forgot everything at once).
5. **Stereo pan** (`audio.sfx(voice, { pan })`): a StereoPannerNode per sound, so gunfire, rotors and explosions sit left or right of the screen.
