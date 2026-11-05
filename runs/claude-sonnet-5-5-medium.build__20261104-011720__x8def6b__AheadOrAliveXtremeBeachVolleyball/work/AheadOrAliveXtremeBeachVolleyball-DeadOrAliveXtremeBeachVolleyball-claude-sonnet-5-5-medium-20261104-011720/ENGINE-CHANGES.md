# Engine changes (all marked `AOA:` in engine/my-3d2dge.js)
1. G57 pixel font: added the PlayStation symbols and arrows (cross, circle, square, triangle, left/right) because input.label() returns them for DualSense and the font lacked them (they drew as "?").
2. `glyphs` setting: now in the Game group, default PlayStation, options PlayStation / Xbox only (TASK.md asks for exactly this).
3. Dialog: `voice` may be a function `(ch, index, pageText, dialog)` called for every newly typed letter, for Animalese voices.
4. Input default `glyphs` is 'playstation' so prompts show PlayStation symbols from the first frame.

Not done from PLAN.md (time): Humanoid swimwear/hair/hat styles and extras hook, extra voice bus and music instrument options, the reserved Create+Options combo and touch: 'never'. Their jobs are handled in game code (shirt outfits with swimsuit colours, touch settings 'off' on touch-only devices).
5. `touch: 'never'` game option hides touch buttons and the stick for good (touch-only devices use it).
6. A third audio bus for voices: `audio.bus('voice')`, `audio.voiceVolume`; the 'Voices' setting drives it and Animalese plays through it.
7. Humanoid extras hook: rig.extras = [{ at:'head', draw(g,x,y,rig,view,info) }] drawn at the projected head after the rig; used for sunglasses, a hair flower and a sweat band.
