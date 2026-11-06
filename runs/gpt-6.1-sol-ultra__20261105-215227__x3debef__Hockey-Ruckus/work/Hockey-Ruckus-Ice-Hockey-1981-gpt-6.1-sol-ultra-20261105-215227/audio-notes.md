# Procedural audio

`audio.js` is a self-contained ES module. It loads no assets and makes no requests.

- `new HockeyAudio()` starts locked and silent; call `unlock()` inside a pointer/key/gamepad user action.
- `setPlaying(true)` starts an original 138 BPM eight-bar organ, walking bass and brushed electronic drum shuffle. `false` fades the music. Scheduling pauses whenever the AudioContext is suspended, and resumes at the current time rather than replaying stale beats.
- `setMusic(0..1)` defaults to `0.10`. `setSfx(0..1)` defaults to `0.72` and also controls voices.
- `play(name, strength=1)` supports `shot`, `pass`, `pickup`, `check`, `board`, `goal`, `whistle`, `crowd`, `ui`, `win`, `lose`, `skate`, `count`. Rapid board/pickup effects are rate-limited.
- `say(event)` supports `ready`, `goal`, `win`, `lose`, `check`, `overtime`, `hello`. It synthesizes gibberish using a changing pitch source, two vowel formants, and consonant noise. No real words or speech service.
- `getLevels()` returns the final analyser's `{rms, peak}` for runtime sound checks. `dispose()` stops the scheduler and closes the context.
- `renderAudioProbe(OfflineAudioContext)` renders independent music, effects, and voice probes and returns `{musicVolume, music:{rms,peak,nonFinite}, effects:{...}, voice:{...}}`.

Verified syntax as ES module and rendered all three audio categories in Chromium 153 OfflineAudioContext. Music RMS 0.003702, effects RMS 0.016557, voice RMS 0.004996; all nonzero, all finite, all below clipping. Verified a live context unlocks, schedules music beats, responds to both volume setters, produces analyser output, fades and disposes. No sound was listened to: subjective sound quality is unknown. No functional issues were caught; the initial `node --check audio.js` invocation treated `.js` as CommonJS, so syntax was correctly checked with `node --input-type=module --check < audio.js`.
