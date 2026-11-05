# Engine patches

Every change to the engines, small and marked `PATCH (Eye of the Bolt-Holder)` in the source.

## engine/my-3d2dge.js (the 2D engine, v0.85.2)

1. **Beards and shut eyes** (`E.Humanoid` head drawing). New rig options `beard: 'full' | 'braided'` (drawn in the
   hair's colour over the jaw, in `draw` and therefore in `drawPortrait`) and `eyesShut: true` (eyes drawn closed, for
   Sister Veil). Why: the dwarves need beards and Veil keeps her eyes shut; the rig had neither.
2. **Button symbols** (the standard `glyphs` setting). Defaults to PlayStation and offers only PlayStation and Xbox.
   Why: the task's controller-first rule (PlayStation glyphs by default, an Xbox option).
3. **A voice bus** (`game.audio`). A third gain bus beside sfx and music, with `audio.voiceVolume`, and
   `audio.bus('sfx' | 'music' | 'voice')` to reach a bus. Why: the babble synth plays on its own bus under its own
   Voices volume setting.
4. **Panned sound effects** (`audio.sfx(name, { pan })`). A StereoPannerNode in front of the sfx bus when `pan` is given.
   Why: flank and rear hits and monster sounds are placed by bearing.
5. **Options ignored while Create is held** (the pausable scene's pause check). Why: the AI Hub's rule (Create +
   Options opens the hub's corner bar).
6. **`saves.canLoad`** (the pause menu's Save/Load hook). `false` hides Load. Why: an AI Hub session has no saves.

## engine/my-3d2dge-3d.js (the 3D engine, v0.85.2)

1. **`world.wallBlock({ x, y, w, d, h, spec })`**: a block made from exactly the level's wall materials (the level keeps
   its side and top material makers as `L._sideMat` and `L._topMat`). Why: secret walls that sink into the floor and
   illusory walls must be indistinguishable from the walls around them, and `world.box` uses a different material.

Nothing else in either engine was changed. The pause menu's own `items` already accepted a function (checked, not
patched), so a session's menu hides Dev Mode, Journal and About by returning nothing.
