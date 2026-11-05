# Cricket Kerfuffle: design notes (how to add things)

Everything content-like is data keyed by id; systems look it up and never need editing to add content.
Build with `node tools/build.mjs`; test with `node test/run.mjs` (or name suites: `node test/run.mjs sim-arcade`).

## Add a team
`src/10-data-teams.js`, `TEAM_DEFS`: `{ id, code, name, nick, ground, chip, kit: { cloth, pants, trim, cap, boot, belt, glove },
pool: [surnames], stars: [ ...hand-made players ] }`. A star: `{ id, name, short, role: 'bat'|'bowl'|'all'|'keep', bat, power,
tech (1-10), style: 'slogger'|'accumulator'|'blocker', hand: 1|-1, bowl: { type: 'pace'|'swing'|'medium'|'spin'|'machine',
skill, d: [3 delivery ids] } | null, specBat, specBowl, specField (SPECIALS ids), field: [speed, catch, ground, throw],
voice (Hz), look: { build, size, hair, hairC, skin, moustache, beard, glasses, cap, cape } }`. The rest of the eleven is
generated from `pool` with a seeded stream, so the squad is the same every time. Quick Match lists the team once unlocked
(`Profile.unlock(id)`), or at once in Versus.

## Add a ground
`src/11-data-grounds.js`, `GROUNDS`: the boundary ellipse `rx`, `ry`; `pitch: { bounce, turn, seam, pace, rough }`; the
outfield's rolling decay `k`; `time`, `weather`; `pal` (grass stripes, pitch, sky, accents, rope; `diagonal`, `sand`);
`stands: 'village'|'terrace'|'beach'|'bleachers'|'dome'`; `props: [[shapeId, x, y, facing]]`; `targets: [{ id, label, at:
[x, y, z], size: [w, d, h], bonus, line, fx, shape, face, moving }]` (beyond the rope; a lofted hit through one scores
its bonus); `chaos: [CHAOS ids]`; `music` (a `SONGS` id); `umpire` (`UMPIRES` id). Add it to `GROUND_IDS`. The TileMap,
crowd and far-end panorama are built from the recipe (`src/30-ground.js`). New objects go in `src/07-assets-kerfuffle.js`
(the store's set format; check one with `node engine/tools/asset-sheet.mjs src/07-assets-kerfuffle.js#id`).

## Add a delivery
`src/12-data-deliveries.js`, `DELIVERIES`: `{ name, fam, kmh: [lo, hi], swing, seam, turn, bounce, len: [lo, hi], wobble,
randTurn, hideSpeed, fx }` (swing and turn positive = away from a right-hander). A bowler lists three in `bowl.d`.
Field presets are `FIELDS` (`[position, theta, distance | 'b']`, the batter's frame).

## Add a shot
`src/13-data-shots.js`, `SHOTS`: `{ name, btn: 'shot'|'loft'|'block', len: [lengths], sec: [lo, hi] (stick sector, degrees,
+ off side), at (press-to-contact seconds), launch, speed, line: [lo, hi], z: [lo, hi] (the contact zone), nat (natural
direction), fam (the stroke animation: drive, flick, loft, pull, cut, scoop, block) }` and its place in `SHOT_ORDER`.

## Add a special, item or chaos event
`SPECIALS` (`src/14-data-specials.js`; a bowling special's `delivery: { base, kmh, swing, target, bounces, wobble }`; a
batting special is played in `armBatSpecial` / `applyContact`), `ITEMS` and `CHAOS` (`src/15-data-arcade.js`; behaviour in
`src/28-arcade.js`: `giveItem`, `startChaos`, `stepChaos`, `chaosBall`; each event must end by itself).

## Add a story chapter, scene or line
`src/16-data-story.js`: `SCENES` (`{ place, cast, lines: [[speaker, text with {w=.4} {shake} markup]] }`), `CHAPTERS`
(`{ n, title, opp, ground, overs, wickets, kerfuffle, scenario: { innings: 1, battingFirst, firstRuns } | null, pre, mid,
win, lessons: [LESSONS], goals: [[label, (match, result) => bool]] }`), `LESSONS`. Commentary lines are
`src/17-data-lines.js` `LINES[tag] = [[who 'A'|'D'|'P', text]]` (keep each under 2 x 42 characters after filling; the
unit-ui suite checks), match reports `REPORTS`, loading lines `LOADING`.

## Add a song or sting
`src/18-data-music.js`: the engine's step notation; name the tracks `base`, `drums` (in above 50 Hype) and `fire` (in when
ON FIRE) to get the dynamic layers. Dev mode's JUMP tab has a jukebox.

## Tune
Every live gameplay number is in `src/02-tuning.js` (`TUNING_DEFS`: key, label, default, min, max, step) and on dev mode's
TUNING tab; difficulty multipliers are `DIFF`. `node test/balance.mjs` reports run rate, wickets and boundary share.
