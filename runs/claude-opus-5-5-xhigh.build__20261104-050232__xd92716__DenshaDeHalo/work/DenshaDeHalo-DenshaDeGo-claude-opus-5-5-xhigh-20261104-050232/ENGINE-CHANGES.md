# Engine changes (my-3D2dge v0.85.2 handoff copy)

Each edit to `engine/my-3d2dge.js` (and the new module), with why.

1. **New module `engine/modules/rail.js`** (`E.Rail`): a pseudo-3D railway renderer forked from `modules/road.js`. road.js has one road,
   squashes the world on wide screens (it projects y with half the height), and has no multiple tracks, raised platforms, long side objects
   (trains, buildings), under faces (canopies, tunnels) or rear-facing cameras. rail.js adds all of these with square-pixel projection.
2. **Dialog voice hook** (`Dialog.update`): `talk.voice` may be a function `(ch, index, text, talk)`, called for each revealed character, so
   gibberish voices (Babble) speak syllables as the text types. Before, `voice` was only an sfx name blipped every second letter.
3. **Settings screen filter** (`Shell._settingsRows`, `_render`): `ui.show('settings', { groups: ['Dev'], title })` shows only those groups,
   with a "Reset to defaults" button; the standard Settings screen hides the `Dev` group. Dev Mode's live balance sliders come free this way,
   navigable by controller, keyboard and mouse.
4. **Glyphs**: the standard `glyphs` setting defaults to `'playstation'` (TASK.md: PlayStation glyphs unless the player picks Xbox), and the
   5x7 font gains `✕ ○ □ △` (and `◂ ·` for menus), so any `input.label()` text renders on canvas.
5. **ChipAudio accessors**: `audio.bus('sfx' | 'music' | 'master')` and `audio.noiseBuffer()`, so the game's continuous train synth and the
   Babble voices route through the player's volume, mute and ducking.
6. **Humanoid poses** `'bow'` (about 40 degrees, hands at the thighs, head down), `'point'` (right arm straight out) and `'flag'` (right arm
   raised), blended like the others in `poseW` and the solver: platform staff, track workers and the finale need them.
7. **Hub button rule** (`Input.tick`): while `AIHub.active` and Create (Pad8) is held, Options (Pad9) is not pressed, so the hub's corner bar
   (Create + Options) never pauses the game (hub README, Rules).
8. **Build stamp** (`E.build`): `'densha-de-halo 2026-11-04'` instead of the repo's unstamped `'dev-build'`, so the title screen's version
   line and the engine's reports name this copy.
