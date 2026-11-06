# Adding content to Grandpa Turismo

All content is data in `src/game/data/`. `node tools/test.mjs data` checks that every id resolves, restrictions can be met, tests have medals and text fits the screen. Models are checked with `cd src && node check.mjs --sheets game/models/cars.js` (or `props.js`): look at the PNGs.

## A car
1. `data/carphysics.js`: a physics row (layout, massKg, powerPS, rpm, gears, final, tyreMu, ...).
2. `data/cars.js`: `row(id, name, marque, year, price, where, cylinders, exhaust, paint, brochure, shortName)`. `where` is `used`, a marque showroom, or `prize`.
3. `models/cars.js`: a spec in `specs` (side-profile `body`, `cabin`, `roof`, `tails`, `extra`). Look at the rear view first.

## A track
1. `data/tracks.js`: `{ name, surface, edge, runoff, hour, pit?, crests?, corners: [[x, z, radius, y, width, bankDeg], ...] }`.
2. `render/trackmesh.js`: a `LOOKS` entry (road, ground and horizon colours).
3. `render/dressing.js`: a function that places landmarks with `d.side(id, s, t)`, `d.scatter(...)`, `d.stand(...)`, then add it to the table in `dressTrack`.

## A licence test
`data/licences.js`: `t(id, title, carId, track, { from, to | box | flying, startSpeed, standing, limits, assists, brief, tip, lesson })`, and list it on a licence. Run `node tools/medals.mjs` to compute and freeze its medal times from the AI demonstration.

## An event
`data/events.js`: `{ id, name, needs, limit, limitText, rounds: [r(track, laps, { hour, rain })], pace: [lo, hi], pool: [[carId, install?]], prize, bonus, prizeCar?, intro }`. Run `VERBOSE=1 node tools/tests/play.mjs` to see what the event does to the money.

## A song
`data/songs.js`: a `Song` (`bpm`, `tracks`, `patterns`, `order`), four bars of sixteen per pattern, waves `square triangle saw sine noise`. Point a key of `SONG_FOR` at it.

## A person or a clip
`render/people.js`: an outfit in `OUTFITS`. `animation/clips.js`: a `ClipDef` on the engine's hero rig; `tools/test.mjs headless` compiles and analyses it.

## Building
`node tools/build.mjs` writes the single HTML one folder up. `node tools/test.mjs` runs every suite whose files changed and prints failures and a count.
