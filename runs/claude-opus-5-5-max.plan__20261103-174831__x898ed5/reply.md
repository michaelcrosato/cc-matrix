I've written `PLAN.md` (about 2,500 lines) in the work folder. It opens with the title, which came from 50 brainstormed riffs and Python's `secrets.randbelow(50)`, which gave index 33: **American Football Fiasco**.

- **The game:** 7-on-7 arcade American football.
  - **Story:** the Tumbleweed Junction Fiascos have lost 99 games in a row. Their owner bets their home field on the Fiasco Cup against a tycoon who wants to pave it.
  - **Rules:** 4 downs to gain 20 yards, turbo for everyone, late hits allowed, laterals any time.
  - **Over-the-top layer:** Big and Mega Hits with slow motion, flaming Hot Streaks, mascots running onto the field, instant replays and two hype announcers.
  - **Items:** a Fiasco Meter fills when things go wrong for a team and deals one of 8 Fiasco Cards.
- **Perspective:** a sideline broadcast camera, a kick camera behind the kicker for field goals, and replay angles.
- **Architecture:** the simulation is kept separate from the drawing. Humans, the AI, network clients and test bots all control players through the same input format. Teams, plays, stadiums and story are plain data. One "scenario" setup serves the story chapters, the drills, the attract mode, the Dev mode and the tests. The plan names nine small engine changes, including the PlayStation glyphs missing from the pixel font.
- **Content:**
  - 6 teams with full rosters and 6 bosses with special moves.
  - 5 stadiums with their own weather and lighting.
  - About 21 offensive and 9 defensive plays, with route coordinates.
  - A prologue and 5 story chapters with every cutscene line written, plus 9 tutorial drills.
  - A 16-segment attract loop, and commentary samples for every event.
- **Multiplayer:** 1–4 players on one machine, or 1–4 in AI Hub sessions in shared-world mode. Each player's own movement is predicted locally, and the plan sets a message budget under the hub's rate limit.
- **Build order:** 10 milestones, each with an exit check. Football rules and the AI come first, then a networking test before any content.
- **Biggest risks:** the football AI (checked with a "Play Lab" that runs plays in bulk) and the networking (tested against a simulated network and the hub's own test harness). Each risk has a fallback.
- **Testing:** one command, `npm test`, prints only failures and a count. It includes a scripted run through the whole story to the credits.

I checked every engine and hub name in the plan against the real files. I also ran the commands for cutting the animation clips and the store props, and confirmed the clips move the engine's characters when run headless.

Something outside this session reworded `PLAN.md` on disk between my edits. It changed the prose, not the content: I checked that the code blocks, numbers and names came through intact.

I didn't write `exit-interview.json`, since it belongs beside the finished game. I deleted my downloaded copies of the engine and hub, so the folder now holds only `STAGE.md`, `TASK.md` and `PLAN.md`.