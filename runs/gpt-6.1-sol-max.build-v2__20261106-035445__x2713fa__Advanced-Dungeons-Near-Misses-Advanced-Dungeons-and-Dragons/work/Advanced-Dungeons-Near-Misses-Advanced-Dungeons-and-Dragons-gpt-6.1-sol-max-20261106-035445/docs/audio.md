# Code-only expedition audio

`NM.Sound(game)` registers original cue voices and two instruments with the engine's actual `game.audio`. `update(sim, dt)` consumes stable simulation event IDs without changing simulation, chooses one of five cave score variants or the wilderness/victory/defeat score, and enables the guardian's pulse and wing layers from its state. No sound files, encoded samples, audio fetches, speech services, or stock songs are used.

The single engine `musicVolume` defaults to 0.10. The engine's persisted Music preference takes precedence. Its Music bus has gain 0.10 before master gain; score tracks are instrument balances, not a second application of the default. Holding focus invokes `audio.duck` and reduces that bus to 35% of its chosen level. Effects remain on the Effects bus. Synthesized consonant/vowel babble runs through the separate Voice bus with the `Gibberish voices` setting. A quiet filtered-noise cave loop has an independent `Cave ambience` setting and also respects Effects/master/mute.

The score uses an original modal melody, sparse low notes, plucked triangle/sine harmonics, and a gently vibratoed sine flute. Cave voices leave deliberate rests for information-bearing calls. The three arrows, warm/cold guardian wings, Daylight resolution, and expedition loss each have a dedicated phrase. Music follows the engine's simulation-synchronized score clock.

Arrow draw, release, flight, bank, armor deflection, wound, landing, pickup, and dry-fire have different envelopes. Rat scratching/squeaks, snake hiss, bat wing pulses, spider taps, ooze bubbles, drake snoring, and both guardian signatures are independent definitions. Creature events are attenuated by traversable acoustic path distance; pan uses the first steps toward the source along that path rather than an unrestricted line through walls. Bat interference reduces competing creature cues while its wing mask is active. Listening ducks music and increases the audible clue distance; the game renderer supplies the muted equivalent.

Keyboard, pointer, and touch gesture listeners unlock Web Audio. The root input adapter calls `sound.unlock()` on a deliberate controller gesture. Attract visuals before any gesture do not pretend to be audible. `stop()` halts the score, cave loop, pending effect handles, and formant sources and removes unlock listeners. `resume()` explicitly enables sound again when a new local game begins. The engine continues to handle context suspension/resume on browser visibility changes.

Verification:

- `tests/audio.mjs`: 73 deterministic headless checks cover event deduplication, immutable simulation state, no pregesture context, 10% default, preference override, focus duck, separate creature definitions, finite tuning ranges, and stop.
- `tests/audio_browser.py`: production Chromium/Web Audio checks cover gesture unlock, actual Music/Voice bus levels, focus duck, real persisted preference reload, every cue and instrument rendered through the engine's synthesizer into `OfflineAudioContext`, nonzero finite bounded output, live gibberish output, and stop cleanup. The fixture is `tests/audio-fixture.html`; `run(browser)` can share the orchestration browser.
- No person listened during this headless task. Composition quality and real speaker/device behavior remain unknown.
