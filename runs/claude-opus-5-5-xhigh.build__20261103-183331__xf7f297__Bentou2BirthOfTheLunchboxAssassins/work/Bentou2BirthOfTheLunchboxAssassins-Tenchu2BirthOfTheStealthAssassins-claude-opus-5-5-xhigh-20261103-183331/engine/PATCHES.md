# Changes to my-3D2dge v0.85.2 for Bentou 2

Every change is marked `// BENTOU PATCH n` in `my-3d2dge.js`. Each is small; nothing in the engine was refactored.

1. **Pixel font glyphs.** The PlayStation face symbols (✕ ○ □ △), ◀ ▶, and · ° — … ’ ‘ ∞ ✓ ✗ added to the 5x7 font, so
   `input.label()` text and the game's lines draw in canvas text instead of `?`.
2. **Button symbols setting.** PlayStation by default; the option is Xbox (A B X Y). TASK.md asks for PlayStation glyphs
   with a Settings option for Xbox, so the row is on the Settings screen as well as on Controls (the engine kept the
   Controller group on Controls only).
3. **Humanoid gear.** `mask: { color, style: 'cloth' | 'oni' }` (a cloth wrap over nose and mouth, or a red oni face with
   brows, tusks and a horn; it hides the mouth and shows in portraits); hats `jingasa` and `kabuto` (with a crest); weapons
   `spear` (yari), `bow` (yumi, drawn when `point`), `club` (kanabo); `offhand: { len }` (a second short blade);
   `sashimono: color` (a back banner). The period's look needs them.
4. **Shell: custom rows.** A custom screen's spec can carry `rows: [settingKeys]`, drawn as settings rows (the Dev Mode
   slider pages); settings in group `Dev` never appear on the player's Settings screen.
5. **Shell: hover moves the focus.** A mouse over a button or slider focuses it (TASK.md: hover moves the focus).
6. **Shell: the 10-foot scale.** `--ui` grows with the window's height (`clamp(1, innerHeight / 720 x size, 3)`), applied
   by CSS zoom on panels, toasts and prompts; the Interface size setting (Auto, Normal, Large, Huge); base text 16 px,
   buttons at least 52 px tall; a panel never taller than the screen.
7. **Music envelopes.** Per track `pluck: true` (a ringing, decaying note over `ring` seconds: koto, shamisen), `attack`
   and `release` (the shakuhachi's slow attack).
8. **Voice bus.** `audio.voiceBus`, a gain on the master with its own volume (`audio.voiceVolume`, the Voices setting),
   for the gibberish voices.
9. **Hub pause guard.** In an AI Hub session, Options is ignored while Create is held (the hub owns that pair).
