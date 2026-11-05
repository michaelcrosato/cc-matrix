# Engine changes (my-3D2dge v0.85.2, engine/my-3d2dge.js)

1. `Dialog` voice may be a function `(ch, index, text, talk)`, called for each revealed letter: used for the gibberish (Animalese-style) character voices.
2. The `glyphs` setting and `Input.glyphs` default to `'playstation'` (TASK.md wants PlayStation glyphs unless the player picks Xbox).
3. `ChipAudio.bus('sfx' | 'music' | 'master')` and `ChipAudio.noiseBuffer()`: the game's own continuous train sound and voices go through the player's volume, mute and duck settings.
4. `Input.press` ignores Options (`Pad9`) while Create (`Pad8`) is held inside an AI Hub session (the hub's corner bar).

Not done from PLAN.md section 3.8, and why: no `modules/rail.js` fork (the rail renderer lives in `src/30-render.js` as `DH.drawWorld`, no engine change needed), no new Humanoid poses (portraits only), no Settings group filter (Dev Mode sliders are the game's own screen), the local Duel was added later as src/62-duel.js.
