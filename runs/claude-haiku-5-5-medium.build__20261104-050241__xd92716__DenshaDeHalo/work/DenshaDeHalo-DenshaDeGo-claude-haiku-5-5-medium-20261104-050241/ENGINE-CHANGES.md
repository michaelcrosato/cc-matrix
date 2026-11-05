# Engine changes

None. The game uses the handoff engine (my-3D2dge v0.85.2, `engine/my-3d2dge.js`) unmodified.

What the plan expected to patch, and what was done instead:
- Rail renderer: written as the game's own module (`src/10-rail.js`, `src/12-art.js`), not `engine/modules/rail.js`. It is a fork of
  the idea in `modules/road.js`, not a patch to it.
- Dialog voice hook (`talk.voice`): not used. Voices are played through `game.audio.sfx` by `src/41-babble.js`.
- Settings-group filter (`Shell._settingsRows`): not used. Dev Mode is the game's own screen (`src/60-scenes.js`, `DH.devRows`).
- Glyphs: the engine's `input.glyphs` setting is set by the game ('playstation' by default, 'xbox' from Settings); the PlayStation
  symbols are drawn as shapes in `src/50-hud.js` because the 5x7 font has no ✕ ○ □ △.
- Humanoid poses (bow, point, flag): not added; no character rigs are drawn in play.
- ChipAudio bus accessors: not added; the continuous train sounds are a small Web Audio graph in `src/40-sound.js`.
