# Native asset and sound contract

`createAssets(E)` from assets.js returns original native `E.sprite` / `E.anim` objects. No external files, image decoding or commercial extracted material are used.

- `ships[seat]`: 18×14 static upward cannon sprites. Turquoise P1 has a long central barrel; warm peach P2 has additional side fins. The renderer supplies recoil/ready light from the simulation, keeping collision authoritative.
- `enemies[row]`: four two-frame native animations. Rows are mint crowned saucers, coral peepers, lilac jellies, gold crabs. Frame lists are 16×12; silhouettes differ independently of color. Select with `.frame(formation.beat / 2)` or `.frames[formation.beat % 2]` to align poses to the march. Passing ordinary world time gives the default 2fps cycle.
- `armour`: complete 16×12 armored alien; `armourShell`: matching shell overlay; `armourAnim`: animation-compatible complete shell. Use ordinary identity after the shell breaks.
- `bombardier`: two-frame 16×12 animation, orange with a visible underslung bomb.
- `saucer`: 24×12, 5fps bonus ship; use world clock and a restrained renderer wobble. Its pink silhouette differs from the hostile flagship.
- `salvage`: 9×9, 8fps spinning mint diamond. Friendly white central pixel and diamond outline distinguish it from warm enemy projectiles.
- `flagship` and `flagshipOpen`: 70×30. Purple crescent hull, twin heavy emitters, cyan bridge and dark/bright central iris. Renderer may draw telegraphs, emitter damage and opening interpolation above these native sprites.
- `repair`, `bomb`, `heavyBomb`: pixel icons/projectile sprites.
- `hues`, `ramps`: identity colors and their `E.tones` values. `bunkerRamps[location]` contains six colors from `E.ramp`. Bunker occupancy remains simulation mask data, never these sprite rows.

Draw native animations using `r.sprite(x,y,z,anim,{t})`, or select `.frame(t)` and draw through `E.px.sprite` inside an overlay. Static sprites expose `.w,.h,.runs,._src`; the engine retains these in headless mode.

## Audio

`createAudio(game)` from audio.js returns:

- `unlock()`: invoke only from a real key/pointer/touch/controller gesture. It creates/resumes engine audio buses and applies the most recently requested soundtrack. Repeated unlocks resume suspended audio without restarting music. Headless invocation safely returns false.
- `events(eventArray, world)`: call once for each simulation step before the next step clears events. Accepts `shot,kill,armour,erode,repair,pickup,loss,respawn,march,volley,saucer,boss,stage,victory,defeat,extra`. Each event is `{type,x?}`. `march` emits a bass note synchronized to the actual formation step. Erosion/volley sounds are rate limited so multi-cell impacts do not overwhelm the mix. No event changes gameplay state or triggers engine shake/freeze.
- `location(world)`: selects one of three original sparse location tunes or the flagship theme, then one-shot victory/defeat songs. It is idempotent; pass encounter/location/status changes, or call freely each frame. It stays silent until `unlock`.
- `effect(name,x)`: menu sounds `select`, `confirm`, `denied`, or the named combat effects.
- `bark('command'|'alien')`: brief formant-filtered oscillator gibberish through the native voice bus, with at least 3.5 seconds between barks. Necessary information belongs to the renderer's short alert subtitles, never speech.
- `stop()`: immediately stops authored oscillator sources, retained SFX handles, and music; resets soundtrack/event counters needed for replay. Does not destroy the engine or revoke the audio gesture.
- `diagnostics()`: unlock/readiness, active custom oscillator count, event/effect/bark/throttle totals, music selection and actual bus values.
- `renderProbe(OfflineAudioContextConstructor,{muted,bus})`: renders the exact authored glass-instrument generator at bounded gain and returns `{finite,peak,rms,samples,bus,muted}`. Music probe uses the required 0.10 gain. This establishes generated signal and muted silence, never human taste.

Music, SFX and voice use native engine buses. `createAudio` preserves settings; the app owns initial/persisted music volume and must apply 0.10 on first use and reset. No encoded samples, audio fetches or pre-gesture initialization occur here. All oscillator sources stop after finite envelopes; active custom nodes are explicitly tracked and disconnected.

## Evidence

`tests/assets.mjs` exports `checkAssets()` for the root one-command suite. It validates every authored sprite/animation/palette, distinct row silhouettes, native headless `E.Game({headless:true,draw:true})` rendering, no engine errors/warnings, and safe silent headless audio. Direct invocation prints one-line success or failures.

`evidence/asset-sheet.png` was generated from the exact native sprite row data and visually inspected: four readable comic silhouettes, distinct cannons, bonus/flagship distinction, and bright closed/open flagship core. `research/RESEARCH.md` records actual source scan, article and sampled-video inspection and unknowns.
