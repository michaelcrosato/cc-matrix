# Densha de Halo! (dev folder)

An original train-driving game in the spirit of *Densha de Go!*: drive the Halo Line, a 20.6 km loop round Akari City, stop on the
mark, keep the timetable to the second, point and call every signal. Built on my-3D2dge v0.85.2 (`engine/`) with a new pseudo-3D
rail renderer (`engine/modules/rail.js`).

## Commands

| | |
|---|---|
| `node test/run.mjs` | every headless suite in parallel workers; prints only failures and one count line |
| `node test/run.mjs physics stations` | just those suites |
| `node test/run.mjs --browser --hub --bundle` | adds the Playwright checks and the real AI Hub harness on the bundle, and checks the deliverables against TASK.md |
| `node tools/bundle.mjs` | writes the single-file game, `../DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html` |
| `node tools/calibrate.mjs` | re-times every timetable from the autopilot's par run (writes `src/23-timetable.js`) |
| `node tools/gen-index.mjs` | rewrites `index.html` (the dev page) from `src/*.js` |
| `node tools/shots.mjs [name ...]` | look-review screenshots into `shots/` |
| `node tools/exit-interview.mjs` | writes `../exit-interview.json` from the About text |

Open `index.html` from `file://` to play the dev build. Deep links: `#gallery=N`, `#stage=S2&s=5400&clock=10:17:30&auto=1&cam=chase`,
`#attract`, `#halomap`, `#results=S1`, `#duel` (`#duel=auto` for two autopilots), `#about`, `#log`, `#free`, `#ending`.

## Where the game is made (designer data)

- **Routes**: `src/20-routes.js`, sorted `[s, command, params]` scripts (zone, track, curve, grade, line, limit, signal, station,
  tunnel, bridge, viaduct, crossing, horn, workers, overpass, landmark, scenery, board, emitter, fog). The compiler
  (`src/21-route-compiler.js`, `21b-route-builders.js`) builds everything else, including seeded zone scenery, and validates the route.
- **Stages**: `src/22-stages.js`: train, time of day, weather, timetable, events (`{ type, at: { s | clock | dwell | start } }`),
  briefing, radio lines, results lines, postcards, the tutorial's steps. `src/23-timetable.js` holds the calibrated clocks.
- **Balance**: `src/01-tuning.js`; every key is a live Dev Mode slider (pause menu, Dev Mode, Balance sliders).
- **Look**: zones (ground, backdrop, scenery sets) in `src/10-art-world.js` and `21b-route-builders.js`; trains in `11-art-train.js`;
  people in `13-art-people.js`; time-of-day grades in `12-light.js`.
- **Sound**: `src/40-sound.js` (the train synth, effects, departure melodies, songs), `41-babble.js` (voices).

Every engine edit is listed in `ENGINE-CHANGES.md`.
