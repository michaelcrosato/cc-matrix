I've written `PLAN.md`, and §18 maps every requirement in `TASK.md` to the section that covers it. I also saved `planner-exit-interview.json`, which parses as JSON and answers the four questions. The game title and `TASK.md`'s file and folder names are left to the builders, and all paths are relative to the dev folder.

**The game:** a calm career racing sim in the engine's pixel style, inspired by the source but not a recreation. Everything in it is new and fictional:
- **Cars:** 14 cars from made-up makers, covering front-, rear-, mid- and rear-engined layouts plus 4WD.
- **Tracks:** 6 new circuits.
- **Career:** 12 licence tests and 8 events, including a dirt rally and a night endurance race with an animated pit crew.
- **Extras:** TV-style replays, plus the writing style, music and voices specified for builders.

**The plan also covers:**
- the 10-foot, controller-first UI
- attract mode and dev mode with live sliders
- the About screen
- a one-command test suite with a scripted run through the whole game
- a build order

**What I tested, instead of assuming:**
- **Single file:** the bundled HTML runs from `file://`.
- **AI Hub:** ghost mode passes the harness with 2 players, 4 players on a poor connection, and the host leaving.
- **Split screen:** two engines side by side work, so there's also a same-screen mode.
- **Car physics:** the engine's built-in `Vehicle` is too simple for tuning to matter, so the plan includes its own car model. In scripted tests every car lapped every track, and an 8-car race finished.
- **The plan's own code:** I extracted the code blocks from `PLAN.md`, built a small game from them, and it ran and passed the same checks.

**What's still unproven (the plan says so too):**
- No person has driven these cars, and no real controller or TV was available, so handling needs tuning by feel.
- Medal times, prize money and AI pace are first estimates.
- Menus, the engine sound, voices, music, pit stops and the replay camera are designed but not prototyped.

**Two judgment calls to check:**
- **Multiplayer:** "as well as for the game on its own" could mean two things, so the plan covers both: the game runs fully outside the hub, and it has a split-screen mode.
- **Length:** the plan is about 124 KB because it includes the tested code and data. Builders pay to read all of that, but they don't have to re-solve the riskiest parts.

I deleted my scratch folder, so the working folder now holds only `STAGE.md`, `TASK.md`, `PLAN.md` and `planner-exit-interview.json`. I didn't commit anything.