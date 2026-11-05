# Engine changes (my-3D2dge v0.85.2 handoff)
1. modules/rail.js (new): a pseudo-3D railway renderer forked from road.js: several diverging tracks, raised platforms, strips (extrusions along the line) for trains, buildings, walls and tunnels, a rear-facing camera, square pixels on wide screens.
2. Dialog: talk.voice may be a function (ch, index, text, talk) called for each revealed letter, so the Babble voices speak syllables.
3. Shell settings screen: ui.show('settings', { groups: ['Dev'] }) shows only those groups with a Reset to defaults button; the standard Settings screen hides the Dev group. Live, controller-navigable balance sliders for Dev Mode.
4. Glyphs: the Button symbols setting defaults to PlayStation (TASK: PlayStation glyphs unless the player picks Xbox); the 5x7 font gains the glyphs ✕ ○ □ △ so input.label() text draws on canvas.
5. ChipAudio: audio.bus('sfx' | 'music' | 'master') and audio.noiseBuffer(), so the continuous train sound and the Babble voices go through the player's volume, mute and duck.
6. Humanoid poses 'bow', 'point' and 'flag' (staff, workers, the finale).
7. Hub rule: while AIHub.active and Create (Pad8) is held, Options does not pause (the hub's corner bar).
