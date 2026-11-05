# Engine changes (my-3D2dge v0.85.2, handoff package)

Every change is applied by `tools/patch-engine.py` from the pristine `engine/my-3d2dge.orig.js` to `engine/my-3d2dge.js`,
and marked in the source with `[ICE HOC-KABOOM]`.

1. **Font**: the PlayStation face-button symbols (✕ ○ □ △) and a few typographic marks (· — … ✓ ☆ ◂ ’ “ ” ♦) added to the
   5x7 font (`G57`). Why: canvas prompts showed `?` for the symbols `PAD_GLYPHS.playstation` itself uses.
2. **AI Hub controller rule**: in the gamepad poll, button 9 (Options) is ignored while button 8 (Create) is held, and the
   join check does the same. Why: AI Hub reserves Create + Options for its corner bar. Harmless outside the hub.
3. **Humanoid gear**: `weapon: 'stick' | 'gstick'` are accepted (no built-in weapon drawn), and a gear hook, `o.gear(K)`,
   runs in both `_drawHD` and `_drawClassic` before the depth sort, with the rig's projection helpers and its `ops` list.
   Why: the hockey look rests on sticks, skates, helmets, masks, goalie pads, blockers, catchers, numbers and letters,
   and drawing them inside the rig's own depth-sorted ops is the only way they sort correctly against the limbs. The game
   draws all the gear itself through the hook (`src/21-rigs.js`), so the engine stays general.
4. **Audio**: periodic waves `organ` (drawbars 1, 2, 3, 4, 6, 8) and `brass` (odd-heavy saw) for `sfx` voices and song
   tracks; `lp` / `lpTo` / `q` (a lowpass, optionally swept) on oscillator voices and tracks; tracks also take `attack`
   and `decay`; a `voice` bus routed to master with `audio.voiceVolume`; `audio.bus(name)` returns the master, sfx,
   music or voice gain node for a game's own sound graphs. Why: the arena organ, the goal horn and the formant-filtered
   babble voices need them.
5. **Dialog voice hook**: `voice` may be a function `(ch, index, text, page)` called for each newly typed letter, on the
   dialog or per `say()`. Why: every speaker babbles in their own voice.
6. **Floor bake cache**: a TileMap keeps 12 baked floors (one per view and zoom), not 6. Why: a match uses the broadcast,
   overhead and ice-level views at a few zooms; with 6 the cache cleared and re-baked mid-game.
