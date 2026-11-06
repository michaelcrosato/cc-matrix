# Designer data

Edit these files to add content with no code change:

- `lines.js` — every spoken line, nickname and question. Add strings to any list.
- `charts.js` — Step Class charts (`x` = note, `.` = rest, 16 steps per part) and slalom gate courses.
- `trays.js` — tray olive/glass/bumper layouts, the five days, minute unlocks, Sun Flow poses.
- Activity numbers (lean params, durations, star thresholds) live in each registry entry in `game/activities/`.
  Add a tier by adding an object to that activity's `tiers` array.
- New activity: add a `G.activity({...})` entry in `game/activities/` and list its id in `G.DAYS` unlocks.
