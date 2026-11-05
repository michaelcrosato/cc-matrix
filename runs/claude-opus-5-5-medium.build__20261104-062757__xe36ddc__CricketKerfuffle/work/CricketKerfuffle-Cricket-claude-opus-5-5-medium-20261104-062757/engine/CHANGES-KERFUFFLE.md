# Engine changes for Cricket Kerfuffle (my-3D2dge v0.85.2, handoff copy)

1. Humanoid `weapon: 'bat'`: a flat willow cricket bat (handle `colors.grip`, blade `colors.willow`, a sticker band in
   `colors.trim`, a toe), the length is `bladeLen`; the free hand is drawn on the handle (a two-handed grip). The swing
   smear and `tip()` treat it like a blade. Why: the rig had swords, guns and staves, and cricket needs a bat.
2. Humanoid `pads: true`: white batting pads over the knee and shin, with a buckle in `colors.trim`.
3. Humanoid face furniture: `face: { moustache: 'walrus' | 'handlebar', beard: true, glasses: true }` (colour
   `colors.facial`, else the hair). Why: the cast (Basil's walrus, Thrumpton's handlebar, Dev's glasses) is the comedy.
4. Button symbols: the standard Controller setting defaults to PlayStation, with Xbox (A B X Y) as the one other choice
   (the input's default `glyphs` is 'playstation'). Why: the brief asks for PlayStation glyphs, Xbox from Settings.
5. Create + Options belongs to the AI Hub: while `game.hubActive` is set and the `hubCreate` action (Pad8) is held,
   the pause button does not pause (both the main and the extra players' pause checks).
6. TileMap floor bakes: the cache keeps up to 10 baked floors (was 6), so the match's cameras never re-bake.
7. Bug fix: TileMap's chunked floor trimmed its cache with a negative keep count when a low-pitched view gave an
   empty row range (j1 < j0), and threw reading old[k][0]; keep is now at least 8 and the loop stays in bounds.
