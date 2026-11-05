# Engine changes (engine/my-3d2dge.js, my-3D2dge v0.85.2)

Each change is marked `(patch` / `(Ice Hoc-Kaboom patch)` in the source.

1. **Font** (after `G57`): added the PlayStation face-button symbols ✕ ○ □ △ to the 5x7 font. Why: canvas prompts printed them as `?`.
2. **Gamepad poll** (`Input.tick`): button 9 (Options) is ignored while button 8 (Create) is held. Why: AI Hub owns Create + Options.
3. **Humanoid gear hook** (`_drawHD`, `_drawClassic`): before the depth sort, `rig.gear(ops, { g, S, Sp, Q, J, C, u, view, cap, classic })` is called when a rig has one. Why: hockey sticks, skates, goalie pads, blocker, catcher, cage, visor and jersey numbers are drawn by the game, depth-sorted with the body, without forking the rig.
4. **Audio**: `organ` and `brass` periodic waves (`_custom`); `lp` / `lpTo` / `q` lowpass on oscillator voices and on music tracks; a `voice` bus (with `audio.voiceVolume`) and a public `audio.bus(name)`. Why: the arena organ, the goal horn and the babble voices.
5. **Dialog voice hook**: when `talk.voice` is a function it is called for each newly shown letter `(ch, index, text, page)`. Why: each speaker babbles in their own voice.
