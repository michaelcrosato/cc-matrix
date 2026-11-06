# Procedural audio

`src/audio.js` is original game code. It creates every sound with Web Audio oscillators and a one-second seeded noise buffer generated in memory. There are no audio files, speech synthesis calls, or audio downloads. This supplements the native engine with a dedicated bounded synthesizer graph.

## Integration

Create `new HappyAudio(settings)` once. Call `unlock()` during an actual keyboard, pointer, touch, or controller-confirm gesture; its promise resolves to `true` when usable. Readiness and authoritative simulation do not depend on that promise. Call `setScene('title' | 'driving' | 'results' | 'off')` on scene changes. Every frame call `update(dt, {speed, maxSpeed, slip, surface, brake, paused})`. `slip` is a magnitude normalized to 0–1; surfaces `grass` and `gravel` add roughness. Scene `off` silences continuous sound and music while still permitting an explicitly triggered cue.

Cues: `countdown`, `go`, `gate`, `lap`, `crash`, `water`, `recover`, `point`, `finish`, `discovery`. `gibberish()` makes four pitched syllables, never actual spoken words. Point and finish cues include that voice automatically. The voice has a 0.7-second cooldown.

`setVolumes({master, music, sfx, voice, mute})` changes the corresponding buses. Values are clamped to 0–1. Defaults are master .70, music **.10**, SFX .70, and voice .45, with mute false. Saved values passed to the constructor replace those defaults. `stop()` clears scheduled notes/effects and silences loops while keeping the graph reusable; `destroy()` also stops the three continuous sources and closes an ordinary AudioContext. Repeated menus/retries reuse the same continuous sources. `paused` mutes the driving loops and music; updates are not a game clock.

## Signal design

The title score is a cheerful original 32-step melody over four harmonies. Driving uses a brisker arrangement with a quiet tick; results lift the melody an octave. Bass, chords, melody, and percussion use oscillator envelopes. Two filtered oscillators provide a speed/load-responsive engine; filtered noise supplies tyre and surface sound. Water, impact, checkpoint, recovery, and finish each have a distinct envelope/pitch pattern. A compressor before the analyser/output supplies headroom. Music look-ahead catches up without accumulating a hidden-tab backlog, and scene changes cancel earlier music sources.

## Verification

`tools/audio-test.mjs` exports `runAudioTests()` for the root `node tools/test.mjs` entry point. Its worker uses the installed Playwright Python interpreter and Chromium's actual OfflineAudioContext, not a mock. Thirteen checks passed: default .10 gain within AudioParam's Float32 representation, nonzero bounded score/engine/effects/voice output, exact mute/zero silence, measured music slider response, pause/stop silence, retry source reuse/bounds, and destruction cleanup. The first test exposed a strict Float32 equality expectation in the test; the test now checks the exact settings default plus AudioParam tolerance. No audio product defect was exposed by these checks.

Listening quality, a physical speaker mix, and real controller audio hardware are unknown. The browser-rendered samples and graph lifecycle are verified.
