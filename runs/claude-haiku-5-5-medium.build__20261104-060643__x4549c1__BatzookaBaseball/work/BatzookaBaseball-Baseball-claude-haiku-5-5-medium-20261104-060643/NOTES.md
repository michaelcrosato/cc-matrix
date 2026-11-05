# Batzooka Baseball: notes

The game is built from `src/*.js` (in name order) on the my-3D2dge engine (`engine/`, see `ENGINE-CHANGES.md`).

## Commands

- `node tools/build.mjs --dev`: `build/game.js` only; open `index.html` to play it.
- `node tools/build.mjs`: also writes the single-file game one folder up (`../BatzookaBaseball-Baseball-claude-haiku-5-5-medium-20261104-060643.html`).
- `node tests/run.mjs`: every headless check, one command. It prints the failures and a count.
- `node tests/shots.mjs [dir]`: Plate Cam, field and derby screenshots in Chromium (the states a script can't judge).
- `node tests/hub-harness.mjs [players] ["query"]`: the AI Hub's own check on the bundle (`hub/` holds its files).

## What is in the game

- Exhibition: 1 to 9 innings (1, 3, 5, 7 or 9), two parks (Kernel Field, the Megamax Dome at night), one or two players.
- The duel: the Plate Cam, a perspective from behind the plate. Pitch chips and a release meter; a swing with timing and place.
- The field: a three-quarter TileMap view with fielders, catches, pick-ups, a throw to a base, and forces.
- Batzooka and Fireball: the meters fill on hits and strikeouts; the super swing and the super pitch.
- Home Run Derby: 1 to 4 players in turns, or the AI Hub round (ghost mode).
- Spring Training: four drills (pitching, hitting, fielding, the Batzooka), each a one-inning match with a goal.
- Attract mode after ten seconds at the title; any press returns.
- Dev mode from the pause menu: live sliders for every balance value, a reset, a Batzooka cheat and warps.
- Controls: PlayStation symbols by default, Xbox in Settings; the mouse aims, clicks and picks; touch-only devices get the card.
- Playbook (help) and About (Source Information, the feedback, credits).

## What was cut from PLAN.md

- The Tour (the story, the map, the clubhouse, the upgrades) and its boss.
- Four of the six parks, the Rhubarb brawl, the turbo and the dives, the wall climb.
- Mocap clips (the rigs use the engine's poses only), Mode 7 (the Plate Cam is drawn by hand), the replay camera.
- Stealing, tagging up, double plays, pickoffs and bunts.
- The rhubarb, the crowd's waves and the between-innings shows; the crowd is a few drawn stands and a cheer.

## Balance

The defaults are a first tuning, from CPU-versus-CPU games: most finish in three innings, about four runs a game in total,
about half the balls in play are caught, and home runs come from the Batzooka or a strong swing. Dev mode is where to tune.
