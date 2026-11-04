I've written `PLAN.md` in this folder (about 2,100 lines). Before writing it I read the engine's handoff docs and kits and the AI Hub protocol and test harness, then reviewed the finished plan end to end and fixed the problems I found. No game code was written or run; only the plan exists.

**Title: Batzooka Baseball.** I brainstormed 50 riffs on "baseball" without showing them, and Python's `secrets` module drew #37. The name became the core mechanic: the Batzooka, a rocket-powered bat that the crowd's roar charges.

**Game.** Over-the-top arcade baseball with real innings, counts and outs. Fireball and vanishing pitches you can steer in flight, wall-climbing catches, slides that bowl over the catcher, and "Rhubarb" bench-clearing brawls as a 12-second mini-game. The story is a road tour to save a cornfield ballpark from a mega-corporation, ending against a robot boss pitcher.

**Cameras.** A Mode 7 view from behind the catcher for every pitch and swing, so the ball grows as it comes in. A three-quarter view of the park takes over for fielding and running, plus a chase camera for home runs and replays.

**What the plan covers:**
- **Architecture:** source files concatenated into one script, a single game state, an event bus, data registries for content, seeded randomness, one table of tunable numbers, and the small engine changes needed (a bat, gloves, new hats, PlayStation symbols in the font).
- **Systems:** formulas and starting numbers for pitching, the contact model, ball physics, fielding AI, baserunning, the Batzooka meter and super moves, the brawl, park hazards, four difficulty levels, cameras, the HUD and button prompts, and the controls on each device.
- **Content:** 6 teams with full rosters, 6 parks each with a hazard, the story scenes with dialogue, 8 tutorial lessons, upgrades, commentary lines in radio play-by-play style, the music list, and baseball motion clips from the engine repo's motion-capture library (real pitch, swing, bunt and slide takes).
- **Every TASK.md requirement**, mapped to a section:
  - controller-first 10-foot UI, with PlayStation symbols by default and an Xbox option;
  - a keyboard that feels native: Space swings, number keys pick pitches and bases, the mouse aims and clicks bases;
  - local play for 1–4, and an AI Hub "ghost" home-run derby online;
  - the attract mode after 10 seconds idle, and a dev mode with live sliders and reset;
  - the touch-only screen, the About/Credits screen, and exit-interview.json.

**Build order.** Nine milestones, with the riskiest parts first: the behind-the-plate view and batting feel, then the derby and AI Hub check, before fielding and content. A table of 13 risks gives a fallback for each.

**Testing.** One command prints only failures and a count, with a test list for every system, balance simulations, and a scripted bot playthrough of the whole game. Browser screenshots are kept for what a script can't judge, and the real AI Hub harness is run under its lossy-network and host-leave settings.

Two decisions to know about:
- **The online mode is a ghost-mode derby, not head-to-head baseball.** The hub tests games at 150 ms latency, which batting timing won't survive; head-to-head play stays local.
- **The machine's `/tmp` was full during planning.** The plan tells builders to point Playwright's temp folder into the dev folder. I deleted the 5.4 GB of repo clones I'd made for research, which were inside my own run folder.