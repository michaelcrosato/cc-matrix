# PROGRESS (We Fib, built from PLAN.md)

Done. Title **We Fib**, picked with secrets.choice from 50.

- Game: `WeFib-WiiFit-claude-opus-5-5-xhigh-20261105-044442.html` (one file, 3.9 MB, opens from file://, no external requests)
- Exit interview: `exit-interview.json`
- Dev folder: `WeFib-WiiFit-claude-opus-5-5-xhigh-20261105-044442/` (`node tools/build.mjs`, `node tools/test.mjs [unit flow events balance input audio hub ui full]`, `node tools/shots.mjs`)
- Issue log: `notes/issues.md` in the dev folder (78 issues)

A line-by-line audit against PLAN.md found unbuilt details and missing tests late on; all were built and tested (issues 40-46).
"Target crashed" in long test runs came from sound nodes piling up because the sim runs about 170x real time (issue 47), on a machine already short of memory. Not a leak in play. Tests are now silent except the audio group, and the runner waits for free memory before each group.
Not checked, because it isn't possible here: real controller, real TV, human ears, a human player.

## Last pass
Checking the plan line by line showed the slider test could never fail, and re-measuring Springboard showed a clamp the earlier audit had missed. So the figures the plan measured were played against the build: issues 50-78 in the log. `tools/test-sliders.mjs` runs in the flow group. `tools/test-plan.mjs` is the plan group, gameplay, art recipes and audio, and `tools/test-rules.mjs` runs inside it, testing the plan's rules of play event by event. `tools/test-fits.mjs` also plays the plan's skill scores with test bots fitted event by event (`tools/fit-bots.mjs`, `tools/plan-fits.json`), which the game never reads. `notes/plan-figures.txt` holds the last run's numbers. Where a tolerance is wide, a comment there says why.
