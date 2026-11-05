# Engine changes made for Cricket Kerfuffle

The engine (my-3D2dge v0.85.2, `my-3d2dge.js`) is the builder's to change. Every change is marked `(Kerfuffle)` in the code.

1. **Cricket bat** (`weapon: 'bat'`): a flat willow blade with a grip, sticker band and toe (`_drawBat`, HD and classic
   styles), a grounded rest direction (`batRest`), `batLen` / `batScale` (the Giant Bat item), `tip()` and the swing smear
   treat it as a blade, and a two-handed grip: the top hand is IK'd onto the handle (`rig.oneHand = true` lets go while running).
2. **Cricket gear**: `pads: true` (white leg guards with buckles), hat style `'brim'` (umpires, sun hats),
   `hat: { style: 'helmet', grille: true }` (a batting helmet's face grille), `bigHands` (keeper's gloves), and
   `face: { moustache: 'handlebar' | 'walrus', beard: 'full' | 'goatee', glasses: true }`.
3. **Voice bus**: `audio._voiceBus` beside the sfx and music buses, a `voiceVolume` setting (Sound, "Voices"), and
   `audio.bus('sfx' | 'music' | 'voice')` so the game's own Web Audio graphs (crowd, gibberish voices) follow the player's volumes.
4. **Button symbols**: the Controller setting defaults to PlayStation, with Xbox (A B X Y) as the other choice.
5. **AI Hub's Create + Options**: while `game.hubActive` is set and Create (Pad8) is held, Options doesn't pause.
6. **Floor bakes**: `TileMap._floor` keeps up to 10 baked floors (was 6), so the match's cameras never re-bake.
