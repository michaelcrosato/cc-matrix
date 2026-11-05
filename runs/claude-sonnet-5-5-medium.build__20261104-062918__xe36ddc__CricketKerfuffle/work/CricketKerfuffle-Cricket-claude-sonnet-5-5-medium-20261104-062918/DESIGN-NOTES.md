# Cricket Kerfuffle: design notes

Everything is data plus a pure simulation; presentation reads the simulation and listens on the event bus.

- `src/00-core.js` constants (pitch at x = 448, striker's stumps y = 330, bowler's y = 650), the seeded RNG streams, the TUNING registry (`TUNING_DEF`, read with `T('name')`), the event bus (`on`, `emit`).
- `src/10-data.js` content: `TEAMS`, `GROUNDS`, `DIFFS`, `DELIVERIES`, `FIELD_PRESETS`, `CHAPTERS` (the story), `LINES` (commentary).
- `src/20-ball.js` ball physics, the predictor (`predictUntil`), the delivery solver and the shot resolver.
- `src/21-match.js` `createMatch(cfg)`: laws, scoring, running, fielding, AI intents, hype, chaos. `M.step(dt, { bat, bowl })` takes the same intents a person gives (null means the AI plays that role).
- `src/30-art.js`..`41-ui.js` art, audio (chip synth, formant voices), HUD and menus. `50`..`75` scenes, dev mode and the AI Hub round.

How to add:
- A team: add to `TEAMS` (cloth, trim, hat, skin colours). An opponent in the setup list: add its id to `OPPS` in `60-scenes.js`.
- A ground: add to `GROUNDS` (sky, grass colours, night, bounce, music) and to `GROUND_IDS`.
- A story chapter: append to `CHAPTERS` (intro/win/lose lines are `[speaker, text]`; speakers live in `SPEAKERS`).
- A delivery: add to `DELIVERIES` (pace `sp`, `swing`, `turn`, `bounce`) and bind it in `bowlIntent`.
- A stadium target: add to `TARGETS` in `21-match.js` (angle round the boundary, radius, bonus runs) and draw it in `drawSet`.
- A commentary line: add to `LINES[kind]`. A balance variable: add to `TUNING_DEF`; it appears in dev mode by itself.

Test: `node tools/build.mjs && node test/run.mjs` prints only failures and a count.
