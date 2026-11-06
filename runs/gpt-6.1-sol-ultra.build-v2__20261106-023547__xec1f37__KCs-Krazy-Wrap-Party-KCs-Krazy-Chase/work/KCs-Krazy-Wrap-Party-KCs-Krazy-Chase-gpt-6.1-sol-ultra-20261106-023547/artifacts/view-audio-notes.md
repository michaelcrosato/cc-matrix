# Native view and procedural audio

Implemented `src/view.js` and `src/audio.js` against pristine my-3D2dge 0.89.1. No engine source changes.

- Fixed overhead native camera, 16 world units/cell, integer full-maze fitting in landscape and portrait. Native `r.actor`, `r.shadow`, lights, E.Blob continuous rigs, E.tones and E.px primitives. No images or canvas antialiasing primitives.
- Original blue/coral leaf-crowned keepers, dangerous horned and toothy purple head, soft leaf-green train, golden fruit tail with diamond/ring, cat sentry and winged sentry, optional tiny trees, animated snack sprout, paired marked wraps, bordered garden beds, flowers, potted foliage and spectators. Campaign palettes supported directly from level data.
- Native continuous rig squash, feet and gaze; bite kick, segment recoil wave, body brush squash, hungry head warning, chew crumbs, frightened trembling, sentry spin stars, invulnerability rings/respawn fade, event sparks. Reduced motion suppresses prominent pulse/tremor motion.
- Original 64-step musical motif with five arrangements plus title, fright layer, clear/defeat/victory stings. Code-only effects and oscillator/formant nonsense syllables on native music/sfx/voice buses. Fresh music 0.1, effects 0.55, voices 0.4. Unlock and scene calls idempotent; pause mutes all buses; end stops music and voice nodes.

Verification:
- `node tests/view-audio-tests.cjs`: 12 passed, 0 failed. Native draw-enabled headless engine renders each garden at landscape/portrait with overlays and effects; complete maze bounds, pointer mapping and renderer purity verified. Sound defaults, lifecycle, five arrangements verified.
- `/home/micha/.local/share/pipx/venvs/playwright/bin/python tests/view-audio-browser.py`: 8 passed, 0 failed. OfflineAudioContext produced finite nonzero bounded samples, native bus levels verified, duplicate-loop prevention/voice generation/pause/end checked. Evidence `artifacts/audio-check.json`.
- Chromium screenshot inspected at `artifacts/view-preview.png` for hero/head separation, maze/wrap/ground boundaries, native shading, frightened silhouettes and TV readability. This preview uses a synthetic world only; final artifact is tested by the main builder.

Issues found during implementation and assembled-artifact checks (3 noncritical): sentry ID contract initially selected winged appearance for both sentries (fixed IDs 1/2); repeated audio unlock originally restarted current song (made idempotent); native menu/fullscreen corner controls covered portrait score (moved score into safe center). A preview-only missing canvas CSS dimension was corrected before inspection; it was not a production game issue.

Limitations: no human listened to the music or voices; subjective sound quality is unknown. Physical device quality is unknown. Audio tests establish signal/lifecycle correctness, not aesthetic quality.

Final assembled artifact checks: `tests/view-audio-browser.py` now loads root slug.html and checks its real `window.__garden.game/audio` instance; 8/8 passed. Final TV title, phone title/finale and all five garden compositions captured in `artifacts/final-*`, inspected for legibility. `artifacts/visual-check.json` records zero native errors. Debug restore only staged art scenes.
