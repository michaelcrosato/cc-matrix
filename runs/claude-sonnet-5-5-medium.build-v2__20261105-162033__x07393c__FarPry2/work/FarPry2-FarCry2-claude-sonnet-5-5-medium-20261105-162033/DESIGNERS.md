# Designers' notes: adding things to Far Pry 2 without touching engine code

Everything the game is made of lives as plain data. Run `node tests/run.mjs` after any change: the `static` suite checks models, sounds, songs, strings (only the HUD font's characters) and that every mission reference resolves.

| To add | Edit | Notes |
| --- | --- | --- |
| A weapon | `src/content/weapons.js` (a row), `src/art/guns.js` (a first-person model with pivots `Weapon`, `Mag`, `Bolt`, `HandL`, `HandR`, `rust1`, `rust2`, `tape`), `src/audio/sfx.js` (`shot_<id>`) | Wear, jams, ADS and the Tibor rack stats read the row. Set `price` to put it on the rack. |
| A site | `src/content/sites.js` (a row: id, at, r, kind, faction, guards) and `src/content/layouts.js` (placements relative to its centre) | `cover: true` rows become cover points; `tag:` rows become destructibles; `use:` rows become prompts (`src/content/interactions.js`). |
| A road, the river, the railway | `src/content/roads.js` | Polylines are painted red, flattened and drawn on the held map. |
| A mission | `src/content/missions.js` | Steps: `scene goto leave use report destroy kill steal deliver hold timer choice wait burn ignite script`. `alt` is a buddy's better plan. The runner pays, saves and chains. |
| A line of dialogue | `src/content/dialogue.js` (`SEQ[id]` is `[speaker, text]` rows; `BARKS`; `NPCS`) | Subtitles wrap over two lines; keep to the HUD font. |
| A model | `src/art/people.js`, `world-models.js`, `vehicles.js` | `node check.mjs --sheets src/art/world-models.js` draws sheets in `check/sheets/`. Register it by exporting it in the list at the bottom of the file. |
| A balance number | `src/content/tuning-defaults.js` (value and slider range) | Systems read `TUNING.x` at the moment of use; dev mode's Balance tabs move it live. |
| A song or sound | `src/audio/music.js`, `src/audio/sfx.js` | The `static` suite renders every sound and parses every song. |
| An interaction | `src/content/interactions.js` | `verb`, `when`, `hold` and `run`. |

Dev mode (pause menu): teleports to every site, spawns squads and vehicles, jumps to any mission, sets the hour and wind, shows crosshair coordinates (use them to place things in `layouts.js`).
