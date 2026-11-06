# Building the game out by data

Everything here is plain text and needs no code change.

- **A new line:** add it to any list in `lines.js`. Tone rules are at the top of that file. Keep a box to 2 lines of about 60 characters. All the game's words live there: `cards` holds what each Card says, one sentence, by activity id or tier name, and `unlocks` what Tare says when Gerald opens something. A new row can also carry its own `say`.
- **A new tier:** add an object to the activity's `tiers` in `activities.js`. Its numbers are read by the activity's family: `set` is the Lean (k, c, s, A, nf, R, pushV, pushEvery), and `say` replaces the Card's sentence.
- **A new activity from an existing family:** add a row to `activities.js` with `family`, `discipline`, `name`, `room`, `music`, `stars`, `controls`, `say`, `tiers`. Then open it on a day in `days.js` and place its mat in `island.js`.
- **A new pose:** add a row to `poses.js`: a clip, a window in seconds and a facing. Dev Mode's Pose Viewer prints rows.
- **A new step chart:** add it to `charts.js`: four lane strings of 16 steps in `parts`, and an `order`. A tier's `chart` names it.
- **A new slalom course, road or line:** `courses.js`. Gates are x offsets, obstacles are `[x, gate number, kind]`.
- **A new tray:** add rows to `trays.js`: o olive, G glass, B bumper, # block, ~ gap, K gecko. 12 columns.
- **A new day:** add a row to `days.js`: `opens` lists activities; `hold`, `catchUp`, `games`, `scene` are the day's beats.
- **A new unlock:** add a row to `unlocks.js`. Items with `wear` appear on the Bungalow rail.
- **The island:** `island.js` is 44 x 26 characters. Move a letter and the thing moves.
