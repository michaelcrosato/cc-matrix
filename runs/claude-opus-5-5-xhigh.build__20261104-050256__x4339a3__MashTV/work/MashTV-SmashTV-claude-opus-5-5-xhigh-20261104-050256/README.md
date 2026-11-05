# MASH TV (dev folder)

A 1-4 player twin-stick arena shooter set inside the deadliest game show on television, on the my-3D2dge engine.
The deliverable is `../MashTV-SmashTV-claude-opus-5-5-xhigh-20261104-050256.html` (one file, opens from `file://`).

## Commands

- `npm run build`: concatenates `src/*.js` into `build/game.js`, writes the single-file deliverable and `../exit-interview.json`
  (from `src/about.json`), and `build/dev.html` (separate scripts, for iteration).
- `npm test` (`node tools/test.mjs [--only a,b] [--no-browser]`): rebuilds, runs every suite in `tests/`, prints only
  failures and one summary line.
- `node tools/balance.mjs [rooms] [players] [diff]`: a human-like bot plays rooms; clear times, deaths, Prime Time.
- `node tools/shot.mjs <hash> ...`: screenshots of deep links into `shots/`. `node tools/audiocheck.mjs`: every sound
  and voice played in Chromium. `node tools/pad-e2e.mjs`: a stubbed DualSense plays menus, play and attract in Chromium. `node tools/patch-engine.mjs`: re-applies the engine patches (`engine/PATCHES.md`).

## Deep links (append to the HTML's URL)

`#title #lobby #howto #scores #about #attract #episodes`, `#room=2-3`, `#boss=1|2|3`, `#greenroom`, `#lightning`,
`#recap=2`, `#continue`, `#gameover`, `#initials`, `#ending=a|b`, `#credits`, `#coldopen`, `#episode=2`, `#dev`, `#card`;
options `&players=N&bot=1&god=1&seed=N`.

## Adding content (data, not code)

- A room: one entry in `MT.ROOMS` (`src/20-content-episodes.js`): waves `{ at, left, spawn: [[door, kind, n, gap]], items }`,
  `place`, `items`, `key`, `hazards`, `exits`. Dev mode's WARP and the room-sweep test pick it up.
- An episode: one entry in `MT.EPISODES` plus its rooms. An enemy: one entry in `MT.ENEMIES` (`src/13-enemies.js`).
  A weapon: one entry in `MT.WEAPONS`. A line, prize or sponsor: `MT.TEXT` (`src/21-content-script.js`).
- Balance: dev mode's TUNING sliders, then EXPORT TUNING, pasted into `MT.TDEF` (`src/00-core.js`).
