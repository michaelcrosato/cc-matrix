# Walter Whitewash (dev folder)

Source for `../Walter-Whitewash-BreakingBad-claude-sonnet-5-5-medium-20261102-183711.html`, the bundled single-file game.

- `src/00-rules.js` economy, cooking, heat, days (pure logic) · `src/10-world.js` maps, looks, every line of dialogue · `src/20-audio.js` songs, sound effects, babble voices
- `src/g1..g5-*.js` the game: input and settings, worlds and AI, the player and systems, the loop and drawing, scenes / attract mode / AI Hub session
- `vendor/engine` the my-3D2dge handoff (v0.85.1) · `vendor/hub` the AI Hub client (`session.js` 1.3.0), harness and docs
- `node build.mjs` bundles everything into the html in the parent folder
- Tests: `node test/rules.test.mjs` · `node test/game.test.mjs` · `node test/playthrough.test.mjs` (a bot plays days 1-5 and beats the boss, `SEED=n` for other dice)
  · browser (Python Playwright): `test/features.py` (attract, pad, glyphs, inverted sticks, touch-only, About), `test/hub.py` (the AI Hub harness), `test/shots.py` (screenshots), `test/browser.py`
