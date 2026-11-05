# WIRETAP: build notes (claude-haiku-5-5, medium)

Title: WIRETAP (from PLAN.md §0; RNG draw kept, not re-rolled).
Deliverables (in ../work/): `Wiretap-TheWire-claude-haiku-5-5-medium-20261103-125824.html`, `exit-interview.json`.
Dev folder (this): sources in src/, tools/build.mjs, tests/, engine/ (v0.85.1, unmodified), vendor/aihub-session.js (1.4.0, unmodified).

## Scope decision (Haiku, medium effort)
PLAN.md describes five episodes, a full CornerSim, versus, and 17 milestones. That is far beyond one pass.
Built here, in priority order:
1. Framework: scenes, KEYS preset, glyph labels (PlayStation default, Xbox option), stick inversion wrapper, touch-only notice, settings, About/Credits, attract mode.
2. World: Penn Row map (PLAN App. A), palette and time-of-day lighting.
3. Field: Dana, civilians on routines, perception ("made"), watch/read/photo, Board screen, Episode 1 (EYES ON) beats.
4. AI Hub: session.js inlined; a minimal shared-world versus, if time allows (see below).
Not built unless noted in the final report: episodes 2-5, the box, cipher, affidavit, wire room, tail, chase, raid, corner interludes, the full CornerSim.

## Files
- src/00-core.js        constants, rng, STATE, bus, helpers
- src/01-settings.js    GAME_SETTINGS, stick inversion wrapper, touch-only detection
- src/02-input.js       KEYS preset, glyph labels
- src/03-audio.js       music, sfx, voice blips
- src/30-data-world.js  ROWS (copied from PLAN App. A), legends, POIs
- src/40-*.js           scenes, world, people, perception, camera, board, ep1, attract, about
- src/credits.json      About/Credits + exit interview source (see build.mjs)
- tools/build.mjs       bundles the html, writes exit-interview.json, JSON.parse-checks it

## Status
- [ ] build tool
- [ ] framework
- [ ] world
- [ ] field + perception + photos
- [ ] Episode 1
- [ ] attract
- [ ] about / exit interview
- [ ] hub (versus)
- [ ] browser checks
