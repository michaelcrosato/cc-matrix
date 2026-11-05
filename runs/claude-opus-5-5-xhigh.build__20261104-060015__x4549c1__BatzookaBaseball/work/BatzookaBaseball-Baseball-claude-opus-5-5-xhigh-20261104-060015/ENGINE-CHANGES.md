# Engine changes (engine/my-3d2dge.js, from the my-3D2dge v0.85.2 handoff)

Every change is small and marked `BATZOOKA` in the source. Nothing else in the engine was edited.

1. **`weapon: 'bat'` on `E.Humanoid`.** Added to the built-in weapon list (the warning check), a rest direction (the
   bat up over the back shoulder), a draw branch in the HD style (a tapered capsule: knob, thin handle, thick barrel,
   in `colors.bat`, optional `colors.batTape`) and in the classic style, and `tip()` returns the barrel's end (12 units).
   Why: baseball needs a bat; a sword or staff reads wrong. The game adds the two-handed grip itself by wrapping
   `rig.solvePose` (the documented hook) and the Batzooka overdraw on top.
2. **`mitt` option** (`'fielder' | 'catcher' | 'first'`, with `mittHand: 'L' | 'R'`): a leather mitt drawn on the glove
   hand in `colors.mitt`, rounder and bigger for the catcher. Why: fielders without gloves don't read as ballplayers.
3. **Hats:** `hat: 'batting'` (a glossy helmet with a short brim and an ear flap on the side facing the pitcher:
   `flap: -1 | 1`), `'mask'` (a catcher's or umpire's helmet worn backward with a three-bar cage), `'visor'` (a space
   helmet: a dome with a tinted front, for the Moonbase Meteors) and `'tophat'` (a silk top hat with a `band`).
   Portraits draw them too. Why: the uniforms and the cast need them.
4. **Font glyphs:** ✕ ○ □ △ (so any `input.label()` text renders on a PlayStation pad), plus · … ✓ — ◂ ● ▲ ▼ used by
   the game's text (the inning arrows, pips, check marks). Why: they drew as "?" before.
5. **The standard `glyphs` setting** (Controller, "Button symbols"): default `'playstation'`, options PlayStation
   (✕ ○ □ △) and Xbox (A B X Y). Why: TASK.md asks for PlayStation symbols on any pad with a Settings option for Xbox.

No engine bugs needed fixing. One engine behavior shaped the game: a TileMap's baked floor is cached per view
scale, so a continuously zooming camera (`cam.frame` with a zoom range) re-bakes the floor every frame on a large
park. The game zooms its Broadcast Cam in four discrete steps instead.
