# Designing with data

Everything a designer changes lives in this folder. No code edits are needed for the cases below.

- **A line of dialogue**: add a string to a bank in `lines.js` (for example `tare.star2`, `birch.praise`, `candle`). Banks are picked at random. `{n}` style tokens are filled by the caller.
- **A pose**: add a row to `poses.js`: `{ clip, a, b, tgt }` (a clip name from the clip set, a window in seconds, the way the body faces). The Pose Viewer (Dev Mode) prints a ready row. Sun Flow's order is `G.FLOW`.
- **A Lean set**: add a row to `G.SETS` in `activities.js` (`k c s A nf R`, an optional `push: [speed, everySeconds]`, and `sx`/`sy` to give one axis its own instability). Point an activity tier at it with `set`.
- **A Rail exercise**: add a row to `G.REPROWS` in `activities.js` (clip window or hand-posed body, reps per tier, tempo `[down, hold, up, rest]`). `activities/rep.js` registers it.
- **A Step Class chart**: edit `charts.js`. A part is one bar of four lane strings (`x` is a note, `.` is rest); `order` lists the bars. The song is named by `song` and lives in `audio.js`.
- **A slalom course, jog road or laundry line**: edit `courses.js` (gate offsets, road blocks, span lengths, pin positions, par times).
- **A tray**: add a layout to `trays.js` (`#` wall, `o` olive, `G` glass, `b` bumper, `k` gecko) and a time budget.
- **A day**: edit `days.js` (which activities each day opens, its name and goal). **An unlock**: add a row to `unlocks.js` (minutes needed).
- **An activity**: call `G.activity({...})` in a new file in `activities/` and add it to the file list in `build.mjs`. It becomes a scene, appears in Free Play and the attract playlist once it is listed in `scenes/attract.js` and, if it needs a mat, in `G.ISLAND.mats`.
