# Engine changes (Batzooka Baseball)

The engine is my-3D2dge v0.85.2 (the handoff package, `engine/`). Every change is marked `BATZOOKA:` in the file.

1. **Button symbols default to PlayStation.** The task asks for PlayStation glyphs on a controller, with an Xbox (A B X Y)
   option in Settings. The engine's default was 'auto' (guessed from the controller's name). Changed to 'playstation' in
   the standard `glyphs` setting (group Controller) and in the input's initial `glyphs`. The Settings option still offers
   Xbox, Nintendo, positions and auto.

No other engine files were changed. The game's own code lives in `src/`.
