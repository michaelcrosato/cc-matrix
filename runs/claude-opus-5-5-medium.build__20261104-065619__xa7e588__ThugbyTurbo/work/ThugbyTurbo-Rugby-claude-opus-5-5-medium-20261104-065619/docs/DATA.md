# Thugby Turbo data formats (for designers)

All content lives in `src/01-data.js`; balance numbers in `src/00-core.js` (`TUNE_DEFS`).

- **Teams** `TT.TEAMS[]`: `{ id, name, short, home/away kits { cloth, trim, pants, boot }, crest [kind, c1, c2],
  style { aggression, pass, kick, cheap, supers }, diff (-1..1 shift of the CPU difficulty), players[7] }`.
  Player: `P_(name, nickname, build, size, hair, hairColor, skin, hat, [SPD, POW, HND, KCK, TKL], extra)`; roster
  order is PROP, HOOKER, PROP, SCRUM-HALF, FLY-HALF, CENTRE, WING. `extra.boss` makes a player need a gang tackle.
- **Venues** `TT.VENUES[]`: `{ id, name, time day|dusk|night, weather rain|wind|clear|storm, hazard mud|chicken|flames|lightning, music (a TT.SONGS id), grass [r,g,b], stand face, standSide, standTop, sky, skyline hills|docks|chimneys|city, boards[] }`.
- **Power-ups** `TT.POWERUPS`: `{ name, time (s), line (commentary) }`; effects in `src/13-arcade.js`.
- **Commentary** `TT.LINES[category] = [['b' | 'r', text]]` (Barry / Ros); `{$player} {$team} {$score} {$venue}`.
- **Story** `TT.STORY[id] = { set pub|pitch|tunnel|podium, title, lines [[speaker, text]], choices, half, won }`;
  speakers are cast ids (`TT.CAST`) or `team:index`. Dialog markup: `{shake}`, `{wave}`, `{w=.4}`.
- **Cup** `TT.CUP[] = { id, name, opp, venue }`.
- **Drills** `TT.DRILLS[] = { id, name, teach, prompt }`; setups, goals and SHOW ME scripts in `TT.drills` (`src/43-scene-match.js`).
- **Difficulty** `TT.DIFF.Rookie|Pro|Legend` (CPU numbers only).
- **TUNE** `[key, label, group, default, min, max, step]`: every one shows as a live slider in the dev panel.
