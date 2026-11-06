# Native presentation and audio contract

Implemented by presentation subtask. Sources: `src/presentation.js`, `src/audio.js`.

- `new FWR.Presentation(E, game)`; `draw(r, world, options)` or `render(world, dt, {r})`.
- Options: `dt`, `reducedMotion`, `collision`, `ownership`, `navigatorPreview`. Configuration also reads `options.settings.reducedMotion` and game.reduceMotion.
- World camera x/y are **center** coordinates. Native buffer scaling is `min(r.W/1200, r.H/675)`, with vertical decorative space on portrait screens. Explicit projection cancels the renderer's camera; main must not duplicate camera offsets. `screenToWorld(bufferX,bufferY)` and `worldToScreen(worldX,worldY)` are public.
- Native engine `r.actor` supplies outlines, tint, sorting and rim lighting. The original warm rescue craft, radial layer, defensive guard and interceptor extend the native horizontal shooter kit's part-frame and E.tones conventions. Bank, nozzles, recoil, independent cannon aim, warp stretch/trails, pulsing organs, mine states, crystal cracks, boarding trail and carrier breakup respond continuously to authoritative state. Custom registered native shape props dress the belt.
- Native `r.sky`, alpha polygons, palette clusters, stars, orbital structures and faceted props provide parallax. Decorative objects do not create gameplay collision.
- Events are deduplicated by run ID and monotonic event ID; time reversal clears presentation caches. No world randomness is consumed and presentation never advances mission state.

Audio:

- `new FWR.Audio(E, game)`; call `init()` only on genuine input gesture. It returns a promise of whether the native audio context is running.
- `applySettings({master,music,effects,voice})`, `update(world,dt)`, `ui('focus'|'activate')`, `pause(bool)`, `stop()`, `metrics()`.
- Music starts at explicit 0.10. Master/effect/voice gains have independent buses. The existing engine's score clock, notes, layers, native synth envelopes and instruments are the base. New pluck, pad and bell instruments run through the native buses.
- All effects and nonlexical radio syllables are code-defined. No audio files, TTS, samples or soundfonts. Radio has priority and cooldown control. Pause/end clear scheduled voices and effects and stop music.
- `FWR.Audio.renderFixture(OfflineAudioContext)` renders a two-second representative non-silent phrase for tests; `metrics()` reads live native-bus levels.

Verification:

- `node tools/presentation-check.mjs`: 32 native headless draw/default-gain/animation-clock/event-routing checks, all passed.
- Actual Chromium file URL preview at 1920×1080: no page or engine errors. Source preview in artifacts/presentation-preview.html. Reviewed belt and carrier captures. Initial visual test caught overexposed nebula bands from overlapping thick additive pixel lines. Fixed by alpha polygons and confirmed corrected belt screenshot. One unique noncritical visual issue.
- Actual Chromium OfflineAudioContext fixture + live native AnalyserNode: six checks passed. `artifacts/audio-evidence.json` contains finite RMS/peak values, gain, pause/resume/stop evidence. This was invoked directly in a Python Playwright snippet; main's unified verification should include these same observable checks.

Engine feedback relevant to this module: native pixel part-frame art plus automatic actor outlines and E.tones made consistent source-specific ships straightforward. Wide additive `px.line` repeatedly blends pixels along its span, so atmospheric ribbons should use filled alpha polygons. Native audio music/instrument/bus APIs support an entirely code-defined score without downloaded assets. Custom craft art and Animalese formant synthesis were the most important additions.

## Integrated review

Final exported root HTML identity FWR-20261106-023037 was opened from file:// in real headless Chromium. Inspected title, contact rescue, committed warp, belt, carrier, pause, and portrait/landscape phone layouts at 1920×1080, 390×844 and 844×390. No page or engine errors. Review captures use artifacts/final-visual-*.png. Title's enlarged rescue craft sits at 69% width/59% height, with menus left and carrier right. Title presentation is render-only.

Integrated issues corrected:
- Renderer caller supplied dt=0, freezing banking/recoil/effect lifetimes. Renderer now derives elapsed time from authoritative world time when dt is absent or zero; regression checks cover bank and expiry.
- Broad event matching made hostile fire recoil the player's cannon; exact player-cannon event matching fixes it.
- Broad warp matching selected committed-warp audio for warpDenied; denial now routes first, with a regression assertion.
- Sector is part of both render and sound reset keys, so effects/voices do not leak between sectors.

Review identified narrow fixed-resolution clipping and phone score/pause overlap. Main integrator owns viewport, pointer mapping and HUD CSS fixes. The responsive portrait resolution fix was subsequently confirmed: 390 native buffer pixels at 390 CSS width and OX=0, with the entire ship visible.
