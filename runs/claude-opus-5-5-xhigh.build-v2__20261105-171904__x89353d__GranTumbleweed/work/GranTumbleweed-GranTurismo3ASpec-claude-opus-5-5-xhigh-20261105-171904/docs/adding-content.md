# Adding content to Gran Tumbleweed

All content is data in `src/game/data/`. `node tools/test.mjs data` checks that every id resolves, every event has a car that can enter it, every test has medals, and all text fits a 60-character line and a 4-line card. Models go through `cd src && node check.mjs --sheets game/models/sheets.js`, which draws them into `src/check/sheets`.

## A car
1. Physics row in `data/carphysics.js`: mass, power, rpm, gears, tyres, aero.
2. Catalogue row in `data/cars.js` (`CAR_INFO`): name, marque, year, price, `where` (`used`, `dealer`, `prize`), sound (`cyl`, `filter`, `exhaust`), Mr. Fenn's line, four lines of brochure. Add it to a showroom in `SHOWROOMS`.
3. Model in `models/cars.js` (`CAR_MODELS`): `carDef({ id, about, length, width, body, cabin, roof, lamps, extra })`. Make the tail distinct: it is the view you stare at.

## A track
1. `data/tracks.js`: a closed list of corners, `[x, z, radius, y, width, bankDeg]`, with `surface`, `edge`, `runoff`, `hour`, and optionally `pit` and `crests`.
2. A colour theme in `render/trackmesh.js` (`THEMES`).
3. A dressing function in `render/dressing.js` (`DRESS`): grandstands, landmarks, things that move.

## A licence test
`data/licences.js`: `{ title, lesson, carId, track, start, startSpeed, kind, end or box or cones, assists, brief, tip }`. `kind` is `section`, `stop`, `cones` or `lap`; `legs` drives it in several cars. Then run `node tools/medals.mjs`: it runs the AI demonstration at 97% pace and freezes the medal times in `data/medals.js`.

## An event
`data/events.js`: `{ name, needs, limit, restriction, pace, pool, prize, bonus, prizeCar, field, wear, rounds, intro }`. A round is `{ track, laps, hour, rain, hourEnd }`. `grid` lists the field by hand when `pool` and `pace` aren't enough; `rivals` does the same for a rally. The AI pits only in races of ten laps or more. `node tools/tests/play.mjs` plays the career through; `PLAY_VERBOSE=1` prints each result.

## A part
`data/parts.js`: `{ cat, group, name, price, line }`. `group` makes parts exclusive. Its numbers live in `sim/tuning.js`, `tunedRow`. A setting goes in `SETUP_SLIDERS` with the parts that open it.

## A song
`data/songs.js`: `{ bpm, tracks, patterns, order }` with `square`, `triangle`, `saw`, `sine` and `noise` only. Every track in a pattern needs the same step count. Play it with `app.mix.music('id')`.

## A line of writing
`data/text.js`. Sincere, exact, formally polite, funny only by being deadpan. Uppercase: the HUD font has no other case. Nobody calls the player a champion.
