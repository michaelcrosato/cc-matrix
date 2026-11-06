# Native art and audio contract

Load `src/view/art.js` and `src/audio/audio.js` after the full native engine and simulation. Both attach classes to `globalThis.BU`.

## Art

`new BU.Art(game)` registers original `BU:` native asset shapes/materials and three fully dressed crew Humanoid rigs. `art.update(dt, state, viewState)` advances only cosmetic state, consumes accepted simulation event IDs for interrupted-safe native tween responses, and establishes stable camera framing. `art.draw(r,state,viewState)` draws with `E.px`, `r.box`, native asset definitions and native rigs; no gameplay mutation, second renderer, image files, or external resources.

`viewState = {screen, boardId, focusTarget, tool, attract, success, reducedMotion, inspecting}`. Workspace is selected whenever boardId exists and screen is `work`, `board`, `play`, `workspace`, or `repair`. Other screens receive a themed 2.5D city diorama. Theme comes from state.caseId; title rotates among the three themes. Default workspace width is the left 74% of landscape; top 13% and bottom 12% remain readable HUD space. Tall screens center the workspace and reduce visual dressing. Camera: original native orthographic View, x/y world plane, z up, almost overhead for the board. `art.frame(state,v)` exposes current layout.

`art.targets(state,v)` returns screen-buffer pixel targets (not CSS pixels), available before drawing. Each has `id,kind,x,y,wx,wy,wz,radius,label` and semantic fields:
- `C1:0`, `C1:1`: `kind:'terminal', componentId:'C1', component:'C1',terminal:0|1`.
- `C1:body`: `kind:'component',componentId:'C1',component:'C1'`.
- `spare:S1`: `kind:'spare',spare:'S1'`.
- `test`: `kind:'test'`.
- `fire`: `kind:'fire'`, only during an active fire.

`focusTarget` can be a target object or ID. Tool string is `cut`, `grip`, `solder`, `extinguish` (numeric 0–3 also accepted). Renderer preserves shape/pattern/label differences without relying on color. Components, terminal cut/solder states, current order, held spare, fire, recovery, and hold safe band are depicted from authoritative state. `art.portrait(r,who,x,y,size)` draws a native crew portrait in an overlay; who is `partner`, `saboteur`, or `crew`.

## Audio

`new BU.Audio(game)` builds on `game.audio` native synth, instrument registration, music composition and native buses. It explicitly sets real music default to 0.1. Methods:
- `unlock()` called on genuine user activation; returns promise; creates/resumes native Web Audio context.
- `set({music,effects,voice,volume,muted})` applies independent finite levels, live, to native buses.
- `effect(name)` (`cut`,`grip`,`pick`,`place`,`solder`,`test-pass`,`test-fail`,`foam`,`recovery`,`fire`,`evidence`,`disarm`,`failure`,`radio`,`tick`,`sirens`).
- `voice(who,text,priority=1,id?)` emits distinct deterministic code-generated gibberish envelopes through native voice bus. Urgent priority preempts lower-priority taunts; event IDs deduplicate.
- `music(theme='investigation',urgent=false)` original restrained electronic score; urgent layer activates as fuse falls.
- `update(dt,state)` controls fuse pulse and urgency; `suspend(on=true)` stops custom sources and ducks/stops native music while paused/ended; `dispose()` stops owned sources only.
- `snapshot()` exposes actual bus values, pending voice count, initialized context state and last cue, for verification.
- `static renderProbe(context)` synthesizes representative effects/voice/music into a supplied OfflineAudioContext for finite/nonzero/peak checks without playing anything.

There are no audio files. Listening quality remains unverified on this headless workstation.

## Verification observations

The exported HTML passed 22 native presentation and audio browser assertions in Chromium 153.0 / Playwright 1.63.0 at 1920×1080. Native headless rendering passed 28 checks across all four case themes, projected target bounds, renderer/simulation separation, native asset registration, both-terminal reachability, fire/foam rendering and bus defaults. Representative screenshots in `evidence/final-native-*.png` were visually inspected. Offline code synthesis measured RMS 0.011736 and peak 0.100986 with all samples finite. Real native GainNode values are tested with floating-point tolerance (the actual stored 0.1 float is 0.10000000149). No physical listening check was possible.
