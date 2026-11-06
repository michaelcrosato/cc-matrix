# Procedural audio

`audio.js` exports `AudioDirector`. Instantiate once, call `unlock()` from any player gesture, then call `update(dt, {playing, heat, stage})` each frame. `playing` controls the original ragtime chase score, `heat` accepts 0–1, and `stage` accepts a positive number. No scheduler timers are used, and the scheduling look-ahead is bounded at four eighth notes.

Music gain starts at 0.10. Effects start at 0.65. Both sliders accept 0–1. `mute(true)` silences the master. `speak('cop')`, `speak('thief')`, `speak('win')`, and other moods synthesize vowel-formant gibberish with short consonant noise. `sfx()` accepts jump, duck, coin/loot, hit, elevator/lift, catch, win, lose, tick, menu, and dash.

Original audio uses Web Audio oscillator voices, amplitude envelopes, deterministic noise, bandpass filters, and a master dynamics compressor. No music, effect, or voice files are loaded.

Run `/home/micha/.local/share/pipx/venvs/playwright/bin/python audio-tests.py`. It prints only failures and a one-line total. Nine checks passed in Chromium: offline synthesis support, finite samples, audible signal without clipping, default music volume, gesture unlock, realtime score/effect/voice scheduling, clamp and mute, source cleanup, and absence of runtime errors. These tests found zero issues. Physical listening was unavailable.
