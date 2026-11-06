# Procedural audio

`src/audio/audio.js` extends the native engine's `ChipAudio`. It registers five original Web Audio instruments through `audio.instrument`, effect presets through `audio.define`, and uses the native music clock and volume buses. No engine patch is needed. All noise, instruments, motifs, fanfares and gibberish are generated in JavaScript; no audio files are bundled.

## Integration

- Call `RingAudio.attach(game.audio)` once after creating the engine game.
- Call `RingAudio.unlock()` directly from a user gesture. Audio readiness must never gate gameplay or Hub readiness.
- `RingAudio.configure({master,music,sfx,voice})` uses 0–1 values. `masterVolume` etc. aliases are accepted. Defaults are `.7, .10, .75, .5`. `reset()` restores those exact values.
- `setScene(name)` accepts `title`, `courtyard`, `board`/`map`, `dungeon`, `crystal`, `inferno`, `shifting`/`halls`, `final`/`finale`, `victory`.
- `event({type,id,hero,caption,role,pan})` deduplicates stable event IDs. `hero` is a class name for class-specific primary sounds; `role` selects a gibberish voice. Captions are supplied to the optional `configure({captionHandler(text,role)})` callback even when audio is locked/muted.
- `tension(dread)` adjusts the native music's named Dread layer.
- `pause(true)` stops the current song, tracked effects and voices. `pause(false)` resumes one scene song. Call for standalone pause, visibility sleep and ended sessions; online local menus may duck or continue audio if the world remains live.
- `dispose()` stops audio and clears event deduplication; `unlock()` makes the reusable singleton live again for a replay. The game, as owner of the native context, disposes that context on full teardown.
- `debug()` exposes audio-only state. `renderOffline(OfflineAudioContext,options)` renders these same instruments into independent gain buses for verification, without requiring the game or a gesture.

## Evidence

`tests/audio.py` is callable by the single test wrapper. It tests actual Chromium `OfflineAudioContext` output and native `ChipAudio` lifecycle, writing `evidence/audio.json`. Current result: 22 assertions pass. It covers all eight scene scores, three groups totaling 18 effects, voice envelopes, finite samples, unclipped peaks, bus/master silence, exact 10% defaults/reset, gesture unlock, pause suppression, scene restart, teardown, and the actual simulation classId/hero-ID event mapping. Measured default musical peaks are around 0.015–0.021; tested effect peaks are below 0.103. These measurements establish acoustic output and envelope/routing behavior; subjective mix quality and enjoyment remain unknown because there is no human listener.

## Resolved integration review finding

AUDIO-001 (low, code-review finding): simulation attack events contain a numeric `hero` ID plus a `classId`; the initial audio adapter preferred `hero`, causing non-Warrior primary actions to select the sword sound. Corrected to prefer `classId`, added generic class-power and possession mappings, and verified the exact emitted preset names with a native-adapter spy. This was found during integration review, not by a previously failing acoustic test.
