# Procedural audio implementation

`src/audio/music.js` exports `GardenAudio`, `makeGardenSong`, `makeSting`, `AUDIO_CAPTIONS`, `EFFECTS`, and async `renderAudioProof`.

## Integration

- Construct `new GardenAudio(game)` after the engine game exists.
- Fresh music volume remains the app's responsibility: define standard setting `music` with value `0.1`. Saved settings should restore normally. Set a separate native `voice`/`voices` setting whose apply updates `game.audio.voiceVolume` and calls `applyVolume()`.
- Call `scene('title' | 'play' | 'attract' | 'workshop' | 'clear' | 'defeat' | 'victory', gardenIndex)` on presentation transitions. Identical calls are idempotent. `scene` intentionally resumes a previously stopped soundtrack; do not call it after Hub end.
- Feed drained simulation events through `event(e)`. Supported types: bite, catch, pursuit/warning/hunt, fright, recover/sentryRecover, wrap, tree/pickup/seed, plant, invalid/invalidPlant/plantReject, chew, hit/life/damage, respawn, clear/gardenClear, defeat/gameOver, victory/win, menu, confirm, cancel. Return value is a meaningful text equivalent, also available in `AUDIO_CAPTIONS` and diagnostics.
- Call `update(dt, view)` each active presentation step. This updates the fright music layer using `view.fright`. On pause/blur/session end call `stop()`; when explicitly resuming call `resume()`. Both methods are idempotent. `dispose()` permanently closes this adapter, without closing a shared native audio context.
- `diagnostics()` reports scene, start count, bus settings, music state, event counts, voice count, and active source counts. Expose async `renderAudioProof()` through a local debug check if desired. It creates only an OfflineAudioContext and makes no audible output.

## Composition and sound

Original syncopated four-bar pentatonic motif, five transposed arrangements at 112/120/124/130/138 BPM, with woody pluck, soft reed, bell counterpoint, triangle bass and native synthesized percussion. A 98 BPM title arrangement and 92 BPM workshop arrangement reuse the theme. An expiring fright adds a chromatic bell line and softens the lead. Clear and defeat have short stings; victory has a longer cadence.

All effects use native `audio.define`/`sfx`. Invented syllables use short saw oscillators through two moving vowel formants and the native voice bus. They have event-specific rhythms and pitch contours, no intelligible recorded speech, no samples, and no dependency on the gameplay random generator. All sources stop on finite envelopes. No generic recurring voice warnings are emitted.

The vendor engine is unchanged. The adapter extends it with three registered instruments. Stop cleanup also disconnects the native `_stings` collection if present because native music(null) stops only the main song; no sound should survive an end event.

## Verification performed

Chromium headless, Playwright Python 1.63; permitted Web Audio autoplay in this focused audio harness. Offline render reused the exact production instruments and syllable synthesizer: 132300 frames, stereo, all finite, 157878 nonzero channel samples, peak 0.1116295, RMS 0.0067499, bounded below 1. Its explicit music bus was 0.1 (Float32 value 0.10000000149).

Native engine/live analyser produced finite nonzero output (peak 0.00737658), one active music start, correct fright layers, and one synthesized bite phrase. Two stop calls left music false with zero effects and syllables; two resume calls produced exactly one new start. No page errors.

One noncritical issue found and fixed: resume restarted a fresh song with a silent fright track while the adapter retained frightened=true. `_start` now restores the layer values. The focused regression confirmed nibble layer 0.65, fright layer 0.9, and no duplicate restart.

Subjective listening quality is unknown; no person listened. Physical speakers/headphones, device latency and iOS audio behavior are unknown.
