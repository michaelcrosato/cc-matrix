# SKILLER7 — Seven Killers, One Mountain (dev folder)

An original on-rails action shooter inspired by Killer7, built on my-3D2dge v0.85.2 and its 3D module. The shipped game is
the single file `../Skiller7-Killer7-claude-opus-5-5-xhigh-20261104-013140.html` (three.js r182 and Rapier 0.19.3 load from
jsDelivr; everything else is inline).

## Commands

```sh
node tools/fetch-deps.mjs     # once: the pinned engine handoff, 3D module, vendored three/Rapier, AI Hub client
node tools/patch-engine.mjs   # once: applies the // S7 PATCH: changes to engine/my-3d2dge.js
node tools/build.mjs          # bundle src/ + content/ and write the single HTML (fails on TODO/placeholder text or bad content)
node tests/run.mjs            # every test; prints only failures and one count line (--node, --browser, --only a,b)
node tests/run.mjs --node --only playthrough --verbose --metrics   # the bot plays the whole demo, with its progress
```

## Layout

- `src/` the engine-facing code: `00-core` (bus, registries, seeded rng), `02-tuning` (dev sliders), `05-input` (preset,
  intents, idle timer, touch-only), `10-level` (rows from rectangles, line of sight, flow fields), `11-rails`,
  `12-camera` (generated hard-cut shots), `20-sim` … `60-save` (the deterministic sim: walker, combat, Whiteouts, bosses,
  set pieces, gates, Room 7, story beats, saves), `70-audio`/`71-voice` (songs, SFX, laughter, Animalese voices),
  `80-ui-kit`/`81-hud`/`82-screens`/`84-dev` (canvas UI, HUD, screens, Dev Mode, `game.debug`), `85-bot`, `86-attract`,
  `87-hub`/`88-echorun` (AI Hub ghost mode), `90-present3d`/`92-firstperson` (the 3D presenter), `95-scenes`, `99-start`.
- `content/` data a designer edits: `areas/*.js` (rails, gates, spots, waves, triggers, props, people), `story/*.js`
  (talks and beats), `personas.js`, `enemies.js`, `items.js`, `shapes.js` (S7's asset set), `things3d.js`, `songs.js`,
  `voices.js`, `about.js`.
- `tools/validate-content.mjs` checks every area (rails, cameras' coverage, spots, waves, triggers, talks) and runs in
  the build. Adding an area, a persona or an enemy never changes code in `src/`.
- `tests/` `node/` (in-process with `tests/lib/node-harness.mjs`), `browser/` (headless Chromium on the built file, the
  CDN routed to `vendor/`; `hub.test.mjs` runs the AI Hub harness on a local server), `routes/golden.js` (the bot's route).

## Engine changes

All marked `// S7 PATCH:` in `engine/my-3d2dge.js` (see `tools/patch-engine.mjs`): font glyphs (umlauts, accents, dashes,
✕ ○ □ △), PlayStation as the default button symbols, Options ignored while Create is held in an AI Hub session, seven
Humanoid hats, head and body accessories, slit eyes, a face-hiding visor, seven weapons, skis, and one doc comment reworded.
The 3D module is unchanged.
