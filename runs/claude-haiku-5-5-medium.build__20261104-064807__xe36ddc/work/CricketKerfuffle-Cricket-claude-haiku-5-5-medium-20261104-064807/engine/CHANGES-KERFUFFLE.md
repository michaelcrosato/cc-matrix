# Engine changes (my-3D2dge v0.85.2)

None. The game's engine files are the handoff package's, unmodified (`engine/my-3d2dge.js`, `engine/modules/`, `engine/kits/`).

Everything the plan asked of the engine was built in the game instead:

- The cricket bat is drawn by the game (`src/30-present.js`, `G.batInto`), in the rig's own draw space.
- Cricket gear (pads, helmets, gloves) is approximated with the rig's existing hats, hair and kit colours.
- The formant voice synthesizer runs on the engine's audio context (`src/44-audio.js`), with no change to the audio module.
- The button-symbol setting is the game's own (`buttons` in `src/00-head.js`), not the engine's glyph option.
- The pause items are added to the engine's `menu.items` array at start (`src/99-start.js`); in an AI Hub session the array is emptied (`src/50-hub.js`).
