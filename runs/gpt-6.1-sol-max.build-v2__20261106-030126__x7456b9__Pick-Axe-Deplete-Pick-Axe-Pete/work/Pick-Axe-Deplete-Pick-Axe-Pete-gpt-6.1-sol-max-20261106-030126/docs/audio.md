# Coded audio

`src/audio/audio.js` installs `PD.MineAudio`. It uses the unmodified engine's `ChipAudio` sequencer, native SFX definitions, public instrument registration and named music/SFX/voice buses. The three chamber scores, extraction variation, success/failure stings, original effects and four formant syllable colors are original code. No audio assets or network requests are used. Listening quality is unconfirmed.

## Integration

Construct `const audio = new PD.MineAudio(game)` after the native `E.Game` exists. Call `audio.set(savedSettings)` with `{music:0.1, sfx:0.7, voice:0.4, mute:false}` defaults. Preferences belong to the application; this module does not read or write storage. `music` is the native music bus gain and starts at exactly 0.1. `voice` has its own independent gain.

Call `audio.wake()` in an allowed key, pointer or touch gesture. It returns a Promise<boolean>; neither simulation startup nor Hub ready should await it. Until wake, this module creates no audio context or timer. A suspended or unavailable context is tolerated. On a standalone replay after `stop()`, call `wake()` again to restore preferences and permit the score to restart.

Each presentation step calls `audio.update(dt, {chamber, pressure, relief, status, finale:{wave}, attract})`. Chambers are zero-based; pressure is 0..1; relief is seconds. Chapter scores use distinct keys/instrument lines; relief reduces percussion; pressure adds a bright warning layer and modest tempo rise. The third chamber selects the extraction score when `finale.wave > 0`. Status `ended` stops all output. `victory`, `failure`, `won`, `lost`, `wipe` and `time-up` avoid replacing a result sting.

Feed authoritative presentation events to `audio.event({id,type,x,z,p,kind,text})`. Stable IDs are deduplicated (latest 1024); effects have short per-family rate limits. Recognized types: step, climb, warning, chop, redirect, ore, collision, wear, break, pick, key, keyLost, hurt, down, rescue, jam, door, wave, victory, failure, ui, jump, land, ladder. `warning.kind` distinguishes heavy and hopper/bounce/bouncer/high from ordinary ore. Actual simulation events are accepted directly: rung → climb, ladderWarn → ladder, ladderForm/ladderDismount/ladderExpire → their corresponding cues, keyRise/supply → distinct rising/falling supply tones, keyExpire/pickExpire → loss cue, swing → chop wind or redirect anticipation, armor → banded-rock clank, waveClear → completion flourish, and entry → calm door flourish with a boast. No main-level event renaming is needed. Event `p` 0/1 changes the miner's synthesized base pitch. Alarm, boast and delight gibberish accompany relevant events; informative captions are the view's responsibility.

`stop()` stops all tracked effects and custom music/voice sources, mutes the native master and prevents future scheduling. It clears the native crossfade/sting queues and timer as an adapter-level lifecycle extension, because the native API exposes stopMusic but no immediate all-sound stop. This does not modify the engine file. `dispose()` permanently stops the adapter; `game.dispose()` closes the engine-owned context. `diagnostics()` returns bus levels, context, active source/effect counts, song and scheduler state.

## Programmatic evidence

On 2026-11-06, a Playwright 1.63 Chromium headless probe loaded the full engine and this module into a canvas document, created the native game, called `renderProof()`, woke live audio, triggered the extraction score/key event and stopped/disposed it. No page errors occurred. `biome check --write src/audio/audio.js` passed after formatting.

`await audio.renderProof()` renders the same pluck/bass/bell/strike/formant synthesis routines through a four-channel OfflineAudioContext: independent music, SFX and voice plus the combined native-equivalent 0.7-master output. It also renders mute and voice-off cases. Results:

| Check | Evidence |
| --- | --- |
| Default music gain | 0.1 before context creation |
| Music non-silence | RMS 0.00308717, peak 0.0410086 |
| SFX non-silence | RMS 0.0118552, peak 0.261595 |
| Voice non-silence | RMS 0.00549563, peak 0.0754874 |
| Combined bounded signal | RMS 0.00935429, peak 0.183108 (<1) |
| Muted signal | Peak 0 |
| Voice disabled | Voice channel peak 0 |
| Finished source cleanup | All channels peak 0 after 1.8 s |
| Live stop | ActiveSources 0, ActiveEffects 0, scheduled false, muted true |

The aggregate game verification command should call `renderProof()` and assert these properties, not exact floating-point sample values. Real speakers, listener comfort and musical taste cannot be established by these stand-ins.

A follow-up Chromium probe exercised actual simulation names, confirmed distinct ore/hopper/heavy warnings and rung/ladder/key-rise/chop/redirect mappings, reran the offline bus/mute/cleanup proof and observed zero page errors.
