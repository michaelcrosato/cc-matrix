# Building the game out by data

Everything a designer changes lives in this folder. No code change is needed for any of these:

- **A line:** `lines.js`. Add to a bank and the game will use it. Keep to two rows of about 60 characters.
- **A pose:** `poses.js`. A clip and a window of it. Dev Mode's Pose Viewer prints a row to paste here.
- **A tier or an activity's numbers:** `activities.js`. Each activity has a list of tiers.
- **A Step chart:** `charts.js`. One string a lane, parts in an order.
- **A gate course or jog road:** `courses.js`. Gate offsets, spacing, par and worst times.
- **A tea tray:** `trays.js`. Text rows: `#` wall, `o` olive, `U` glass, `B` bumper, `G` gecko.
- **A day:** `days.js`. Its name, what it unlocks, its beat.
- **An unlock, look or Regular:** `unlocks.js`.

`node tests/run.mjs rules` lints this folder: every name it refers to must exist.
