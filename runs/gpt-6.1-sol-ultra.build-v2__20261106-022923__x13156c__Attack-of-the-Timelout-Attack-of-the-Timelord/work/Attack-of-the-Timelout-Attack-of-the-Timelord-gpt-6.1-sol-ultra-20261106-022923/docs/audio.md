# Procedural audio

`src/audio/audio.js` contains all production music, effects, and voices. It fetches no media, uses no recorded samples, and invokes no speech-synthesis service. An in-memory seeded noise buffer is generated entirely by code. Its private PRNG does not affect authoritative gameplay randomness.

## Integration

```js
const audio = createAudio({engineAudio: game.audio});
// Call from a deliberate key, controller, pointer, or touch action:
await audio.unlock();
audio.setVolumes({music: 0.1, effects: 0.7, voice: 0.65});
audio.setScene('combat');
audio.event(event.type, event);
if (event.type === 'voice') audio.speak(event.text, event.emotion);
audio.pause(true); // false resumes the scene
audio.destroy();   // also silences native buses after hosted end
```

The native engine defines custom effect presets with `game.audio.define`, sequences custom score data with `game.audio.music`, and provides independently controlled music, SFX, and voice buses. The director's gibberish oscillators connect to the native voice bus. Without an engine argument, the same director can create its own Web Audio graph; an injected OfflineAudioContext exercises the shared synthesis primitives without sound hardware.

Music defaults are immutable: music **0.1**, effects 0.7, voice 0.65. The game settings should save the actual music value, not a hidden per-track reduction. All settings clamp to finite 0–1 values. Native master mute and the voice volume affect every syllable.

## Original score and sound vocabulary

Six related phrases cover title, combat, escalation, boss, victory, and failure. The minor-key time motif uses a sparse high melodic line, low triangle pulse, pulse-wave counterpoint, and synthetic percussion. Later arrangements add notes and harmonic tension; victory resolves to major, while failure descends. These arrangements are original and are not transcriptions of an unverified historical score.

The SFX vocabulary includes the cannon, four separate launches, four separate interceptions, fleet destruction, mine lock, warnings, roller landing, charge-ready, brake activation/release, machine hit/recovery, phase transitions, victory/failure, and menu focus/confirmation. Events are throttled independently to prevent same-tick duplications from stacking excessive voices.

The tyrant's nonsense speech uses a saw/triangle fundamental pair, short pitch contours, two moving bandpass formants per syllable, and occasional noise consonants. Subtitle text controls rhythm and phrase length; it is never spoken as recognizable synthesized English. Angry, proud, gloating, and defeated delivery alter pitch contours. Speech is capped to a short line and every scheduled oscillator is tracked for pause and termination.

## Lifecycle and verification

No recurring scheduler exists before audio unlock. Native music follows the engine's real clock; the time brake does not stretch music or voice timing. Pausing cancels tracked effects and future syllables and stops music; resuming restarts the current arrangement. Destroy stops tracked sources and timers and silences native audio. A fresh director is required after termination.

The quiet test runner may invoke:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python tests/audio.py
```

The test renders real OfflineAudioContexts in installed Chromium, checks nonzero finite music/effects/voice signals, peaks below clipping, independently muted buses, the actual 10% default, no syllables after termination, and pause/lifecycle behavior. Numerical measurements are saved in `test-artifacts/audio.json`. This verifies signals and lifecycle; there was no human listening evaluation.
