# Eye of the Bolt-Holder: the dev folder

A real-time, first-person party dungeon crawl built on the my-3D2dge engine (v0.85.2). The game ships as one HTML file
in the work folder (`../EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-haiku-5-5-medium-20261103-202616.html`).

## Build and test

- `node tools/build.mjs`: bundles `hub/session.js` (byte for byte), `engine/my-3d2dge.js`, `engine/my-3d2dge-3d.js` and
  `src/*.js` (in name order) into the root HTML.
- `node tests/run.mjs`: the one command. It prints failures and one count line. Suites: `lint` (maps, ids, wall faces,
  stairs, wires), `sim` (determinism, save round-trip, the rules), `bot` (the walkthrough bot clears floor 1 and reaches
  floor 2), `browser` (the bundle opens from file:// with no errors). `--fast` skips the bot and browser suites.
- `tests/browser-play.mjs`: New Game, Quick Start, the intro, then play, with a screenshot in `shots/`.

## Layout

- `src/00-core.js` namespace, dice, streams, the tuning table, the state hash.
- `src/10-data.js` items, monsters, spells, races, classes. `src/15-floors.js` the four floors and the Rat Run.
- `src/20`–`src/28` the sim (pure: no world, DOM, audio or `Math.random`). `src/29-bot.js` the walkthrough bot.
- `src/30-text.js` note texts. `src/40-view.js` the presenter (one World3D per floor). `src/41-ui.js` HUD and screens.
  `src/42-scenes.js` scenes, input map, Dev Mode. `src/43-story.js` NPC scripts, barks, deeds, About. `src/44-audio.js`
  sounds and songs. `src/90-main.js` the game and the boot.
- `engine/` the two engine files, unmodified. `hub/` the AI Hub session client and harness files (only `session.js` is used).
- `_ref/` a sparse clone of the engine repository, for reading (not shipped).

## Known gaps

- Under normal balance the walkthrough bot does not clear floor 3 (the wardens and the party's levels win). Floors 3 and 4
  were checked for their mechanics under god mode (`tests/floor-probe.mjs`, `tests/boss-probe.mjs`), and the Veil-refused
  branch too (`tests/veil-probe.mjs`).
- The solo Rat Run best-run ghost is built (a trail kept in local storage). The AI Hub ghost race passes the hub harness.
- Babble voices are a code synth that has not been checked by ear.
- Pad prompts are drawn shapes (PlayStation ○ ✕ □ △, or Xbox letters by setting) on the HUD; the screen footers still use text.
- Monsters are cards or simple blobs, not the full pen art. The Debug tab's overlays are text lines.
