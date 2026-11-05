# Ahead or Alive: Xtreme Beach Volleyball (dev notes)
- `node tools/build.mjs` concatenates `src/*.js` (name order, one IIFE) and writes the single html one folder up. `feedback.json` is embedded as `G.FEEDBACK` for the About screen.
- `node test/run.mjs` is THE test command (prints failures and a one-line count). `node test/run.mjs ui` runs one suite by prefix.
- `node tools/hubcheck.mjs 2` runs the AI Hub harness against the built game (serves on a random 127.0.0.1 port). `node tools/shots.mjs out name=js ...` screenshots scenes. `node tools/exit.mjs` writes `../exit-interview.json`.
- Layout: `00-core` namespace/rng/bus/tuning; `02-data` cast, items, text; `10-ui` input presets, glyph prompts, menus; `12-audio` songs, sfx, Animalese; `13-rigs`; `20-sim` volleyball rules, ball, AI; `24-match` match scene; `25-netplay` hub; `30-` vacation state; `31-` map; `32-` places; `33-` shops, wardrobe, journal, album; `34-` story; `40-` Pool Hop; `41-` casino; `42-` photo; `50-` title, menu, about, Beach Match; `51-` attract; `53-` dev panel; `99-main`.
- Gameplay never calls Math.random; use `G.rng(stream)`. Engine changes are listed in `ENGINE-CHANGES.md` (marked `AOA:` in the engine).
