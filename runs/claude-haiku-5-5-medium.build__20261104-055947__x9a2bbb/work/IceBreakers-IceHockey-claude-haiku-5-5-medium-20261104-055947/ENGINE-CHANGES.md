# Engine changes (my-3d2dge v0.85.2, engine/my-3d2dge.js)

1. **PlayStation symbols in the pixel fonts.** Added `✕ ○ □ △` to `GLYPHS` (the tiny 3 x 5 font) and to `G57` (the normal 5 x 7 font). Why: `PAD_GLYPHS.playstation` labels the pad's buttons with these symbols, and both fonts drew them as `?`, so every PlayStation prompt on the canvas was wrong.
2. **Hub controller rule.** In the gamepad poll, while button 8 (Create) is held, button 9 (Options) is ignored. Why: AI Hub reserves Create + Options for its own corner bar. Outside a hub nothing changes.
