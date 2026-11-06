# Designer data

Edit these files to change what the retreat contains. You do not need to change the activity code.

- `lines.js` — every spoken line. Keep a line to one thought, about 60 characters, two lines at most. `G.LINES.count()` should stay above 150.
- `content.js` — activities, star gates, pose windows, step charts, gate courses, tray layouts, the five-day guide, unlocks, nicknames, and avatar pills.

An activity row needs `id`, `name`, `family`, `discipline`, `view`, `dur` (seconds per tier), and `stars` (three thresholds). Families the code already runs: `hold`, `sun`, `candle`, `rep`, `step`, `hoop`, `jog`, `slalom`, `tray`, `laundry`.

Tier 2 opens after 2 stars on tier 1, and for everyone from day 4. The guide lists the three sessions of each story day, in order. A new day is a new row in `G.GUIDE` plus a line in `G.LINES.days`.

Poses point at a clip name in the bundled set and a window in seconds. Charts use lane strings (`x` is a step) and an `order` of part names. Courses are gate offsets. Trays are lists of olives and glasses in tray units.

Unlocks are minutes thresholds. Minutes are never spent. Do not add a real weight, a body-size joke, or a name from the source machine.
