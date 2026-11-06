# Procedural audio

`audio.js` exports `AudioSystem` and `offlineTest`. It has no imports or assets. Construct once, then call `start()` from a user gesture (returns a promise). Call `update(dt, {speed, danger, playing})` each frame. Speed is nominally 0–55; the continuous flight-wind intensity follows it. Music starts at 10% volume. The original eight-bar fanfare combines detuned filtered brass, pizzicato arpeggios, bass, and coded percussion. Danger changes harmony and tempo.

`sfx(name)` supports fly, boost, rescue, freeze, hit, danger, success, click, failure. `voice(seed)` emits a reproducible sequence of nonsense vowel-like syllables using formant-filtered oscillators. Calls made before start are safe no-ops. `setMusicVolume` / `setSfxVolume` accept 0–1; `suspend`, `resume`, and `dispose` return promises. `stats()` reports running state, volumes, note/effect/voice counts.

`await offlineTest()` renders eight seconds through the same synthesis and gain graph. It returns peak/RMS, finite-data status, counts, and `passed`; the check requires audible output without clipping. The main browser test runner can invoke it and assert `passed` plus `musicVolume === 0.1`.
