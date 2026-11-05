# Engine changes (my-3D2dge v0.85.2, engine/my-3d2dge.js)

Every change in the engine file is marked `AOA:` in a comment so it can be found with `grep -n AOA:`.

## Made

1. **Button symbols default to PlayStation** (`Input` constructor, `this.glyphs`, and the Settings entry "Button symbols").
   The TASK asks for PlayStation glyphs by default, with an Xbox A B X Y option in Settings. The option list now starts with
   PlayStation, then Xbox. Test: `test/run.mjs`, the ui and prompt checks, and the browser walk (keycap and ✕ glyphs).
2. **A function dialog voice gets every letter** (`Dialog`'s typing). When `voice` is a function it is called for every newly
   shown letter `(ch, index, page, dialog)`. Sound presets still work as before. The game's own text box (`src/11b-text.js`)
   does the voices itself, so this hook is present but not used by the game yet.

## Not made (the plan's patch list, and what the game does instead)

- Patch 1, the PlayStation symbols in the pixel font: not added to the font table. The game maps the symbols it needs to
  characters the font has (`src/00-core.js`, `G.FONT_SAFE`) and draws the controller glyphs as pixel art (`src/10-input.js`).
- Patch 4, audio buses and instrument tables: not made. Music uses the engine's own wave types and step notation;
  sound effects use the engine's presets and custom voices.
- Patch 5, the swimsuit outfit: DONE in the engine (`outfit: 'swim'` with `swim: { cut, pattern, colors }`, in `Humanoid`'s
  outfit block, marked `AOA: patch 5`). It draws the top (one piece, sport crop, tankini: the cut is a fraction of the torso),
  the brief or shorts (a fraction of the thigh), and a 10 x 8 pattern grid over the top (stripes, pin, dots, waves, stars,
  florals, palms, checks, gradient, geometry, scales, sevens, lame). Hair styles and extra hats are drawn by the game
  (`src/16-dress.js`), because they need the rig's joints, not the engine's outfit code. The arms take an IK target through a
  wrapped `solvePose` (`src/15-anim.js`), using the engine's `ik3`. Motion capture uses the engine's `Mocap.drive`, unmodified.
- Patch 6, the session combo rule (`reserveCombo`): not made. The session's Options/Create handling is the engine's default.
- Patch 7, touch off: done in the game (`G.game.input.touchEnabled = false`), not in the engine.
- Patch 8, registering the court and serve-cam views: done in the game with `new E.View(...)`, not in `E.VIEWS`.
