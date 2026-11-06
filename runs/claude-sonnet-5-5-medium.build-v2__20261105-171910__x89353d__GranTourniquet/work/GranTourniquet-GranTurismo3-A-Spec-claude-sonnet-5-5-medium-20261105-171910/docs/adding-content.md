# Adding content to GRAN TOURNIQUET

Everything a designer adds is data in `src/game/data/`. `node tools/test.mjs data` checks that ids resolve, text fits and every test has medals.

## A car
1. `data/cars_phys.js`: a row in `CARS` (layout, massKg, powerPS, rpmPeak, redline, upshift, wheelbase, frontWeight, gears, final, tyreMu, ...). Appendix B of the plan lists every field.
2. `data/cars.js`: a row in `CAR_INFO` (name, marque, year, price, where, cyl, exh, tail, body, paint, text). `body` is a key of `BODIES` in `models/cars.js`; add a new silhouette there as a `carDef({ body, cabin, roof, ... })` and check it with `node src/check.mjs --sheets` on a module that exports `BODIES`.
3. Put it in a showroom (`USED_LOT` or `DEALERS`), or hand it out as a prize (`prizeCar` on an event).
```js
mycar: { layout: 'FR', massKg: 1000, powerPS: 200, rpmPeak: 7000, redline: 7500, upshift: 7200, wheelbase: 2.5, frontWeight: 0.52, gears: [3.2, 2, 1.4, 1.05, 0.85], final: 4 }
```

## A track
Add a closed polygon to `data/tracks.js`: `[x, z, radius, y, width, bankDeg]` per corner. `s = 0` is the middle of the last edge. Optional: `pit: { in, box, out }`, `crests: [[s, halfLength, height]]`, `surface`, `edge`, `runoff`, `hour`. Add its theme to `THEMES` in `render/trackmesh.js` and a `case` in `render/dressing.js`.

## A licence test
Add an object to `TESTS` in `data/licences.js` (`id`, `lic`, `title`, `carId`, `track`, `start`, `a`, `b` or `box` or `lap`, `limits`, `brief`, `tip`, `demo`). Then run `node tools/medals.mjs`: it drives the AI demonstration, and freezes gold, silver and bronze into `data/medals.js`.

## An event
Add an object to `EVENTS` in `data/events.js`: `needs`, `restrict`, `rounds`, `pace`, `pool` (car id, optional `'tuned'` or `'tunedHi'`), `prize`, `bonus`, `prizeCar`.

## A song
Add a `compose({ bpm, chords, tracks, templates })` to `data/songs.js` and name it in `SONG_FOR` or call `App.music.play('name')`.

## A part
Add it to `PARTS` in `data/tyres_parts.js` and give it an effect in `sim/tuning.js` (`tunedRow`).
