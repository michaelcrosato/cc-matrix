# Input and audio

The input adapter uses the engine's Input, saved bindings, pad seat claiming and label renderer. Canonical input is serializable: mx, my, jump, jumpHeld, chop, redirect, interact, interactHeld, aim. Up is my=-1; high redirect is aim=-1. The native actor receives those same values for human, replay and remote sources. Native PLATFORMER coyote time and jump buffering belong to the simulation.

## Integration

Construct Input(game, callbacks). Set input.menu for the current overlay; set input.enabled=false when input must stop. Call input.update(dt) after the engine input tick, then input.intent(1) for the local canonical stream. Native joined seats use intent(2). In Hub set input.localId to the assigned seat before setContext(sim); the local physical input remains intent(1). The optional settings object supplies glyphs and deadzone. clear() consumes held actions, edge history, mouse world interaction and all touch ownership. dispose() removes the adapter's listeners. Native engine listeners are removed by game.dispose().

Callbacks:
- onActivity({device,type,event,index,code}) may return true to consume the wake gesture. This clears state and applies a short wake guard.
- onMenu({action,player}) receives up/down/left/right/accept/back. Enter and standard pad Cross accept; Options also accepts a menu.
- onPause({reason,player}) handles normal pause or a controller disconnect.
- onWorldInteract({kind,id,label}) may consume a highlighted world target by returning true; otherwise native Interact is tapped.

The root owns local join policy with game.allowJoin({max:2,keys:false,...}); native claiming prevents an added pad from controlling player one. A keyboard player and one pad work: Options on the free pad joins player two. After a player has already chosen the pad as seat one, that pad stays seat one's. Keyboard sharing is not advertised.

The custom preset uses the requested keyboard actions, native arrow/WASD movement, Square chopping, R2 redirect, Triangle interaction, Cross jump and Circle back. On a ladder, my belongs to ascent/descent; elsewhere the simulation uses down for duck. Native input.rebind, bindings and label remain available to the root Settings/Controls pages. PlayStation is the default glyph family; Xbox is selectable.

Touch capture owns pointer IDs independently. The left half is an invisible thumb stick; right taps jump, with jumpHeld preserved while a right finger remains down. Nearby ore is assisted chopping, spending real tool contacts through the simulation. The contextual bubble prioritizes rescue, faced in-range door, then redirect. Holding the bubble keeps its selected target stable. A bubble touch cannot also jump. Moving the left finger while touching the bubble or jump area remains valid. Touch assist never changes health, score, resource rules or progression.

## Coded audio

Construct Audio(settings, game) to extend the native engine buses. Audio.unlock() runs after a gesture and tolerates browser suspension. No audio loading or network request occurs. If no game is supplied, the wrapper creates equivalent Web Audio buses, which also supports isolated testing.

Settings accept music/sfx/voice or musicVolume/sfxVolume/voiceVolume. Values are 0–1; 0–100 values above one are also accepted. Music defaults to exactly .1 in application data (the browser GainNode may represent it as Float32). SFX defaults to .8 and voice .65. Mute gates the native master; voice can be disabled independently.

The original melody uses three 16-note chamber variations, alternate octave phrases, bass roots, plucked triangle and bell tones, synthesized percussion and a finale layer. Spawn pressure changes tempo/percussion; calm entries use the sparse phrase. Success and failure have separate stings. Event effects distinguish rolling, bouncing and heavy rocks; footsteps, climbing, windup, contact, ricochet, collisions, wear, break, falling picks, rising keys, expiry, damage, rescue, warnings, mechanisms and menus are coded. Brief filtered sawtooth syllables are original gibberish with caption text.

Call audio.update(dt,sim) to schedule a bounded lookahead and consume stable event IDs. It understands the simulation's actual event names and retains bounded deduplication. pause(true) ducks music and stops pending notes; pause(false) resumes without backlog. reset() stops old notes and clears event identity/caption/phrase state for a new run or attract transition. dispose() silences native output, stops nodes and rejects further event/scheduling calls. No interval or timeout is owned by this module. Audio state never affects simulation randomness or outcomes.

## Isolated evidence

Run:

    /home/micha/.local/share/pipx/venvs/playwright/bin/python tests/audio-browser.py

The standalone test opens one Chromium browser and uses file:// fixtures. Its 34 checks cover:
- OfflineAudioContext nonzero music/SFX/voice samples and peak below clipping.
- Complete mute, isolated voice mute, music unaffected by voice mute.
- Native bus usage, 10% music default, deduplicated voice events, pause ducking, zero output/nodes and no scheduling after dispose.
- Native action edges, hold/release distinction, native rebinding and prompt changes, PlayStation/Xbox glyphs, menu routing.
- Actual native allowJoin invoked by game.advance: keyboard plus one pad adds player two and preserves independent controls.
- Two injected standard pads with independent movement and chopping.
- Actual Playwright touch tap, Chrome touch events with simultaneous move/jump, pointer release, rescue-door-redirect contextual priority.

The first test run exposed two test-oracle mistakes: a voice-silence measurement window overlapped the previous key sound's tail; strict equality was unsuitable for a native Float32 gain. Both measurements were corrected. A native actor-state test caught a footstep condition using grounded instead of the engine's onGround; it was corrected and verified. Inspection additionally prevented duplicate victory stings from the simultaneous event/completed signal, and prevented a world door click from also chopping.

Physical DualSense feel, real iOS Safari behavior, television distance comfort and subjective listening quality remain unconfirmed. Browser stand-ins do not establish them.
