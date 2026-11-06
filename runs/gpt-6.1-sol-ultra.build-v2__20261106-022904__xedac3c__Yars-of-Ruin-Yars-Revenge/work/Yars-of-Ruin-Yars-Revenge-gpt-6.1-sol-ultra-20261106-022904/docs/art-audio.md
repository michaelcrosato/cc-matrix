# Art and audio

All finished game imagery and sound are original mathematical assets written for this project. No images, audio files, recorded voices, browser speech synthesis, downloaded fonts or external art assets are required. The bundled my-3D2dge renderer supplies pixel primitives, actor sorting, chitin/material tone ramps, native shadows and lighting. The SHOOTER kit's overhead x/y convention underlies the fixed arena. No engine file was changed for this presentation layer.

The scout body is an articulated insect: four independently beating, veined wings; three pairs of articulated legs; four abdomen segments; a luminous thorax; antennae; paired compound eyes; and reactive mandibles. Player two has an amber palette, diamond thorax marking and pale abdomen band in addition to the first scout's mint palette. Wing silhouettes exceed the 9-unit collision body. A ready scout lights its thorax, its remote rail gun and a position-dependent guide. Contact bites open the mandibles and pull small fragments inward. Swarm silhouettes return in the ending.

Each defense station has radial cable bundles, beveled armor sockets, a layered docking altar and an iris heart. Each phase removes station anatomy. During a Swirl, the actual heart folds its petals into rotating hooks, moves out of the dock, and leaves a visible empty socket. Warning tracers and a targeting ray announce the flight; a moving trail reinforces its committed direction. Shield cells have chitin-like beveled faces; reflective material uses pale lavender metal and diagonal mirror cuts. The static strip has paired solid edge rails with moving counterflow specks. Color and pulse warnings announce outages. Background ruins, signal paths, distant wings and stars remain dark relative to gameplay bodies.

Three palettes and musical treatments develop the same grammar: cold teal and old bronze in sector one; violet machinery, pink armor and silver mirrors in sector two; green-black ruins, pale cellular shell and a rose heart in sector three. All art uses native pixel drawing, not smoothed Canvas vector paths. Animation uses continuous velocity, game time and simulation state. Cosmetic hashing and event particles never consume combat RNG.

## Interfaces

`RuinRender.create(game)` returns `draw(renderer, world, options)`, `event(confirmedEvent, world)`, `dispose()` and `debug()`. Options include `debug`, `reducedFlash` and `reducedShake`. Pass every simulation event once; stable event IDs also deduplicate redundant calls. Effect cleanup and diagnostics do not write to simulation state. The debug overlay draws actual scout and cannon collision radii.

`RuinAudio.create(game)` returns `unlock()`, `update(dt, world, {paused, silent})`, `event(confirmedEvent, world)`, `suspend()`, `dispose()` and `debug()`. Call unlock after a real gesture. Browser autoplay restrictions may keep an attract run silent. All three music, effects and voice gates connect to the corresponding engine audio bus, so the native saved master/bus/mute settings apply. Pausing or ending a session silences the gates; disposal stops and disconnects every owned source. The main game's first-run music setting is 0.10; the synth does not overwrite returning settings.

Music is an original restrained 16-step minor motif over electrical bass and a noise pulse. The three sectors change root, speed and percussion. Readiness and active Swirl states add musical layers. Bites, chip impacts, charge, lane lock, cannon launch, reflected return, transformation, flight, core collapse, death, reassembly and resolution have separate synthesized signatures. Important callouts use five brief pitch/formant syllables of gibberish, each generated from oscillators and bandpass filters. No intelligible spoken language is synthesized.

`await RuinAudio.offlineProof()` renders a two-second phrase of impact noise, oscillator effects, motif and both voice timbres using OfflineAudioContext. It returns sample count, finiteness, peak, RMS and final-window RMS; no playback or microphone is needed. Physical speakers/listening and real display hardware remain unavailable in the workstation.

## Verification during development

A native drawn-headless fixture advanced 240 fixed steps with shield faces, reflective material, biting/ready scout, warning lane, cannon projectile, pursuer, dock/windup/flight heart states and an emitted core explosion. The engine reported zero drawing errors. Final artifact browser/audio results belong to the project's test evidence.
