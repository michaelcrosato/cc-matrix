I wrote `PLAN.md` and `planner-exit-interview.json`, and section 20 of the plan maps each item in `TASK.md` to the section that covers it. The JSON parses and answers all four questions. The title and `TASK.md`'s file names are left out as `STAGE.md` asks, and nothing was committed.

**The game:** guests at a tidy island wellness retreat, run by a retired bathroom scale that refuses to weigh anyone and only measures how much you wobble. Every activity is played by keeping your centre of balance in place, including:
- poses and reps
- a step class
- a slackline and a paddleboard
- a tilting sand garden
- sitting still while the game tries to trick you into pressing buttons

Over five days the island turns out to be balanced on one rock. In the finale, your stick moves the whole island through a storm. Multiplayer is same-screen on its own and hub ghost mode in AI Hub, where you see other players wobbling on the next mats. It is an original game: the plan bans the source's characters, names, music and look, and any talk of weight.

**What testing changed:** I built throwaway prototypes on the real engine, and the plan marks what was run versus only read in the code. These findings will save builders the most:
- **False pass in the hub test:** the hub's `?aihub=` query stops the engine from starting, yet the hub's test harness still reports PASS. The plan gives the fix and an extra check.
- **Balance tuning:** in a simulation of my first tuning, doing nothing beat a player with human reaction times. The slower sway in the plan fixes that, and bots with delayed reactions now stand in for playtesters.
- **Verified recipes:** the single-file build, hub startup (passed at 2, 3 with the host leaving, and 4 players), continuous lean on any pose, the bright visual look, and gibberish voice syllables all ran here.
- **Browser setup:** the engine's browser tools crash and then hang until `CHROMIUM_PATH` points at the headless browser already on this machine.

**Not proven:**
- No game was built, so the activities and the finale are untested design.
- Balance numbers come from a simulation, not anyone playing, and how the voices sound is unjudged.
- The plan is large, about 45 minutes of play. It has a cut order in case a builder runs out of budget, because `TASK.md` doesn't say how big a build to expect.

**Cleanup and slips:**
- I deleted the 6 GB scratch folder and my temp files.
- One folder, `/tmp/org.chromium.Chromium.PVTNSV`, may be from my test runs. I left it because other agents share `/tmp` and I can't confirm it's mine.
- A stray `git checkout` of mine ran against the enclosing repo but matched no paths, so it changed nothing.
- Another typo hung one check until I stopped it and removed the empty temp file it left.