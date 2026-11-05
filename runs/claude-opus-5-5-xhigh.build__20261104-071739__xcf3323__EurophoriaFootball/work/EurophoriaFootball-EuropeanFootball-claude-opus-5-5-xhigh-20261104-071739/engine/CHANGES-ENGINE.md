# Engine changes (my-3D2dge v0.85.2, handoff package)

Every change is marked `// EF:` in `engine/my-3d2dge.js` and applied by the scripts in `tools/patches/` (each fails
loudly if its target text is not found exactly once, so they can be re-applied to a fresh copy of the engine).

| # | Where | What | Why |
|---|---|---|---|
| 1 | `Dialog.update`, `Dialog.say` | A dialog's `voice` may be a function `(ch, index, pageText)`, called once for every newly shown letter (spaces and punctuation included); `say(text, { voice })` sets a voice for that call only. | The plan's Animalese/Simlish babble needs a syllable per letter with the letter itself (vowel formants, pauses on punctuation); the engine only played one preset blip every other letter. |
| 2 | `Audio` | `audio.bus(name)`: a GainNode on the master (made on first use) whose volume follows `game.settings[name]`; `audio.now()`; `audio.noiseBuffer()`. All return null / 0 without sound (headless, blocked). | The crowd engine and the voices synthesise their own WebAudio graphs; they need the engine's context, master volume and mute, and their own volume settings (Settings, Sound: Voices, Crowd). |
| 3 | `Humanoid._drawHD` (the shirt plate) | `o.kit = { pattern: 'hoops' \| 'stripes' \| 'halves' \| 'sash' \| 'plain', color2, number, numberColor }`: bands drawn over the shirt's plate in `color2`, and the shirt number on the back when the rig faces away. | Football kits are the teams' identity; the rig only had a single cloth colour. |
| 4 | `Humanoid.update`, new `Humanoid._tilt` | A rig state `tilt: { axis: 'forward' \| 'right', angle, pivot: 'feet' \| 'hips', lift }` that turns every joint after posing, keeps them above the floor, turns the face and hair frames with it (`mocapTilt`, composed with a clip's) and moves the cloth for that step's drawing only. | Keeper dives, diving headers, bicycle kicks, players launched by slide tackles and theatrical dives all need the whole body tilted; the built-in roll only somersaults forward. |
| 5 | The 5x7 font (`G57`) | Glyphs for É È Á Ó Ü Ö Ä Ñ Ç and é è á ó ü ö ä ñ ç. | Names and chants (JÜRGEN JAGD, OLÉ!) would otherwise draw '?'. |

Not changed: the standard `glyphs` setting. The game redefines it in its own settings (PlayStation by default, Xbox as
the option), which the engine's Settings allows (a game's spec replaces a standard one with the same key).
