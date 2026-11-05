# Engine patches (my-3D2dge v0.85.2 handoff, for Tide Crisis 3)

1. **PlayStation glyphs by default.** The `glyphs` setting defaults to `playstation` and offers PlayStation and Xbox
   only (TASK.md: PlayStation glyphs, with a Settings option for Xbox). `input.glyphs` starts as `playstation` too.
2. **Long guns.** `new E.Humanoid({ weapon: 'rifle' })` is a gun with `gunLen: 10` and a wooden stock (`colors.stock`);
   any gun takes `gunLen`. `tip()` returns the muzzle of the longer barrel. Soldiers in a light-gun game carry rifles.
3. **Audio buses.** `game.audio.bus('sfx' | 'music')` returns the effects or music GainNode, so the game's own Web
   Audio graphs (the gibberish voice synth, surf, rain) follow the volume settings.
4. **Mouse-wheel codes.** When the scene's zoom is off and an action is bound to `WheelUp` or `WheelDown`, a wheel
   notch taps that code for one step (at most one per 90 ms); `codeLabel` names them "Wheel up" and "Wheel down".
   The wheel switches weapons.
5. **Font glyphs.** The 5x7 font gains the PlayStation face-button symbols (✕ ○ □ △), an em dash, an ellipsis, a
   middle dot, a gear and ∞. `input.label()` returns '✕' for a DualSense, and the font drew '?' for it.
   Also '◂', the left twin of the font's '▸' (the dev panel's adjust hint).
